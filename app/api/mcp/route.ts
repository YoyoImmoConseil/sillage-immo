import { NextResponse } from "next/server";
import {
  getAdminRequestContext,
  isInternalRequest,
} from "@/lib/admin/auth";
import { bootstrapMcpRegistry } from "@/lib/mcp/bootstrap";
import { getTool, listTools } from "@/lib/mcp/registry";
import { validateWithSchema } from "@/lib/mcp/validate";
import { logMcpCall } from "@/lib/mcp/audit";
import { isRegisteredToolVersion } from "@/lib/mcp/versioning";
import { checkRateLimit, extractClientIp } from "@/lib/rate-limit/in-memory";
import { hashValue } from "@/lib/audit/hash";
import {
  checkMcpIdempotency,
  persistMcpIdempotencyResponse,
} from "@/lib/idempotency/mcp-idempotency";
import {
  resolveMcpApiKey,
  type McpKeyContext,
} from "@/services/mcp/mcp-api-key.service";
import type {
  ToolActorType,
  ToolCallError,
  ToolCallRequest,
  ToolCallSuccess,
  ToolContext,
  ToolListResponse,
} from "@/lib/mcp/types";

const DEFAULT_RATE_LIMIT_PER_MINUTE = 60;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

const parseActorHeader = (request: Request): ToolActorType => {
  const raw = request.headers.get("x-mcp-actor");
  if (raw === "system" || raw === "anonymous" || raw === "user") return raw;
  return "system";
};

const getClientIp = (request: Request) => {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const [first] = forwardedFor.split(",").map((value) => value.trim());
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  return realIp ?? null;
};

const getUserAgent = (request: Request) => {
  return request.headers.get("user-agent");
};

const errorStatus = (code: ToolCallError["error"]["code"]) => {
  switch (code) {
    case "invalid_request":
      return 400;
    case "tool_not_found":
      return 404;
    case "invalid_input":
      return 422;
    case "tool_version_unregistered":
      return 409;
    case "rate_limited":
      return 429;
    case "forbidden":
      return 403;
    default:
      return 500;
  }
};

// Server-side write authorization for the HTTP MCP surface.
//
// Mutating tools are tagged `mutates: true` in the registry. The HTTP
// route is the externally-reachable surface (the stdio bridge proxies
// through it); internal callers use `invokeMcpToolInternal` directly and
// are unaffected. We keep the external door read-only by default and only
// allow mutations when explicitly opted-in via `MCP_WRITE_ENABLED=true`.
// Per-key write scopes arrive in Phase 5 (named MCP keys).
const isWriteAuthorized = (): boolean => {
  return process.env.MCP_WRITE_ENABLED === "true";
};

// Named MCP key presented either via x-mcp-key or an Authorization bearer
// token shaped like our key prefix (sk_mcp_…). Internal/admin auth keeps
// using x-admin-key / cron secrets and is unaffected.
const getPresentedMcpKey = (request: Request): string | null => {
  const direct = request.headers.get("x-mcp-key")?.trim();
  if (direct) return direct;
  const auth = request.headers.get("authorization");
  if (auth) {
    const [scheme, token] = auth.split(" ");
    if (scheme?.toLowerCase() === "bearer" && token?.trim().startsWith("sk_mcp_")) {
      return token.trim();
    }
  }
  return null;
};

const isIpAllowed = (clientIp: string | null, allowlist: string[] | null): boolean => {
  if (!allowlist || allowlist.length === 0) return true;
  if (!clientIp) return false;
  return allowlist.includes(clientIp);
};

const jsonError = (
  tool: string,
  requestId: string,
  code: ToolCallError["error"]["code"],
  message: string
) => {
  return NextResponse.json<ToolCallError>(
    { ok: false, tool, requestId, error: { code, message } },
    { status: errorStatus(code) }
  );
};

const getRateLimitPerMinute = () => {
  const raw = process.env.MCP_RATE_LIMIT_PER_MINUTE;
  if (!raw) return DEFAULT_RATE_LIMIT_PER_MINUTE;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) {
    return DEFAULT_RATE_LIMIT_PER_MINUTE;
  }
  return value;
};

type ResolvedActor = {
  actor: ToolActorType;
  actorId: string | null;
  actorRole: ToolContext["actorRole"] | null;
  actorEmail: string | null;
  rateLimitKey: string;
};

const resolveActor = async (request: Request): Promise<ResolvedActor> => {
  const adminContext = await getAdminRequestContext(request);
  if (adminContext) {
    return {
      actor: "user",
      actorId: adminContext.profile?.id ?? null,
      actorRole: adminContext.role,
      actorEmail: adminContext.profile?.email ?? null,
      rateLimitKey: `mcp:${adminContext.profile?.id ?? `secret:${adminContext.role}`}`,
    };
  }

  const headerActor = parseActorHeader(request);
  const ipHash = hashValue(
    extractClientIp(new Headers(request.headers), "unknown")
  );
  return {
    actor: headerActor,
    actorId: null,
    actorRole: null,
    actorEmail: null,
    rateLimitKey: `mcp:ip:${ipHash}`,
  };
};

export const GET = async (request: Request) => {
  if (!(await isInternalRequest(request))) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized." },
      { status: 401 }
    );
  }

  bootstrapMcpRegistry();
  return NextResponse.json<ToolListResponse>({ tools: listTools() });
};

export const POST = async (request: Request) => {
  // Two valid authentication paths:
  //   1. Internal/admin (x-admin-key, cron secret, admin session).
  //   2. A named, scoped MCP key (Porte 4) for external consumers.
  const presentedKey = getPresentedMcpKey(request);
  const keyContext: McpKeyContext | null = presentedKey
    ? await resolveMcpApiKey(presentedKey)
    : null;
  const internalAuthorized = await isInternalRequest(request);

  if (!internalAuthorized && !keyContext) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized." },
      { status: 401 }
    );
  }

  bootstrapMcpRegistry();

  const startedAt = Date.now();
  const requestId = crypto.randomUUID();
  const resolved = await resolveActor(request);
  const clientIp = getClientIp(request);
  const userAgent = getUserAgent(request);
  const idempotencyKey = request.headers.get("idempotency-key")?.trim() ?? "";

  // Per-key identity + rate limit override when authenticated via a named key.
  if (keyContext && !internalAuthorized) {
    resolved.actor = "system";
    resolved.actorId = `mcpkey:${keyContext.id}`;
    resolved.actorRole = null;
    resolved.rateLimitKey = `mcp:key:${keyContext.id}`;
  }

  // Optional per-key IP allowlist.
  if (keyContext && !internalAuthorized && !isIpAllowed(clientIp, keyContext.ipAllowlist)) {
    await logMcpCall({
      requestId,
      tool: "unknown",
      toolVersion: undefined,
      actor: resolved.actor,
      actorId: resolved.actorId,
      actorRole: resolved.actorRole ?? null,
      status: "error",
      input: null,
      errorCode: "forbidden",
      durationMs: Date.now() - startedAt,
      outputSize: null,
      clientIp,
      userAgent,
    });
    return jsonError("unknown", requestId, "forbidden", "IP not allowed for this key.");
  }

  const perKeyLimit =
    keyContext && !internalAuthorized && keyContext.rateLimitPerMinute
      ? keyContext.rateLimitPerMinute
      : getRateLimitPerMinute();

  const rateLimit = checkRateLimit({
    key: resolved.rateLimitKey,
    limit: perKeyLimit,
    windowMs: RATE_LIMIT_WINDOW_MS,
  });
  if (!rateLimit.ok) {
    await logMcpCall({
      requestId,
      tool: "unknown",
      toolVersion: undefined,
      actor: resolved.actor,
      actorId: resolved.actorId,
      actorRole: resolved.actorRole ?? null,
      status: "error",
      input: null,
      errorCode: "rate_limited",
      durationMs: Date.now() - startedAt,
      outputSize: null,
      clientIp,
      userAgent,
    });
    return jsonError(
      "unknown",
      requestId,
      "rate_limited",
      "Rate limit exceeded for this actor."
    );
  }

  let body: ToolCallRequest | null = null;
  try {
    body = (await request.json()) as ToolCallRequest;
  } catch {
    await logMcpCall({
      requestId,
      tool: "unknown",
      toolVersion: undefined,
      actor: resolved.actor,
      actorId: resolved.actorId,
      actorRole: resolved.actorRole ?? null,
      status: "error",
      input: null,
      errorCode: "invalid_request",
      durationMs: Date.now() - startedAt,
      outputSize: null,
      clientIp,
      userAgent,
    });
    return jsonError("unknown", requestId, "invalid_request", "Invalid JSON body.");
  }

  if (!body || typeof body.tool !== "string") {
    await logMcpCall({
      requestId,
      tool: "unknown",
      toolVersion: undefined,
      actor: resolved.actor,
      actorId: resolved.actorId,
      actorRole: resolved.actorRole ?? null,
      status: "error",
      input: body?.input ?? null,
      errorCode: "invalid_request",
      durationMs: Date.now() - startedAt,
      outputSize: null,
      clientIp,
      userAgent,
    });
    return jsonError("unknown", requestId, "invalid_request", "Missing tool name.");
  }

  const tool = getTool(body.tool);
  if (!tool) {
    await logMcpCall({
      requestId,
      tool: body.tool,
      toolVersion: undefined,
      actor: resolved.actor,
      actorId: resolved.actorId,
      actorRole: resolved.actorRole ?? null,
      status: "error",
      input: body.input ?? null,
      errorCode: "tool_not_found",
      durationMs: Date.now() - startedAt,
      outputSize: null,
      clientIp,
      userAgent,
    });
    return jsonError(body.tool, requestId, "tool_not_found", "Tool not found.");
  }

  const externalKey = keyContext && !internalAuthorized ? keyContext : null;

  // Per-key tool allowlist (external keys only).
  if (externalKey && !externalKey.toolAllowlist.includes(tool.name)) {
    await logMcpCall({
      requestId,
      tool: tool.name,
      toolVersion: tool.version,
      actor: resolved.actor,
      actorId: resolved.actorId,
      actorRole: resolved.actorRole ?? null,
      status: "error",
      input: body.input ?? null,
      errorCode: "forbidden",
      durationMs: Date.now() - startedAt,
      outputSize: null,
      clientIp,
      userAgent,
    });
    return jsonError(
      tool.name,
      requestId,
      "forbidden",
      "This tool is not in the allowlist for this key."
    );
  }

  // PII scope: external keys only see PII-bearing tools when explicitly
  // granted. By default external projections are PII-free.
  if (externalKey && tool.readsPii && !externalKey.canReadPii) {
    await logMcpCall({
      requestId,
      tool: tool.name,
      toolVersion: tool.version,
      actor: resolved.actor,
      actorId: resolved.actorId,
      actorRole: resolved.actorRole ?? null,
      status: "error",
      input: body.input ?? null,
      errorCode: "forbidden",
      durationMs: Date.now() - startedAt,
      outputSize: null,
      clientIp,
      userAgent,
    });
    return jsonError(
      tool.name,
      requestId,
      "forbidden",
      "This tool returns personal data and this key lacks the PII scope."
    );
  }

  // Write scope: an external key uses its own can_write flag; internal/admin
  // callers stay governed by MCP_WRITE_ENABLED.
  const writeAllowed = externalKey ? externalKey.canWrite : isWriteAuthorized();
  if (tool.mutates && !writeAllowed) {
    await logMcpCall({
      requestId,
      tool: tool.name,
      toolVersion: tool.version,
      actor: resolved.actor,
      actorId: resolved.actorId,
      actorRole: resolved.actorRole ?? null,
      status: "error",
      input: body.input ?? null,
      errorCode: "forbidden",
      durationMs: Date.now() - startedAt,
      outputSize: null,
      clientIp,
      userAgent,
    });
    return jsonError(
      tool.name,
      requestId,
      "forbidden",
      externalKey
        ? "This tool mutates state and this key lacks the write scope."
        : "This tool mutates state and is disabled on the MCP HTTP surface (read-only). Set MCP_WRITE_ENABLED=true to allow writes."
    );
  }

  if (!validateWithSchema(tool.inputSchema, body.input)) {
    await logMcpCall({
      requestId,
      tool: body.tool,
      toolVersion: tool.version,
      actor: resolved.actor,
      actorId: resolved.actorId,
      actorRole: resolved.actorRole ?? null,
      status: "error",
      input: body.input ?? null,
      errorCode: "invalid_input",
      durationMs: Date.now() - startedAt,
      outputSize: null,
      clientIp,
      userAgent,
    });
    return jsonError(body.tool, requestId, "invalid_input", "Invalid tool input.");
  }

  if (!tool.version) {
    await logMcpCall({
      requestId,
      tool: tool.name,
      toolVersion: undefined,
      actor: resolved.actor,
      actorId: resolved.actorId,
      actorRole: resolved.actorRole ?? null,
      status: "error",
      input: body.input ?? null,
      errorCode: "tool_version_unregistered",
      durationMs: Date.now() - startedAt,
      outputSize: null,
      clientIp,
      userAgent,
    });
    return jsonError(
      tool.name,
      requestId,
      "tool_version_unregistered",
      "Tool version is missing in registry."
    );
  }

  const isRegistered = await isRegisteredToolVersion(tool.name, tool.version);
  if (!isRegistered) {
    await logMcpCall({
      requestId,
      tool: tool.name,
      toolVersion: tool.version,
      actor: resolved.actor,
      actorId: resolved.actorId,
      actorRole: resolved.actorRole ?? null,
      status: "error",
      input: body.input ?? null,
      errorCode: "tool_version_unregistered",
      durationMs: Date.now() - startedAt,
      outputSize: null,
      clientIp,
      userAgent,
    });
    return jsonError(
      tool.name,
      requestId,
      "tool_version_unregistered",
      "Tool version is not registered in admin catalog."
    );
  }

  // Idempotency: when a client provides Idempotency-Key, store the JSON
  // response keyed by (tool, key) so a retry within 24h re-plays the
  // exact same response instead of re-executing the tool.
  if (idempotencyKey) {
    const replay = await checkMcpIdempotency(tool.name, idempotencyKey);
    if (replay.kind === "replay") {
      return NextResponse.json(replay.payload, { status: replay.statusCode });
    }
    if (replay.kind === "in_progress") {
      return jsonError(
        tool.name,
        requestId,
        "invalid_request",
        "Idempotency key currently in progress; retry shortly."
      );
    }
  }

  try {
    const data = await tool.handler(body.input, {
      requestId,
      actor: resolved.actor,
      actorType: resolved.actor,
      actorId: resolved.actorId,
      actorRole: resolved.actorRole,
      actorEmail: resolved.actorEmail,
    });

    let outputSize: number | null = null;
    try {
      outputSize = JSON.stringify(data).length;
    } catch {
      outputSize = null;
    }

    await logMcpCall({
      requestId,
      tool: tool.name,
      toolVersion: tool.version,
      actor: resolved.actor,
      actorId: resolved.actorId,
      actorRole: resolved.actorRole ?? null,
      status: "success",
      input: body.input,
      durationMs: Date.now() - startedAt,
      outputSize,
      clientIp,
      userAgent,
    });

    const successPayload: ToolCallSuccess<unknown> = {
      ok: true,
      tool: tool.name,
      requestId,
      data,
    };

    if (idempotencyKey) {
      try {
        await persistMcpIdempotencyResponse(
          tool.name,
          idempotencyKey,
          200,
          successPayload as unknown as Record<string, unknown>
        );
      } catch {
        // non-blocking
      }
    }

    return NextResponse.json<ToolCallSuccess<unknown>>(successPayload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Tool execution failed.";
    await logMcpCall({
      requestId,
      tool: tool.name,
      toolVersion: tool.version,
      actor: resolved.actor,
      actorId: resolved.actorId,
      actorRole: resolved.actorRole ?? null,
      status: "error",
      input: body.input ?? null,
      errorCode: "failed",
      durationMs: Date.now() - startedAt,
      outputSize: null,
      clientIp,
      userAgent,
    });
    return jsonError(tool.name, requestId, "failed", message);
  }
};
