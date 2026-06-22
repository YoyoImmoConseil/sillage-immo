import type { ToolDefinition } from "../types";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  getSignedDocumentByKey,
  listSignedDocuments,
} from "@/services/admin/mynotary-list.service";

// MCP tools exposed to the admin copilot + external MCP clients so a
// natural-language question like "Combien de mandats signés ce mois ?"
// can be answered against the data ingested from MyNotary.
//
// Three tools by design (matching the dashboard cards):
//   - mynotary.list_signed_documents (list view + filters)
//   - mynotary.get_signed_document   (drill-down on one row)
//   - mynotary.stats_signed_by_period (count aggregations)
//
// All three respect the `deleted_at IS NULL` soft-delete contract.

type ListInput = {
  kind?: "mandate" | "purchase_offer" | "preliminary_sale" | "all";
  matched?: "matched" | "unmatched" | "all";
  since?: string;
  until?: string;
  page?: number;
  pageSize?: number;
};

type GetInput =
  | { id: string; mynotary_contract_id?: never }
  | { id?: never; mynotary_contract_id: string };

type StatsGroup = "day" | "week" | "month" | "kind" | "advisor";

type StatsInput = {
  since: string;
  until: string;
  groupBy?: StatsGroup;
  kind?: "mandate" | "purchase_offer" | "preliminary_sale" | "all";
};

const KIND_ENUM = ["mandate", "purchase_offer", "preliminary_sale", "all"];
const MATCHED_ENUM = ["matched", "unmatched", "all"];

const truncateIso = (iso: string, bucket: "day" | "week" | "month"): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  if (bucket === "day") {
    return d.toISOString().slice(0, 10);
  }
  if (bucket === "week") {
    const day = d.getUTCDay();
    const diff = (day + 6) % 7;
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() - diff);
    return monday.toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 7);
};

export const mynotaryTools: ToolDefinition<unknown, unknown>[] = [
  {
    name: "mynotary.list_signed_documents",
    readsPii: true,
    description:
      "Liste paginée des contrats MyNotary signés (mandats / offres / compromis) avec filtres period / kind / matched.",
    version: "1.0.0",
    inputSchema: {
      type: "object",
      properties: {
        kind: { type: "string", enum: KIND_ENUM },
        matched: { type: "string", enum: MATCHED_ENUM },
        since: { type: "string", format: "date-time" },
        until: { type: "string", format: "date-time" },
        page: { type: "number", minimum: 1, maximum: 1000 },
        pageSize: { type: "number", minimum: 1, maximum: 100 },
      },
      required: [],
      additionalProperties: false,
    },
    handler: async (input) => {
      const payload = input as ListInput;
      const result = await listSignedDocuments(payload);
      return {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        items: result.rows.map((row) => ({
          id: row.id,
          contractKind: row.contract_kind,
          contractTypeRaw: row.contract_type_raw,
          mynotaryContractId: row.mynotary_contract_id,
          mynotaryOperationId: row.mynotary_operation_id,
          signedAt: row.signed_at,
          signers: row.signers,
          fileUrls: (row.files ?? []).map((f) => f.url),
          matched: row.matched_seller_project_id !== null,
          matchConfidence: row.match_confidence,
          matchMethod: row.match_method,
          matchedSellerProjectId: row.matched_seller_project_id,
          matchedPropertyId: row.matched_property_id,
        })),
      };
    },
  },
  {
    name: "mynotary.get_signed_document",
    readsPii: true,
    description:
      "Détail d'un contrat MyNotary signé (par id Sillage ou par mynotary_contract_id).",
    version: "1.0.0",
    inputSchema: {
      oneOf: [
        {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
          },
          required: ["id"],
          additionalProperties: false,
        },
        {
          type: "object",
          properties: {
            mynotary_contract_id: { type: "string", minLength: 1 },
          },
          required: ["mynotary_contract_id"],
          additionalProperties: false,
        },
      ],
    },
    handler: async (input) => {
      const payload = input as GetInput;
      const row = await getSignedDocumentByKey({
        id: "id" in payload ? payload.id : undefined,
        mynotaryContractId:
          "mynotary_contract_id" in payload
            ? payload.mynotary_contract_id
            : undefined,
      });
      if (!row) {
        return { found: false };
      }
      return {
        found: true,
        document: {
          id: row.id,
          contractKind: row.contract_kind,
          contractTypeRaw: row.contract_type_raw,
          mynotaryContractId: row.mynotary_contract_id,
          mynotaryOperationId: row.mynotary_operation_id,
          signedAt: row.signed_at,
          signers: row.signers,
          files: row.files,
          matched: row.matched_seller_project_id !== null,
          matchConfidence: row.match_confidence,
          matchMethod: row.match_method,
          matchedSellerProjectId: row.matched_seller_project_id,
          matchedPropertyId: row.matched_property_id,
        },
      };
    },
  },
  {
    name: "mynotary.stats_signed_by_period",
    description:
      "Agrège le volume de contrats MyNotary signés sur une période (groupBy day|week|month|kind|advisor).",
    version: "1.0.0",
    inputSchema: {
      type: "object",
      properties: {
        since: { type: "string", format: "date-time" },
        until: { type: "string", format: "date-time" },
        groupBy: {
          type: "string",
          enum: ["day", "week", "month", "kind", "advisor"],
        },
        kind: { type: "string", enum: KIND_ENUM },
      },
      required: ["since", "until"],
      additionalProperties: false,
    },
    handler: async (input) => {
      const payload = input as StatsInput;
      const groupBy: StatsGroup = payload.groupBy ?? "day";
      let query = supabaseAdmin
        .from("mynotary_signed_documents")
        .select("contract_kind, signed_at, matched_seller_project_id")
        .is("deleted_at", null)
        .gte("signed_at", payload.since)
        .lte("signed_at", payload.until);
      if (payload.kind && payload.kind !== "all") {
        query = query.eq("contract_kind", payload.kind);
      }
      const { data, error } = await query.limit(5000);
      if (error) throw new Error(error.message);
      const rows = data ?? [];

      const buckets = new Map<string, number>();
      if (groupBy === "kind") {
        for (const r of rows) {
          buckets.set(r.contract_kind, (buckets.get(r.contract_kind) ?? 0) + 1);
        }
      } else if (groupBy === "advisor") {
        // Resolve advisor via matched_seller_project_id ->
        // seller_projects.assigned_admin_profile_id. We do it in
        // memory to keep one round trip + avoid coupling to
        // generated types.
        const projectIds = Array.from(
          new Set(
            rows
              .map((r) => r.matched_seller_project_id)
              .filter((v): v is string => Boolean(v))
          )
        );
        let advisorByProject = new Map<string, string>();
        if (projectIds.length > 0) {
          const { data: projData } = await supabaseAdmin
            .from("seller_projects")
            .select("id, assigned_admin_profile_id")
            .in("id", projectIds);
          advisorByProject = new Map(
            (projData ?? []).map((p) => [
              p.id,
              p.assigned_admin_profile_id ?? "unknown",
            ])
          );
        }
        for (const r of rows) {
          const advisor =
            (r.matched_seller_project_id &&
              advisorByProject.get(r.matched_seller_project_id)) ||
            "unknown";
          buckets.set(advisor, (buckets.get(advisor) ?? 0) + 1);
        }
      } else {
        for (const r of rows) {
          const key = truncateIso(r.signed_at, groupBy);
          buckets.set(key, (buckets.get(key) ?? 0) + 1);
        }
      }

      const groups = Array.from(buckets.entries())
        .map(([key, count]) => ({ key, count }))
        .sort((a, b) => (a.key > b.key ? 1 : -1));

      return {
        since: payload.since,
        until: payload.until,
        groupBy,
        total: rows.length,
        groups,
      };
    },
  },
];
