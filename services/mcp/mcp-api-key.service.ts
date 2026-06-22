import "server-only";
import { randomBytes } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { hashValue } from "@/lib/audit/hash";

// Named, scoped MCP API keys (Porte 4). Only the SHA-256 hash is persisted;
// the plaintext secret is returned exactly once at creation time.

export type McpKeyContext = {
  id: string;
  name: string;
  toolAllowlist: string[];
  canWrite: boolean;
  canReadPii: boolean;
  ipAllowlist: string[] | null;
  rateLimitPerMinute: number | null;
};

export type McpApiKeySummary = {
  id: string;
  name: string;
  keyPrefix: string;
  toolAllowlist: string[];
  canWrite: boolean;
  canReadPii: boolean;
  ipAllowlist: string[] | null;
  rateLimitPerMinute: number | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

const KEY_BYTES = 32;
const KEY_PLAINTEXT_PREFIX = "sk_mcp_";

const readToolAllowlist = (scopes: unknown): string[] => {
  if (scopes && typeof scopes === "object" && "tools" in scopes) {
    const tools = (scopes as { tools?: unknown }).tools;
    if (Array.isArray(tools)) {
      return tools.filter((t): t is string => typeof t === "string");
    }
  }
  return [];
};

type McpKeyRow = {
  id: string;
  name: string;
  key_prefix: string;
  scopes: Record<string, unknown>;
  can_write: boolean;
  can_read_pii: boolean;
  ip_allowlist: string[] | null;
  rate_limit_per_minute: number | null;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

const toSummary = (row: McpKeyRow): McpApiKeySummary => ({
  id: row.id,
  name: row.name,
  keyPrefix: row.key_prefix,
  toolAllowlist: readToolAllowlist(row.scopes),
  canWrite: row.can_write,
  canReadPii: row.can_read_pii,
  ipAllowlist: row.ip_allowlist,
  rateLimitPerMinute: row.rate_limit_per_minute,
  lastUsedAt: row.last_used_at,
  revokedAt: row.revoked_at,
  createdAt: row.created_at,
});

// Resolve a presented raw key into its scoped context. Returns null when the
// key is unknown or revoked. Best-effort updates last_used_at.
export const resolveMcpApiKey = async (
  rawKey: string
): Promise<McpKeyContext | null> => {
  const trimmed = rawKey.trim();
  if (!trimmed) return null;
  const keyHash = hashValue(trimmed);

  const { data, error } = await supabaseAdmin
    .from("mcp_api_keys")
    .select(
      "id, name, scopes, can_write, can_read_pii, ip_allowlist, rate_limit_per_minute, revoked_at"
    )
    .eq("key_hash", keyHash)
    .is("revoked_at", null)
    .maybeSingle();

  if (error || !data) return null;

  // Touch last_used_at without blocking the request path.
  void supabaseAdmin
    .from("mcp_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(() => undefined, () => undefined);

  return {
    id: data.id,
    name: data.name,
    toolAllowlist: readToolAllowlist(data.scopes),
    canWrite: data.can_write,
    canReadPii: data.can_read_pii,
    ipAllowlist: data.ip_allowlist,
    rateLimitPerMinute: data.rate_limit_per_minute,
  };
};

export type CreateMcpApiKeyInput = {
  name: string;
  toolAllowlist: string[];
  canWrite?: boolean;
  canReadPii?: boolean;
  ipAllowlist?: string[] | null;
  rateLimitPerMinute?: number | null;
  createdByAdminProfileId?: string | null;
};

export const createMcpApiKey = async (
  input: CreateMcpApiKeyInput
): Promise<{ summary: McpApiKeySummary; plaintextKey: string }> => {
  const secret = randomBytes(KEY_BYTES).toString("base64url");
  const plaintextKey = `${KEY_PLAINTEXT_PREFIX}${secret}`;
  const keyHash = hashValue(plaintextKey);
  const keyPrefix = plaintextKey.slice(0, 12);

  const { data, error } = await supabaseAdmin
    .from("mcp_api_keys")
    .insert({
      name: input.name.trim(),
      key_prefix: keyPrefix,
      key_hash: keyHash,
      scopes: { tools: input.toolAllowlist },
      can_write: input.canWrite ?? false,
      can_read_pii: input.canReadPii ?? false,
      ip_allowlist:
        input.ipAllowlist && input.ipAllowlist.length > 0 ? input.ipAllowlist : null,
      rate_limit_per_minute: input.rateLimitPerMinute ?? null,
      created_by_admin_profile_id: input.createdByAdminProfileId ?? null,
    })
    .select(
      "id, name, key_prefix, scopes, can_write, can_read_pii, ip_allowlist, rate_limit_per_minute, last_used_at, revoked_at, created_at"
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Création de la clé MCP impossible.");
  }

  return { summary: toSummary(data as McpKeyRow), plaintextKey };
};

export const listMcpApiKeys = async (): Promise<McpApiKeySummary[]> => {
  const { data, error } = await supabaseAdmin
    .from("mcp_api_keys")
    .select(
      "id, name, key_prefix, scopes, can_write, can_read_pii, ip_allowlist, rate_limit_per_minute, last_used_at, revoked_at, created_at"
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => toSummary(row as McpKeyRow));
};

export const revokeMcpApiKey = async (id: string): Promise<void> => {
  const { error } = await supabaseAdmin
    .from("mcp_api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .is("revoked_at", null);
  if (error) throw new Error(error.message);
};
