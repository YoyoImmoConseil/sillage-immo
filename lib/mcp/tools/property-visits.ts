import type { ToolDefinition } from "../types";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { listVisitsForProperty } from "@/services/properties/property-visit.service";

export const propertyVisitsTools: ToolDefinition<unknown, unknown>[] = [
  {
    name: "property_visits.list_for_property",
    description:
      "Liste les visites pour une propriete (audience=admin retourne PII, audience=client masquee).",
    version: "1.0.0",
    inputSchema: {
      type: "object",
      properties: {
        propertyId: { type: "string", format: "uuid" },
        audience: { type: "string", enum: ["admin", "client"] },
      },
      required: ["propertyId"],
      additionalProperties: false,
    },
    handler: async (input) => {
      const payload = input as {
        propertyId: string;
        audience?: "admin" | "client";
      };
      const audience: "admin" | "client" = payload.audience ?? "admin";
      const visits =
        audience === "client"
          ? await listVisitsForProperty(payload.propertyId, "client")
          : await listVisitsForProperty(payload.propertyId, "admin");
      return { visits, count: visits.length, audience };
    },
  },
  {
    name: "property_visits.list_for_seller_project",
    description:
      "Liste les visites pour un seller_project (resolu via project_properties).",
    version: "1.0.0",
    inputSchema: {
      type: "object",
      properties: {
        sellerProjectId: { type: "string", format: "uuid" },
        audience: { type: "string", enum: ["admin", "client"] },
      },
      required: ["sellerProjectId"],
      additionalProperties: false,
    },
    handler: async (input) => {
      const payload = input as {
        sellerProjectId: string;
        audience?: "admin" | "client";
      };
      const audience: "admin" | "client" = payload.audience ?? "admin";

      const { data: sellerProject, error: spError } = await supabaseAdmin
        .from("seller_projects")
        .select("client_project_id")
        .eq("id", payload.sellerProjectId)
        .maybeSingle();
      if (spError) throw new Error(spError.message);
      if (!sellerProject) throw new Error("Projet vendeur introuvable.");

      const { data: links, error: linksError } = await supabaseAdmin
        .from("project_properties")
        .select("property_id")
        .eq("client_project_id", sellerProject.client_project_id)
        .is("unlinked_at", null);
      if (linksError) throw new Error(linksError.message);

      const propertyIds = Array.from(
        new Set(
          ((links ?? []) as Array<{ property_id: string }>).map((r) => r.property_id)
        )
      );

      const allVisits: unknown[] = [];
      for (const propertyId of propertyIds) {
        const visits =
          audience === "client"
            ? await listVisitsForProperty(propertyId, "client")
            : await listVisitsForProperty(propertyId, "admin");
        for (const v of visits) {
          allVisits.push({ propertyId, ...v });
        }
      }

      return { visits: allVisits, count: allVisits.length, audience };
    },
  },
];
