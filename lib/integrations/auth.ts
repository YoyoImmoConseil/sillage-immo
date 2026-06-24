import "server-only";
import { NextResponse } from "next/server";
import { checkRateLimit, extractClientIp } from "@/lib/rate-limit/in-memory";
import {
  resolveMcpApiKey,
  type McpKeyContext,
} from "@/services/mcp/mcp-api-key.service";

// Authentication for the partner integrations REST surface
// (`/api/integrations/v1/*`), consumed by the Sillage Immo Zapier app.
//
// We deliberately reuse the existing named API keys (`mcp_api_keys`,
// managed in /admin/mcp-keys) rather than minting a parallel secret system:
// they already carry SHA-256 hashing, a write scope, a per-key tool/scope
// allowlist, an optional IP allowlist and a per-minute rate limit. The key
// is presented as `Authorization: Bearer sk_mcp_...` or `x-api-key`.

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const DEFAULT_RATE_LIMIT_PER_MINUTE = 60;

export type IntegrationScope =
  | "integrations:transactions"
  | "integrations:market"
  | "integrations:buyer_leads"
  | "integrations:seller_leads";

export type IntegrationAuthResult =
  | { ok: true; key: McpKeyContext }
  | { ok: false; response: NextResponse };

const jsonError = (status: number, code: string, message: string) =>
  NextResponse.json({ ok: false, code, message }, { status });

const getPresentedKey = (request: Request): string | null => {
  const direct = request.headers.get("x-api-key")?.trim();
  if (direct) return direct;
  const auth = request.headers.get("authorization");
  if (auth) {
    const [scheme, token] = auth.split(" ");
    if (scheme?.toLowerCase() === "bearer" && token?.trim()) {
      return token.trim();
    }
  }
  return null;
};

/**
 * Resolves the presented key without enforcing write/scope/rate limits.
 * Used by the connection-test endpoint (`GET /api/integrations/v1/me`).
 */
export const resolveIntegrationKey = async (
  request: Request
): Promise<McpKeyContext | null> => {
  const presented = getPresentedKey(request);
  if (!presented) return null;
  return resolveMcpApiKey(presented);
};

const isIpAllowed = (
  clientIp: string | null,
  allowlist: string[] | null
): boolean => {
  if (!allowlist || allowlist.length === 0) return true;
  if (!clientIp) return false;
  return allowlist.includes(clientIp);
};

// Capability check. If the key declares ANY `integrations:*` scope in its
// allowlist, it must include the one required by the endpoint. If it declares
// none (back-compat), any write-enabled key is allowed.
const hasScope = (key: McpKeyContext, required: IntegrationScope): boolean => {
  const declared = key.toolAllowlist.filter((s) =>
    s.startsWith("integrations:")
  );
  if (declared.length === 0) return true;
  return declared.includes(required);
};

/**
 * Authenticates and authorizes an inbound integrations request.
 *
 * Order of checks: key present → resolvable → write scope → IP allowlist →
 * capability scope → rate limit. Returns the resolved key context on success
 * or a ready-to-return error response.
 */
export const authenticateIntegrationRequest = async (
  request: Request,
  options: { requiredScope: IntegrationScope }
): Promise<IntegrationAuthResult> => {
  const presented = getPresentedKey(request);
  if (!presented) {
    return {
      ok: false,
      response: jsonError(
        401,
        "unauthenticated",
        "Clé API requise (en-tête Authorization: Bearer sk_mcp_… ou x-api-key)."
      ),
    };
  }

  const key = await resolveMcpApiKey(presented);
  if (!key) {
    return {
      ok: false,
      response: jsonError(401, "invalid_key", "Clé API invalide ou révoquée."),
    };
  }

  if (!key.canWrite) {
    return {
      ok: false,
      response: jsonError(
        403,
        "forbidden",
        "Cette clé ne dispose pas du scope d'écriture (can_write)."
      ),
    };
  }

  const clientIp = extractClientIp(new Headers(request.headers), "unknown");
  if (!isIpAllowed(clientIp === "unknown" ? null : clientIp, key.ipAllowlist)) {
    return {
      ok: false,
      response: jsonError(403, "forbidden", "IP non autorisée pour cette clé."),
    };
  }

  if (!hasScope(key, options.requiredScope)) {
    return {
      ok: false,
      response: jsonError(
        403,
        "forbidden",
        `Cette clé n'a pas la capacité ${options.requiredScope}.`
      ),
    };
  }

  const limit = key.rateLimitPerMinute ?? DEFAULT_RATE_LIMIT_PER_MINUTE;
  const rate = checkRateLimit({
    key: `integrations:key:${key.id}`,
    limit,
    windowMs: RATE_LIMIT_WINDOW_MS,
  });
  if (!rate.ok) {
    return {
      ok: false,
      response: jsonError(
        429,
        "rate_limited",
        "Limite de débit dépassée pour cette clé."
      ),
    };
  }

  return { ok: true, key };
};
