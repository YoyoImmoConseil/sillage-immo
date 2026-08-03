import "server-only";
import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { hashValue } from "@/lib/audit/hash";
import { serverEnv } from "@/lib/env/server";
import type {
  SyncWebhookSource,
  WebhookProcessOutcome,
} from "@/lib/ingestion/webhook-handler";
import {
  resolveOfferOccurrence,
  zapierOfferPayloadSchema,
  type ZapierOfferPayload,
} from "@/lib/sweepbright/offer-payload-schema";
import { upsertOfferFromZapierPayload } from "@/services/properties/property-offer.service";
import { findPropertyBySweepBrightId } from "@/services/properties/property-visit.service";

/**
 * Source SweepBright → Zapier (offres), déclencheur `Offer Changed`.
 *
 * Mode sync, comme la source des visites : un Zap qui accumule des erreurs
 * s'auto-met en pause, donc la réponse reste gracieuse. Un bien pas encore
 * ingéré ferme la livraison en `ignored` avec un 202, et
 * `reprocessIgnoredDuplicates` permet à un replay manuel de la reprendre une
 * fois le bien arrivé.
 *
 * Le secret partagé est celui des Zaps de visites : même compte Zapier, même
 * frontière de confiance, donc pas de variable d'environnement supplémentaire.
 */

const LOG_PREFIX = "[zapier-offer]";
const PROVIDER = "sweepbright-offers";

const verifyZapierSecret = (provided: string | null): boolean => {
  const expected = serverEnv.SWEEPBRIGHT_ZAPIER_WEBHOOK_SECRET;
  if (!expected || !provided) return false;
  const expectedBuffer = Buffer.from(expected, "utf8");
  const providedBuffer = Buffer.from(provided, "utf8");
  if (expectedBuffer.length !== providedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, providedBuffer);
};

export const sweepBrightOffersWebhookSource: SyncWebhookSource = {
  provider: PROVIDER,
  mode: "sync",
  reprocessIgnoredDuplicates: true,

  authenticate: (request) => {
    if (verifyZapierSecret(request.headers.get("x-zapier-secret"))) {
      return { ok: true };
    }
    console.warn(`${LOG_PREFIX} rejected: invalid secret`);
    return {
      ok: false,
      response: NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 }),
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

    const validation = zapierOfferPayloadSchema.safeParse(parsedBody);
    if (!validation.success) {
      console.warn(
        `${LOG_PREFIX} rejected: payload schema mismatch`,
        validation.error.flatten()
      );
      return {
        ok: false,
        response: NextResponse.json(
          { ok: false, message: "Invalid Zapier offer payload." },
          { status: 400 }
        ),
      };
    }

    const payload = validation.data;
    const externalOfferId = payload.offer.id?.trim();
    if (!externalOfferId) {
      console.warn(`${LOG_PREFIX} rejected: missing offer id`);
      return {
        ok: false,
        response: NextResponse.json(
          { ok: false, message: "Missing offer id." },
          { status: 400 }
        ),
      };
    }

    // Idempotence calculée sur le corps brut : un replay Zapier du même body
    // déduplique, mais une évolution réelle de l'offre (acceptation) produit un
    // body différent et donc une nouvelle livraison.
    const eventKey = hashValue(
      [
        PROVIDER,
        payload.event,
        externalOfferId,
        payload.offer.status ?? "",
        payload.reason ?? "",
        hashValue(rawBody),
      ].join(":")
    );

    return {
      ok: true,
      eventName: payload.event,
      eventKey,
      payload: payload as unknown as Record<string, unknown>,
      estateId: payload.offer.property_id ?? null,
      companyId: payload.offer.company_id ?? null,
    };
  },

  process: async (delivery): Promise<WebhookProcessOutcome> => {
    const payload = delivery.payload as unknown as ZapierOfferPayload;
    const externalOfferId = payload.offer.id?.trim() ?? "";
    const sweepBrightPropertyId = payload.offer.property_id?.trim() ?? "";

    if (!sweepBrightPropertyId) {
      return {
        kind: "ignored",
        reason: "missing_property_id",
        data: { reason: "missing_property_id" },
      };
    }

    const property = await findPropertyBySweepBrightId(sweepBrightPropertyId);
    if (!property) {
      console.info(
        `${LOG_PREFIX} deliveryId=${delivery.id} estateId=${sweepBrightPropertyId} property not found, ignoring`
      );
      return {
        kind: "ignored",
        reason: "property_not_found",
        data: { reason: "property_not_found" },
      };
    }

    const occurrence = resolveOfferOccurrence(
      payload.offer,
      delivery.created_at ?? new Date().toISOString()
    );

    const result = await upsertOfferFromZapierPayload({
      payload,
      propertyId: property.id,
      externalOfferId,
      occurrence,
    });

    console.info(
      `${LOG_PREFIX} deliveryId=${delivery.id} ` +
        `offerId=${externalOfferId} ` +
        `propertyId=${property.id} ` +
        `status=${payload.offer.status ?? "-"} ` +
        `reason=${payload.reason ?? "-"} ` +
        `kind=${occurrence.kind} ` +
        `priceContext=${result.priceEventContext ?? "none"} ` +
        `created=${result.created}`
    );

    return {
      kind: "processed",
      data: {
        offerId: result.offer.id,
        propertyId: property.id,
        created: result.created,
        occurrenceKind: occurrence.kind,
        priceEventContext: result.priceEventContext,
        priceEventRecorded: result.priceEventRecorded,
      },
    };
  },

  respond: (outcome) => {
    if (outcome.kind === "ignored") {
      return NextResponse.json(
        { ok: true, accepted: false, reason: outcome.reason },
        { status: 202 }
      );
    }
    return NextResponse.json({ ok: true, accepted: true, data: outcome.data }, { status: 202 });
  },

  respondDuplicate: (delivery) => {
    if (delivery.response_payload && typeof delivery.response_payload === "object") {
      return NextResponse.json(delivery.response_payload, {
        status: delivery.response_status ?? 202,
      });
    }
    return NextResponse.json({ ok: true, accepted: true, duplicate: true }, { status: 202 });
  },

  respondError: (error) => {
    const message = error instanceof Error ? error.message : "Unable to record offer.";
    console.error(`${LOG_PREFIX} processing failed: ${message}`);
    return NextResponse.json({ ok: false, message: "Unable to record offer." }, { status: 500 });
  },
};
