import type { ToolDefinition } from "../types";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const valuationsTools: ToolDefinition<unknown, unknown>[] = [
  {
    name: "valuations.list_for_project",
    description: "Liste les valuations rattachees a un client_project (tri par date desc).",
    version: "1.0.0",
    inputSchema: {
      type: "object",
      properties: {
        clientProjectId: { type: "string", format: "uuid" },
        limit: { type: "number", minimum: 1, maximum: 100 },
      },
      required: ["clientProjectId"],
      additionalProperties: false,
    },
    handler: async (input) => {
      const payload = input as { clientProjectId: string; limit?: number };
      const limit = Math.min(Math.max(payload.limit ?? 50, 1), 100);

      const { data, error } = await supabaseAdmin
        .from("valuations")
        .select(
          "id, estimated_price, valuation_low, valuation_high, provider, source, status, valuation_kind, valuated_at, created_at"
        )
        .eq("client_project_id", payload.clientProjectId)
        .order("valuated_at", { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      return { items: data ?? [], count: data?.length ?? 0 };
    },
  },
  {
    name: "valuations.get_latest_for_project",
    description:
      "Retourne la valuation la plus recente (par valuated_at desc) pour un client_project.",
    version: "1.0.0",
    inputSchema: {
      type: "object",
      properties: {
        clientProjectId: { type: "string", format: "uuid" },
      },
      required: ["clientProjectId"],
      additionalProperties: false,
    },
    handler: async (input) => {
      const { clientProjectId } = input as { clientProjectId: string };

      const { data, error } = await supabaseAdmin
        .from("valuations")
        .select(
          "id, estimated_price, valuation_low, valuation_high, provider, source, status, valuation_kind, valuated_at, created_at, raw_payload"
        )
        .eq("client_project_id", clientProjectId)
        .order("valuated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return { valuation: data ?? null };
    },
  },
];
