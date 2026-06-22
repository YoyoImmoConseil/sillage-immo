import type { ToolDefinition } from "../types";
import { createBuyerLeadFromWebsite } from "@/services/buyers/buyer-lead.service";
import { recomputeMatchesForBuyerLead } from "@/services/buyers/buyer-matching.service";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { emitDomainEvent } from "@/lib/events/domain-events";

const buyerLeadCreateProperties = {
  fullName: { type: "string" as const, minLength: 1 },
  email: { type: "string" as const, format: "email" as const },
  phone: { type: "string" as const },
  searchDetails: { type: "string" as const, minLength: 1 },
};

export const buyerLeadsTools: ToolDefinition<unknown, unknown>[] = [
  {
    name: "buyer_leads.create_or_enrich",
    mutates: true,
    description:
      "Cree (ou enrichit) un buyer_lead + son search profile + recalc matches. Retourne le contexte enrichi.",
    version: "1.0.0",
    inputSchema: {
      type: "object",
      properties: buyerLeadCreateProperties,
      required: ["fullName", "email", "searchDetails"],
      additionalProperties: false,
    },
    handler: async (input) => {
      const payload = input as {
        fullName: string;
        email: string;
        phone?: string;
        searchDetails: string;
      };

      const created = await createBuyerLeadFromWebsite(payload);

      let matching = { newMatches: [] as unknown[], totalMatches: 0 };
      try {
        const result = await recomputeMatchesForBuyerLead(created.lead.id);
        matching = result;
      } catch {
        // matching best-effort; surface in the result but don't fail the
        // upstream call.
      }

      try {
        await emitDomainEvent({
          aggregateType: "buyer_lead",
          aggregateId: created.lead.id,
          eventName: "buyer_lead.created",
          payload: {
            email: created.lead.email,
            source: created.lead.source,
            totalMatches: matching.totalMatches,
          },
        });
      } catch {
        // non-blocking
      }

      return {
        lead: created.lead,
        searchProfile: created.searchProfile,
        matching: {
          newMatchesCount: matching.newMatches.length,
          totalMatches: matching.totalMatches,
        },
      };
    },
  },
  {
    name: "buyer_leads.get_context",
    description:
      "Retourne un contexte buyer consolide (lead + search profile + nombre de matches).",
    version: "1.0.0",
    inputSchema: {
      type: "object",
      properties: {
        buyerLeadId: { type: "string", format: "uuid" },
      },
      required: ["buyerLeadId"],
      additionalProperties: false,
    },
    handler: async (input) => {
      const { buyerLeadId } = input as { buyerLeadId: string };

      const [leadResult, profileResult, matchCountResult] = await Promise.all([
        supabaseAdmin
          .from("buyer_leads")
          .select("*")
          .eq("id", buyerLeadId)
          .maybeSingle(),
        supabaseAdmin
          .from("buyer_search_profiles")
          .select("*")
          .eq("buyer_lead_id", buyerLeadId)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabaseAdmin
          .from("buyer_property_matches")
          .select("id", { count: "exact", head: true })
          .eq("buyer_lead_id", buyerLeadId),
      ]);

      if (leadResult.error) throw new Error(leadResult.error.message);
      if (profileResult.error) throw new Error(profileResult.error.message);
      if (matchCountResult.error) throw new Error(matchCountResult.error.message);

      return {
        lead: leadResult.data ?? null,
        searchProfile: profileResult.data ?? null,
        matchCount: matchCountResult.count ?? 0,
      };
    },
  },
];
