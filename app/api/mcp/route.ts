import { NextResponse } from "next/server";
import { isInternalRequest } from "@/lib/admin/auth";
import { bootstrapMcpRegistry } from "@/lib/mcp/bootstrap";
import { getTool, listTools } from "@/lib/mcp/registry";
import { validateWithSchema } from "@/lib/mcp/validate";
import { logMcpCall } from "@/lib/mcp/audit";
import { isRegisteredToolVersion } from "@/lib/mcp/versioning";
import type {
  ToolCallError,
  ToolCallRequest,
  ToolCallSuccess,
  ToolContext,
  ToolListResponse,
} from "@/lib/mcp/types";

const parseActor = (request: Request): ToolContext["actor"] => {
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
    default:
      return 500;
  }
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

export const GET = async (request: Request) => {
  if (!(await isInternalRequest(request))) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  bootstrapMcpRegistry();
  return NextResponse.json<ToolListResponse>({ tools: listTools() });
};

export const POST = async (request: Request) => {
  if (!(await isInternalRequest(request))) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  bootstrapMcpRegistry();

  const startedAt = Date.now();
  const requestId = crypto.randomUUID();
  const actor = parseActor(request);
  const clientIp = getClientIp(request);
  const userAgent = getUserAgent(request);

  let body: ToolCallRequest | null = null;
  try {
    body = (await request.json()) as ToolCallRequest;
  } catch {
    await logMcpCall({
      requestId,
      tool: "unknown",
      toolVersion: undefined,
      actor,
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
      actor,
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
      actor,
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

  if (!validateWithSchema(tool.inputSchema, body.input)) {
    await logMcpCall({
      requestId,
      tool: body.tool,
      toolVersion: tool.version,
      actor,
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
      actor,
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
      actor,
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

  try {
    const data = await tool.handler(body.input, {
      requestId,
      actor,
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
      actor,
      status: "success",
      input: body.input,
      durationMs: Date.now() - startedAt,
      outputSize,
      clientIp,
      userAgent,
    });

    return NextResponse.json<ToolCallSuccess<unknown>>({
      ok: true,
      tool: tool.name,
      requestId,
      data,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Tool execution failed.";
    await logMcpCall({
      requestId,
      tool: tool.name,
      toolVersion: tool.version,
      actor,
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
