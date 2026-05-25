import "server-only";
import { createHash } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Dedicated idempotency helper for the /api/mcp POST endpoint.
// Mirrors lib/idempotency/request-idempotency.ts (the seller-tunnel
// helper) but uses a distinct scope so the two namespaces never collide.
//
// Key shape:
//   sha256("mcp.tool_call:" + tool + ":" + clientKey)
// where clientKey is the raw `Idempotency-Key` header value.

const SCOPE = "mcp.tool_call";
const TTL_HOURS = 24;

export type McpIdempotencyResult =
  | { kind: "new" }
  | { kind: "in_progress" }
  | { kind: "replay"; statusCode: number; payload: Record<string, unknown> };

const hashKey = (tool: string, key: string) =>
  createHash("sha256").update(`${SCOPE}:${tool}:${key}`).digest("hex");

const expiresAtIso = () =>
  new Date(Date.now() + TTL_HOURS * 60 * 60 * 1000).toISOString();

export const checkMcpIdempotency = async (
  tool: string,
  rawKey: string
): Promise<McpIdempotencyResult> => {
  const key = rawKey.trim();
  if (!key) return { kind: "new" };

  const keyHash = hashKey(tool, key);

  const { data: existing, error: readError } = await supabaseAdmin
    .from("api_idempotency_keys")
    .select("id, status_code, response_payload")
    .eq("scope", SCOPE)
    .eq("key_hash", keyHash)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (readError) throw new Error(readError.message);

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

  const { error: insertError } = await supabaseAdmin
    .from("api_idempotency_keys")
    .insert({
      scope: SCOPE,
      key_hash: keyHash,
      expires_at: expiresAtIso(),
    });
  if (insertError) {
    if (insertError.code === "23505") {
      return { kind: "in_progress" };
    }
    throw new Error(insertError.message);
  }

  return { kind: "new" };
};

export const persistMcpIdempotencyResponse = async (
  tool: string,
  rawKey: string,
  statusCode: number,
  payload: Record<string, unknown>
) => {
  const key = rawKey.trim();
  if (!key) return;

  const keyHash = hashKey(tool, key);
  const { error } = await supabaseAdmin
    .from("api_idempotency_keys")
    .update({
      status_code: statusCode,
      response_payload: payload,
    })
    .eq("scope", SCOPE)
    .eq("key_hash", keyHash);
  if (error) throw new Error(error.message);
};
