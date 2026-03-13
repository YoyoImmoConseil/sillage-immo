import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { hashValue } from "@/lib/audit/hash";
import { serverEnv } from "@/lib/env/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { SweepBrightWebhookPayload } from "@/types/api/sweepbright";
import type { Database } from "@/types/db/supabase";

type WebhookDeliveryRow = Database["public"]["Tables"]["crm_webhook_deliveries"]["Row"];

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

export const registerSweepBrightWebhookDelivery = async (input: {
  payload: SweepBrightWebhookPayload;
  rawBody: string;
  signature: string | null;
}) => {
  const eventKey = buildSweepBrightWebhookEventKey({
    rawBody: input.rawBody,
    payload: input.payload,
  });

  const { data: existing, error: readError } = await supabaseAdmin
    .from("crm_webhook_deliveries")
    .select("*")
    .eq("provider", "sweepbright")
    .eq("event_key", eventKey)
    .maybeSingle();

  if (readError) {
    throw new Error(readError.message);
  }

  if (existing) {
    return { duplicate: true as const, delivery: existing as WebhookDeliveryRow };
  }

  const { data, error } = await supabaseAdmin
    .from("crm_webhook_deliveries")
    .insert({
      provider: "sweepbright",
      event_name: input.payload.event,
      event_key: eventKey,
      estate_id: input.payload.estate_id,
      company_id: input.payload.company_id,
      payload: input.payload as unknown as Record<string, unknown>,
      signature: input.signature,
      status: "received",
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to register SweepBright webhook delivery.");
  }

  return { duplicate: false as const, delivery: data as WebhookDeliveryRow };
};
