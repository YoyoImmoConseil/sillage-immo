import { supabaseAdmin } from "@/lib/supabase/admin";
import type { ToolActorType } from "./types";
import { sanitizeAuditInput } from "@/lib/audit/sanitize";
import { hashValue } from "@/lib/audit/hash";

type AuditStatus = "success" | "error";

type AuditPayload = {
  requestId: string;
  tool: string;
  toolVersion?: string;
  actor: ToolActorType;
  actorId?: string | null;
  actorRole?: string | null;
  status: AuditStatus;
  input: unknown;
  errorCode?: string;
  durationMs: number;
  outputSize?: number | null;
  clientIp?: string | null;
  userAgent?: string | null;
};

export const logMcpCall = async (payload: AuditPayload) => {
  try {
    const { error } = await supabaseAdmin.from("audit_log").insert({
      actor_type: payload.actor,
      actor_id: payload.actorId ?? null,
      action: "mcp_tool_call",
      entity_type: "tool",
      entity_id: null,
      data: {
        request_id: payload.requestId,
        tool: payload.tool,
        tool_version: payload.toolVersion ?? null,
        status: payload.status,
        error_code: payload.errorCode ?? null,
        actor_role: payload.actorRole ?? null,
        duration_ms: payload.durationMs,
        output_size: payload.outputSize ?? null,
        client_ip_hash: payload.clientIp ? hashValue(payload.clientIp) : null,
        user_agent_hash: payload.userAgent ? hashValue(payload.userAgent) : null,
        input: sanitizeAuditInput(payload.input),
      },
    });

    return !error;
  } catch {
    return false;
  }
};
