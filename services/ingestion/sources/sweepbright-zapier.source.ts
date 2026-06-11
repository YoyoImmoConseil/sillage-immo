import "server-only";
import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { hashValue } from "@/lib/audit/hash";
import { serverEnv } from "@/lib/env/server";
import type {
  SyncWebhookSource,
  WebhookProcessOutcome,
} from "@/lib/ingestion/webhook-handler";
import { parseSweepBrightZapierDate } from "@/lib/sweepbright/zapier-date";
import { zapierVisitPayloadSchema } from "@/lib/sweepbright/zapier-payload-schema";
import {
  findPropertyBySweepBrightId,
  recordVisitEventsForProjects,
  upsertVisitFromZapierPayload,
} from "@/services/properties/property-visit.service";
import type { SweepBrightZapierVisitPayload } from "@/types/api/sweepbright";

/**
 * Source SweepBright → Zapier (visites).
 *
 * Mode sync : la réponse au Zap doit refléter le résultat réel (visitId,
 * created) et surtout rester gracieuse — un Zap qui accumule des erreurs
 * s'auto-pause. D'où :
 *  - 202 `accepted:false reason:property_not_found` quand le bien n'est
 *    pas (encore) ingéré → livraison close en `ignored` ;
 *  - verdict "partial" quand l'upsert visite a réussi mais que l'émission
 *    des événements timeline a échoué : la réponse HTTP reste un succès,
 *    la livraison passe en `failed` et le cron rejoue (l'upsert est
 *    idempotent sur external_visit_id).
 */

const LOG_PREFIX = "[zapier-visit]";

const PROVIDER = "sweepbright-zapier";

const verifyZapierSecret = (provided: string | null): boolean => {
  const expected = serverEnv.SWEEPBRIGHT_ZAPIER_WEBHOOK_SECRET;
  if (!expected || !provided) return false;
  const expectedBuffer = Buffer.from(expected, "utf8");
  const providedBuffer = Buffer.from(provided, "utf8");
  if (expectedBuffer.length !== providedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, providedBuffer);
};

const isValidIsoDate = (value: string): boolean => {
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

const validateOrPlaceholderOccurredAt = (raw: string): string => {
  if (isValidIsoDate(raw)) return new Date(raw).toISOString();
  const parsed = parseSweepBrightZapierDate(raw);
  if (parsed) return parsed.toISOString();
  return new Date().toISOString();
};

const successData = (input: {
  visitId: string;
  propertyId: string;
  created: boolean;
}): Record<string, unknown> => ({
  visitId: input.visitId,
  propertyId: input.propertyId,
  created: input.created,
});

export const sweepBrightZapierWebhookSource: SyncWebhookSource = {
  provider: PROVIDER,
  mode: "sync",
  // Un replay (manuel) d'un payload classé `property_not_found` doit être
  // retraité : le bien a pu être ingéré entre-temps.
  reprocessIgnoredDuplicates: true,

  authenticate: (request) => {
    if (verifyZapierSecret(request.headers.get("x-zapier-secret"))) {
      return { ok: true };
    }
    console.warn(`${LOG_PREFIX} rejected: invalid secret`);
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, message: "Unauthorized." },
        { status: 401 }
      ),
    };
  },

  parse: (rawBody) => {
    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      console.warn(`${LOG_PREFIX} rejected: invalid JSON body`);
      return {
        ok: false,
        response: NextResponse.json(
          { ok: false, message: "Invalid JSON body." },
          { status: 400 }
        ),
      };
    }

    const validation = zapierVisitPayloadSchema.safeParse(parsedBody);
    if (!validation.success) {
      console.warn(
        `${LOG_PREFIX} rejected: payload schema mismatch`,
        validation.error.flatten()
      );
      return {
        ok: false,
        response: NextResponse.json(
          { ok: false, message: "Invalid Zapier visit payload." },
          { status: 400 }
        ),
      };
    }

    const payload = validation.data as SweepBrightZapierVisitPayload;
    const normalizedPayload: SweepBrightZapierVisitPayload = {
      ...payload,
      occurred_at: validateOrPlaceholderOccurredAt(payload.occurred_at),
    };

    // Clé d'idempotence calculée sur les valeurs brutes (avant la
    // normalisation d'occurred_at, qui peut produire un placeholder
    // non déterministe) : un replay Zapier du même body déduplique.
    const eventKey = hashValue(
      [
        PROVIDER,
        payload.event,
        payload.external_visit_id,
        payload.occurred_at,
        hashValue(rawBody),
      ].join(":")
    );

    return {
      ok: true,
      eventName: payload.event,
      eventKey,
      payload: normalizedPayload as unknown as Record<string, unknown>,
      estateId: payload.estate.id,
    };
  },

  process: async (delivery): Promise<WebhookProcessOutcome> => {
    const payload =
      delivery.payload as unknown as SweepBrightZapierVisitPayload;

    const property = await findPropertyBySweepBrightId(payload.estate.id);
    if (!property) {
      console.info(
        `${LOG_PREFIX} deliveryId=${delivery.id} estateId=${payload.estate.id} property not found, ignoring`
      );
      return {
        kind: "ignored",
        reason: "property_not_found",
        data: { reason: "property_not_found" },
      };
    }

    const upsertResult = await upsertVisitFromZapierPayload({
      payload,
      propertyId: property.id,
    });

    console.info(
      `${LOG_PREFIX} deliveryId=${delivery.id} ` +
        `externalVisitId=${payload.external_visit_id} ` +
        `propertyId=${property.id} ` +
        `event=${payload.event} ` +
        `status=${upsertResult.visit.status} ` +
        `created=${upsertResult.created}`
    );

    try {
      await recordVisitEventsForProjects({
        propertyId: property.id,
        payload,
        visit: upsertResult.visit,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      console.error(
        `${LOG_PREFIX} deliveryId=${delivery.id} failed to record client_project_events: ${message}`
      );
      // La visite est enregistrée : on répond succès au Zap, mais la
      // livraison repasse en `failed` pour que le cron rejoue l'émission.
      return {
        kind: "partial",
        data: successData({
          visitId: upsertResult.visit.id,
          propertyId: property.id,
          created: upsertResult.created,
        }),
        retryError: `client_project_events emission failed: ${message}`,
      };
    }

    return {
      kind: "processed",
      data: successData({
        visitId: upsertResult.visit.id,
        propertyId: property.id,
        created: upsertResult.created,
      }),
    };
  },

  respond: (outcome) => {
    if (outcome.kind === "ignored") {
      return NextResponse.json(
        { ok: true, accepted: false, reason: outcome.reason },
        { status: 202 }
      );
    }
    return NextResponse.json(
      { ok: true, accepted: true, data: outcome.data },
      { status: 202 }
    );
  },

  respondDuplicate: (delivery) => {
    if (delivery.response_payload && typeof delivery.response_payload === "object") {
      return NextResponse.json(delivery.response_payload, {
        status: delivery.response_status ?? 202,
      });
    }
    return NextResponse.json(
      { ok: true, accepted: true, duplicate: true },
      { status: 202 }
    );
  },

  respondError: (error) => {
    const message =
      error instanceof Error ? error.message : "Unable to upsert visit.";
    console.error(`${LOG_PREFIX} processing failed: ${message}`);
    return NextResponse.json(
      { ok: false, message: "Unable to record visit." },
      { status: 500 }
    );
  },
};
