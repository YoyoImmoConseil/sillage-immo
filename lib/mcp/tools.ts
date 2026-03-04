import type { ToolDefinition } from "./types";
import { createLead, scoreLead, type LeadInput } from "@/services/leads/lead.service";

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
];
