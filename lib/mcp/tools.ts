import type { ToolDefinition } from "./types";
import { createLead, scoreLead, type LeadInput } from "@/services/leads/lead.service";
import {
  createSellerLead,
  type SellerLeadInput,
} from "@/services/sellers/seller-lead.service";
import { scoreSellerLead } from "@/services/sellers/seller-score.service";
import { generateSellerAiInsight } from "@/services/sellers/seller-ai-insight.service";
import { getSellerLeadContextSnapshot } from "@/services/sellers/seller-context.service";
import { getHomeAssistantContextSnapshot } from "@/services/home/home-assistant-context.service";

const normalizeSellerLeadIdentityInput = (input: Record<string, unknown>): SellerLeadInput => {
  const firstName = typeof input.firstName === "string" ? input.firstName.trim() : "";
  const lastName = typeof input.lastName === "string" ? input.lastName.trim() : "";
  const fullNameFromSplit = [firstName, lastName].filter(Boolean).join(" ").trim();
  const fullNameRaw = typeof input.fullName === "string" ? input.fullName.trim() : "";
  const fullName = fullNameRaw || fullNameFromSplit;
  if (!fullName) {
    throw new Error("Seller lead identity is required: provide fullName or firstName + lastName.");
  }

  const metadataPatch =
    firstName || lastName
      ? {
          identity: {
            first_name: firstName || null,
            last_name: lastName || null,
          },
        }
      : undefined;

  return {
    ...(input as SellerLeadInput),
    fullName,
    metadata:
      metadataPatch && !(input as SellerLeadInput).metadata
        ? metadataPatch
        : metadataPatch
          ? {
              ...((input as SellerLeadInput).metadata ?? {}),
              ...metadataPatch,
            }
          : (input as SellerLeadInput).metadata,
  };
};

export const tools: ToolDefinition<unknown, unknown>[] = [
  {
    name: "leads.create",
    description: "Enregistre un lead entrant et retourne un statut.",
    version: "1.0.0",
    inputSchema: {
      type: "object",
      properties: {
        fullName: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        message: { type: "string" },
        source: { type: "string" },
        timeline: { type: "string" },
        budget: { type: "number" },
        budgetMin: { type: "number" },
        budgetMax: { type: "number" },
        zoneTier: { type: "string" },
        zoneSlug: { type: "string" },
        zoneText: { type: "string" },
        propertyType: { type: "string" },
        rooms: { type: "number" },
      },
      required: ["fullName", "email"],
      additionalProperties: false,
    },
    handler: async (input, context) => {
      return createLead(input as LeadInput, {
        requestId: context.requestId,
        actor: context.actor,
        toolName: "leads.create",
        toolVersion: "1.0.0",
      });
    },
  },
  {
    name: "leads.score",
    description: "Calcule un score de priorité pour un lead.",
    version: "1.0.0",
    inputSchema: {
      type: "object",
      properties: {
        fullName: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        message: { type: "string" },
        source: { type: "string" },
        timeline: { type: "string" },
        budget: { type: "number" },
        budgetMin: { type: "number" },
        budgetMax: { type: "number" },
        zoneTier: { type: "string" },
        zoneSlug: { type: "string" },
        zoneText: { type: "string" },
        propertyType: { type: "string" },
        rooms: { type: "number" },
      },
      required: ["fullName", "email"],
      additionalProperties: false,
    },
    handler: async (input, context) => {
      return scoreLead(input as LeadInput, {
        requestId: context.requestId,
        actor: context.actor,
        toolName: "leads.score",
        toolVersion: "1.0.0",
      });
    },
  },
  {
    name: "seller_leads.create_or_reuse",
    description:
      "Cree un lead vendeur ou reutilise un lead recent selon les regles anti-doublon.",
    version: "1.0.0",
    inputSchema: {
      type: "object",
      properties: {
        fullName: { type: "string" },
        firstName: { type: "string" },
        lastName: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        propertyType: { type: "string" },
        propertyAddress: { type: "string" },
        city: { type: "string" },
        postalCode: { type: "string" },
        timeline: { type: "string" },
        occupancyStatus: { type: "string" },
        estimatedPrice: { type: "number" },
        diagnosticsReady: { type: "boolean" },
        diagnosticsSupportNeeded: { type: "boolean" },
        syndicDocsReady: { type: "boolean" },
        syndicSupportNeeded: { type: "boolean" },
        message: { type: "string" },
        source: { type: "string" },
      },
      required: ["email"],
      additionalProperties: false,
    },
    handler: async (input, context) => {
      return createSellerLead(normalizeSellerLeadIdentityInput(input as Record<string, unknown>), {
        requestId: context.requestId,
        actor: context.actor,
        toolName: "seller_leads.create_or_reuse",
        toolVersion: "1.0.0",
      });
    },
  },
  {
    name: "seller_leads.score",
    description: "Calcule le scoring vendeur et met a jour le lead.",
    version: "1.0.0",
    inputSchema: {
      type: "object",
      properties: {
        sellerLeadId: { type: "string" },
      },
      required: ["sellerLeadId"],
      additionalProperties: false,
    },
    handler: async (input) => {
      const payload = input as { sellerLeadId: string };
      return scoreSellerLead(payload.sellerLeadId);
    },
  },
  {
    name: "seller_leads.generate_ai_insight",
    description: "Genere une analyse IA actionnable pour un lead vendeur.",
    version: "1.0.0",
    inputSchema: {
      type: "object",
      properties: {
        sellerLeadId: { type: "string" },
      },
      required: ["sellerLeadId"],
      additionalProperties: false,
    },
    handler: async (input) => {
      const payload = input as { sellerLeadId: string };
      return generateSellerAiInsight(payload.sellerLeadId);
    },
  },
  {
    name: "home_assistant.get_context",
    description: "Retourne un contexte global pour l'assistant commercial homepage.",
    version: "1.0.0",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    handler: async () => {
      return getHomeAssistantContextSnapshot();
    },
  },
  {
    name: "seller_leads.get_context",
    description: "Retourne un contexte vendeur consolide (lead, scoring, insight IA).",
    version: "1.0.0",
    inputSchema: {
      type: "object",
      properties: {
        sellerLeadId: { type: "string" },
      },
      required: ["sellerLeadId"],
      additionalProperties: false,
    },
    handler: async (input) => {
      const payload = input as { sellerLeadId: string };
      return getSellerLeadContextSnapshot(payload.sellerLeadId);
    },
  },
  {
    name: "seller_leads.enrich",
    description:
      "Orchestre create_or_reuse, score et analyse IA, puis retourne une vue consolidee.",
    version: "1.0.0",
    inputSchema: {
      type: "object",
      properties: {
        fullName: { type: "string" },
        firstName: { type: "string" },
        lastName: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        propertyType: { type: "string" },
        propertyAddress: { type: "string" },
        city: { type: "string" },
        postalCode: { type: "string" },
        timeline: { type: "string" },
        occupancyStatus: { type: "string" },
        estimatedPrice: { type: "number" },
        diagnosticsReady: { type: "boolean" },
        diagnosticsSupportNeeded: { type: "boolean" },
        syndicDocsReady: { type: "boolean" },
        syndicSupportNeeded: { type: "boolean" },
        message: { type: "string" },
        source: { type: "string" },
      },
      required: ["email"],
      additionalProperties: false,
    },
    handler: async (input, context) => {
      const leadResult = await createSellerLead(
        normalizeSellerLeadIdentityInput(input as Record<string, unknown>),
        {
        requestId: context.requestId,
        actor: context.actor,
        toolName: "seller_leads.enrich",
        toolVersion: "1.0.0",
        }
      );

      if (leadResult.status === "failed" || leadResult.status === "duplicate_blocked") {
        return {
          status: leadResult.status,
          sellerLeadId: "sellerLeadId" in leadResult ? leadResult.sellerLeadId : null,
          message: "reason" in leadResult ? leadResult.reason : null,
          scoring: null,
          aiInsight: null,
        };
      }

      const sellerLeadId = leadResult.sellerLeadId;
      const scoring = await scoreSellerLead(sellerLeadId);

      let aiInsight: Awaited<ReturnType<typeof generateSellerAiInsight>> | null = null;
      let aiInsightError: string | null = null;
      try {
        aiInsight = await generateSellerAiInsight(sellerLeadId);
      } catch (error) {
        aiInsightError = error instanceof Error ? error.message : "AI insight failed.";
      }

      return {
        status: leadResult.status,
        sellerLeadId,
        scoring,
        aiInsight,
        aiInsightError,
      };
    },
  },
];
