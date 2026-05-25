import type { ToolDefinition } from "../types";
import {
  listPropertyDocumentsForAdmin,
  listPropertyDocumentsForClient,
} from "@/services/properties/property-documents.service";

export const propertyDocumentsTools: ToolDefinition<unknown, unknown>[] = [
  {
    name: "property_documents.list_for_property",
    description:
      "Liste les documents attaches a une propriete. audience=admin -> tous; audience=client -> visibles + propres uploads (necessite clientProfileId).",
    version: "1.0.0",
    inputSchema: {
      type: "object",
      properties: {
        propertyId: { type: "string", format: "uuid" },
        audience: { type: "string", enum: ["admin", "client"] },
        clientProfileId: { type: "string", format: "uuid" },
      },
      required: ["propertyId"],
      additionalProperties: false,
    },
    handler: async (input) => {
      const payload = input as {
        propertyId: string;
        audience?: "admin" | "client";
        clientProfileId?: string;
      };
      const audience: "admin" | "client" = payload.audience ?? "admin";
      if (audience === "client") {
        if (!payload.clientProfileId) {
          throw new Error(
            "clientProfileId is required when audience='client'."
          );
        }
        const documents = await listPropertyDocumentsForClient(
          payload.propertyId,
          payload.clientProfileId
        );
        return { documents, count: documents.length, audience };
      }
      const documents = await listPropertyDocumentsForAdmin(payload.propertyId);
      return { documents, count: documents.length, audience };
    },
  },
];
