import type { ToolDefinition } from "../types";
import {
  createSellerLead,
  type SellerLeadInput,
} from "@/services/sellers/seller-lead.service";
import { scoreSellerLead } from "@/services/sellers/seller-score.service";
import { generateSellerAiInsight } from "@/services/sellers/seller-ai-insight.service";
import { getSellerLeadContextSnapshot } from "@/services/sellers/seller-context.service";

const normalizeSellerLeadIdentityInput = (
  input: Record<string, unknown>
): SellerLeadInput => {
  const firstName = typeof input.firstName === "string" ? input.firstName.trim() : "";
  const lastName = typeof input.lastName === "string" ? input.lastName.trim() : "";
  const fullNameFromSplit = [firstName, lastName].filter(Boolean).join(" ").trim();
  const fullNameRaw = typeof input.fullName === "string" ? input.fullName.trim() : "";
  const fullName = fullNameRaw || fullNameFromSplit;
  if (!fullName) {
    throw new Error(
      "Seller lead identity is required: provide fullName or firstName + lastName."
    );
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

const sellerLeadInputProperties = {
  fullName: { type: "string" as const },
  firstName: { type: "string" as const },
  lastName: { type: "string" as const },
  email: { type: "string" as const },
  phone: { type: "string" as const },
  propertyType: { type: "string" as const },
  propertyAddress: { type: "string" as const },
  city: { type: "string" as const },
  postalCode: { type: "string" as const },
  timeline: { type: "string" as const },
  occupancyStatus: { type: "string" as const },
  estimatedPrice: { type: "number" as const },
  diagnosticsReady: { type: "boolean" as const },
  diagnosticsSupportNeeded: { type: "boolean" as const },
  syndicDocsReady: { type: "boolean" as const },
  syndicSupportNeeded: { type: "boolean" as const },
  message: { type: "string" as const },
  source: { type: "string" as const },
};

export const sellerLeadsTools: ToolDefinition<unknown, unknown>[] = [
  {
    name: "seller_leads.create_or_reuse",
    mutates: true,
    description:
      "Cree un lead vendeur ou reutilise un lead recent selon les regles anti-doublon.",
    version: "1.0.0",
    inputSchema: {
      type: "object",
      properties: sellerLeadInputProperties,
      required: ["email"],
      additionalProperties: false,
    },
    handler: async (input, context) => {
      return createSellerLead(
        normalizeSellerLeadIdentityInput(input as Record<string, unknown>),
        {
          requestId: context.requestId,
          actor: context.actor,
          toolName: "seller_leads.create_or_reuse",
          toolVersion: "1.0.0",
        }
      );
    },
  },
  {
    name: "seller_leads.score",
    mutates: true,
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
    mutates: true,
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
    mutates: true,
    description:
      "Orchestre create_or_reuse, score et analyse IA, puis retourne une vue consolidee.",
    version: "1.0.0",
    inputSchema: {
      type: "object",
      properties: sellerLeadInputProperties,
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

      if (
        leadResult.status === "failed" ||
        leadResult.status === "duplicate_blocked"
      ) {
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
