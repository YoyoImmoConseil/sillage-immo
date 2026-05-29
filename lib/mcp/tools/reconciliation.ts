import type { ToolDefinition } from "../types";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { computePropertyGoldenRecord } from "@/services/properties/golden-record.service";

// MCP tool exposing the consolidated multi-source "golden record" of a
// dossier (estimateur + SweepBright + MyNotary) so the copilot can
// answer questions on the *reconciled* property/seller data instead of
// a single source, and surface divergences + pending reconciliation
// suggestions.

type GetInput = { clientProjectId: string };

type PendingReader = {
  from: (table: "reconciliation_suggestions") => {
    select: (cols: string) => {
      eq: (
        col: string,
        value: string
      ) => {
        eq: (
          col: string,
          value: string
        ) => Promise<{
          data: Array<{
            id: string;
            source_kind: string;
            source_ref: string;
            score: number;
            reasons: unknown;
          }> | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
};

export const reconciliationTools: ToolDefinition<unknown, unknown>[] = [
  {
    name: "reconciliation.get_unified_property",
    description:
      "Récupère la fiche bien + vendeur unifiée (golden record multi-sources : estimateur, SweepBright, MyNotary) d'un dossier vendeur, avec la source retenue par champ, les valeurs divergentes, et les suggestions de réconciliation en attente.",
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
      const { clientProjectId } = input as GetInput;
      const golden = await computePropertyGoldenRecord(clientProjectId);
      if (!golden) {
        return { found: false };
      }

      const reader = supabaseAdmin as unknown as PendingReader;
      const { data: suggestions } = await reader
        .from("reconciliation_suggestions")
        .select("id, source_kind, source_ref, score, reasons")
        .eq("target_client_project_id", clientProjectId)
        .eq("status", "pending");

      const flat = <T,>(f: {
        value: T | null;
        source: string | null;
        alternatives: Array<{ value: T; source: string }>;
        hasDivergence: boolean;
      }) => ({
        value: f.value,
        source: f.source,
        divergence: f.hasDivergence,
        alternatives: f.alternatives,
      });

      return {
        found: true,
        clientProjectId,
        sources: golden.sources,
        property: {
          address: flat(golden.address),
          price: flat(golden.price),
          livingArea: flat(golden.livingArea),
          propertyType: flat(golden.propertyType),
          rooms: flat(golden.rooms),
          floor: flat(golden.floor),
        },
        seller: {
          fullName: flat(golden.seller.fullName),
          email: flat(golden.seller.email),
          phone: flat(golden.seller.phone),
        },
        pendingSuggestions: (suggestions ?? []).map((s) => ({
          id: s.id,
          sourceKind: s.source_kind,
          sourceRef: s.source_ref,
          score: s.score,
          reasons: Array.isArray(s.reasons) ? s.reasons : [],
        })),
      };
    },
  },
];
