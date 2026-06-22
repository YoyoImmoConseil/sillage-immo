import type { ToolDefinition } from "../types";
import {
  ensureContactIdentity,
  normalizeEmail,
} from "@/services/contacts/contact-identity.service";

export const contactsTools: ToolDefinition<unknown, unknown>[] = [
  {
    name: "contacts.find_or_merge",
    mutates: true,
    description:
      "Retourne (ou cree) un contact_identity unifie a partir d'un email + phone + nom.",
    version: "1.0.0",
    inputSchema: {
      type: "object",
      properties: {
        email: { type: "string", format: "email" },
        phone: { type: "string" },
        firstName: { type: "string" },
        lastName: { type: "string" },
        fullName: { type: "string" },
      },
      additionalProperties: false,
    },
    handler: async (input) => {
      const payload = input as {
        email?: string;
        phone?: string;
        firstName?: string;
        lastName?: string;
        fullName?: string;
      };
      const normalized = normalizeEmail(payload.email);
      if (!normalized && !payload.phone) {
        throw new Error("Provide at least one of email or phone.");
      }
      const contact = await ensureContactIdentity({
        email: payload.email ?? null,
        phone: payload.phone ?? null,
        firstName: payload.firstName ?? null,
        lastName: payload.lastName ?? null,
        fullName: payload.fullName ?? null,
      });
      return { contact };
    },
  },
];
