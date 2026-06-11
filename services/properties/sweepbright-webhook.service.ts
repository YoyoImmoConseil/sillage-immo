import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { hashValue } from "@/lib/audit/hash";
import { serverEnv } from "@/lib/env/server";
import type { SweepBrightWebhookPayload } from "@/types/api/sweepbright";

const isSweepBrightWebhookPayload = (value: unknown): value is SweepBrightWebhookPayload => {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return (
    (payload.event === "estate-added" ||
      payload.event === "estate-updated" ||
      payload.event === "estate-deleted") &&
    typeof payload.estate_id === "string" &&
    typeof payload.happened_at === "string" &&
    typeof payload.company_id === "string"
  );
};

const hexMatches = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
};

export const parseSweepBrightWebhookPayload = (rawBody: string) => {
  let payload: unknown = null;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    throw new Error("Invalid SweepBright webhook JSON body.");
  }

  if (!isSweepBrightWebhookPayload(payload)) {
    throw new Error("Invalid SweepBright webhook payload.");
  }

  return payload;
};

export const verifySweepBrightWebhookSignature = (input: {
  rawBody: string;
  signature: string | null;
}) => {
  if (!serverEnv.SWEEPBRIGHT_CLIENT_SECRET) {
    throw new Error("SWEEPBRIGHT_CLIENT_SECRET is not configured.");
  }

  if (!input.signature) {
    throw new Error("Missing SweepBright webhook signature.");
  }

  const expected = createHmac("sha1", serverEnv.SWEEPBRIGHT_CLIENT_SECRET)
    .update(input.rawBody)
    .digest("hex");

  if (!hexMatches(expected, input.signature)) {
    throw new Error("SweepBright webhook signature mismatch.");
  }
};

export const buildSweepBrightWebhookEventKey = (input: {
  rawBody: string;
  payload: SweepBrightWebhookPayload;
}) => {
  return hashValue(
    [
      "sweepbright",
      input.payload.event,
      input.payload.estate_id,
      input.payload.company_id,
      input.payload.happened_at,
      hashValue(input.rawBody),
    ].join(":")
  );
};

// L'enregistrement de la livraison (déduplication incluse) passe désormais
// par le rail d'ingestion commun : lib/ingestion/delivery-queue.ts.
