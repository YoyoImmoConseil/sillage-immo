import type { ToolDefinition } from "../types";
import {
  listMatchesForBuyerLead,
  listMatchesForProperty,
  recomputeMatchesForBuyerLead,
  recomputeMatchesForProperty,
} from "@/services/buyers/buyer-matching.service";

export const buyerMatchingTools: ToolDefinition<unknown, unknown>[] = [
  {
    name: "buyer_matching.recompute_for_lead",
    description:
      "Recalcule tous les matches pour un buyer_lead. Retourne le delta de nouveaux matches.",
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
      const result = await recomputeMatchesForBuyerLead(buyerLeadId);
      return result;
    },
  },
  {
    name: "buyer_matching.recompute_for_property",
    description:
      "Recalcule tous les matches pour une propriete (utile apres publication / changement de prix).",
    version: "1.0.0",
    inputSchema: {
      type: "object",
      properties: {
        propertyId: { type: "string", format: "uuid" },
      },
      required: ["propertyId"],
      additionalProperties: false,
    },
    handler: async (input) => {
      const { propertyId } = input as { propertyId: string };
      const result = await recomputeMatchesForProperty(propertyId);
      return result;
    },
  },
  {
    name: "buyer_matching.list_for_lead",
    description: "Liste les matches existants pour un buyer_lead (tries par score desc).",
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
      const matches = await listMatchesForBuyerLead(buyerLeadId);
      return { matches, count: matches.length };
    },
  },
  {
    name: "buyer_matching.list_for_property",
    description:
      "Liste les buyer_leads matches sur une propriete (tries par score desc).",
    version: "1.0.0",
    inputSchema: {
      type: "object",
      properties: {
        propertyId: { type: "string", format: "uuid" },
      },
      required: ["propertyId"],
      additionalProperties: false,
    },
    handler: async (input) => {
      const { propertyId } = input as { propertyId: string };
      const matches = await listMatchesForProperty(propertyId);
      return { matches, count: matches.length };
    },
  },
];
