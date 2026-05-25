import type { ToolDefinition } from "../types";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const auditTools: ToolDefinition<unknown, unknown>[] = [
  {
    name: "audit.search",
    description:
      "Recherche read-only dans audit_log par tool, status, plage de dates.",
    version: "1.0.0",
    inputSchema: {
      type: "object",
      properties: {
        tool: { type: "string" },
        status: { type: "string", enum: ["success", "error"] },
        from: { type: "string", format: "date-time" },
        to: { type: "string", format: "date-time" },
        limit: { type: "number", minimum: 1, maximum: 100 },
      },
      additionalProperties: false,
    },
    handler: async (input) => {
      const payload = (input ?? {}) as {
        tool?: string;
        status?: "success" | "error";
        from?: string;
        to?: string;
        limit?: number;
      };
      const limit = Math.min(Math.max(payload.limit ?? 50, 1), 100);

      let query = supabaseAdmin
        .from("audit_log")
        .select("id, created_at, actor_type, actor_id, action, entity_type, data")
        .eq("action", "mcp_tool_call")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (payload.tool) query = query.eq("data->>tool", payload.tool);
      if (payload.status) query = query.eq("data->>status", payload.status);
      if (payload.from) query = query.gte("created_at", payload.from);
      if (payload.to) query = query.lte("created_at", payload.to);

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return { items: data ?? [], count: data?.length ?? 0 };
    },
  },
];
