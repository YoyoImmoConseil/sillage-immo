import { after, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { serverEnv } from "@/lib/env/server";
import { parseSweepBrightZapierDate } from "@/lib/sweepbright/zapier-date";
import { zapierVisitPayloadSchema } from "@/lib/sweepbright/zapier-payload-schema";
import {
  findPropertyBySweepBrightId,
  recordVisitEventsForProjects,
  upsertVisitFromZapierPayload,
} from "@/services/properties/property-visit.service";
import type { SweepBrightZapierVisitPayload } from "@/types/api/sweepbright";

export const runtime = "nodejs";

const LOG_PREFIX = "[zapier-visit]";

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

const generateRunId = () =>
  `zapier-visit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const POST = async (request: Request) => {
  const runId = generateRunId();
  const rawBody = await request.text();

  if (!verifyZapierSecret(request.headers.get("x-zapier-secret"))) {
    console.warn(`${LOG_PREFIX} runId=${runId} rejected: invalid secret`);
    return NextResponse.json(
      { ok: false, message: "Unauthorized." },
      { status: 401 }
    );
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    console.warn(`${LOG_PREFIX} runId=${runId} rejected: invalid JSON body`);
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const validation = zapierVisitPayloadSchema.safeParse(parsedBody);
  if (!validation.success) {
    // [debug:zapier-raw-body] TEMPORARY (remove once root cause identified):
    // logs the exact raw body + content-type + content-length so we can see
    // what Zapier actually serialises in production vs our captured samples.
    console.warn(
      `${LOG_PREFIX} runId=${runId} rejected: payload schema mismatch`,
      JSON.stringify({
        contentType: request.headers.get("content-type"),
        contentLength: request.headers.get("content-length"),
        userAgent: request.headers.get("user-agent"),
        rawBodyLength: rawBody.length,
        rawBodyPreview: rawBody.slice(0, 4000),
        parsedKeys:
          typeof parsedBody === "object" && parsedBody !== null
            ? Object.keys(parsedBody as Record<string, unknown>)
            : null,
        flatten: validation.error.flatten(),
      })
    );
    return NextResponse.json(
      { ok: false, message: "Invalid Zapier visit payload." },
      { status: 400 }
    );
  }
  const payload = validation.data as SweepBrightZapierVisitPayload;

  const property = await findPropertyBySweepBrightId(payload.estate.id);
  if (!property) {
    console.info(
      `${LOG_PREFIX} runId=${runId} estateId=${payload.estate.id} property not found, ignoring`
    );
    return NextResponse.json(
      {
        ok: true,
        accepted: false,
        reason: "property_not_found",
      },
      { status: 202 }
    );
  }

  const normalizedPayload: SweepBrightZapierVisitPayload = {
    ...payload,
    occurred_at: validateOrPlaceholderOccurredAt(payload.occurred_at),
  };

  let upsertResult;
  try {
    upsertResult = await upsertVisitFromZapierPayload({
      payload: normalizedPayload,
      propertyId: property.id,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to upsert visit.";
    console.error(
      `${LOG_PREFIX} runId=${runId} externalVisitId=${normalizedPayload.external_visit_id} upsert failed: ${message}`
    );
    return NextResponse.json(
      { ok: false, message: "Unable to record visit." },
      { status: 500 }
    );
  }

  console.info(
    `${LOG_PREFIX} runId=${runId} ` +
      `externalVisitId=${normalizedPayload.external_visit_id} ` +
      `propertyId=${property.id} ` +
      `event=${normalizedPayload.event} ` +
      `status=${upsertResult.visit.status} ` +
      `created=${upsertResult.created}`
  );

  after(async () => {
    try {
      await recordVisitEventsForProjects({
        propertyId: property.id,
        payload: normalizedPayload,
        visit: upsertResult.visit,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "unknown error";
      console.error(
        `${LOG_PREFIX} runId=${runId} failed to record client_project_events: ${message}`
      );
    }
  });

  return NextResponse.json(
    {
      ok: true,
      accepted: true,
      data: {
        visitId: upsertResult.visit.id,
        propertyId: property.id,
        created: upsertResult.created,
      },
    },
    { status: 202 }
  );
};
