import "server-only";
import { createHash } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

type IdempotencyScope =
  | "seller.email.send_otp"
  | "seller.email.verify_otp"
  | "seller.estimate_and_create";

type IdempotencyResult =
  | { kind: "new" }
  | { kind: "in_progress" }
  | { kind: "replay"; statusCode: number; payload: Record<string, unknown> };

const TTL_HOURS = 24;

const hashKey = (scope: IdempotencyScope, key: string) => {
  return createHash("sha256").update(`${scope}:${key}`).digest("hex");
};

const expiresAtIso = () => {
  return new Date(Date.now() + TTL_HOURS * 60 * 60 * 1000).toISOString();
};

export const checkIdempotency = async (
  scope: IdempotencyScope,
  rawKey: string
): Promise<IdempotencyResult> => {
  const key = rawKey.trim();
  if (!key) return { kind: "new" };

  const keyHash = hashKey(scope, key);

  const { data: existing, error: readError } = await supabaseAdmin
    .from("api_idempotency_keys")
    .select("id, status_code, response_payload")
    .eq("scope", scope)
    .eq("key_hash", keyHash)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (readError) {
    throw new Error(readError.message);
  }

  if (existing) {
    if (
      typeof existing.status_code === "number" &&
      existing.response_payload &&
      typeof existing.response_payload === "object"
    ) {
      return {
        kind: "replay",
        statusCode: existing.status_code,
        payload: existing.response_payload as Record<string, unknown>,
      };
    }
    return { kind: "in_progress" };
  }

  const { error: insertError } = await supabaseAdmin.from("api_idempotency_keys").insert({
    scope,
    key_hash: keyHash,
    expires_at: expiresAtIso(),
  });

  if (insertError) {
    // Race condition safety: another request inserted same key.
    if (insertError.code === "23505") {
      return { kind: "in_progress" };
    }
    throw new Error(insertError.message);
  }

  return { kind: "new" };
};

export const persistIdempotencyResponse = async (
  scope: IdempotencyScope,
  rawKey: string,
  statusCode: number,
  payload: Record<string, unknown>
) => {
  const key = rawKey.trim();
  if (!key) return;

  const keyHash = hashKey(scope, key);

  const { error } = await supabaseAdmin
    .from("api_idempotency_keys")
    .update({
      status_code: statusCode,
      response_payload: payload,
    })
    .eq("scope", scope)
    .eq("key_hash", keyHash);

  if (error) {
    throw new Error(error.message);
  }
};
