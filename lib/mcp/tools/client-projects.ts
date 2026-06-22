import type { ToolDefinition } from "../types";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const clientProjectsTools: ToolDefinition<unknown, unknown>[] = [
  {
    name: "client_projects.list",
    readsPii: true,
    description:
      "Liste les client_projects filtres par type et status (admin: tout, sans RLS).",
    version: "1.0.0",
    inputSchema: {
      type: "object",
      properties: {
        projectType: {
          type: "string",
          enum: ["seller", "buyer", "rental_management"],
        },
        status: { type: "string" },
        limit: { type: "number", minimum: 1, maximum: 100 },
      },
      additionalProperties: false,
    },
    handler: async (input) => {
      const payload = (input ?? {}) as {
        projectType?: string;
        status?: string;
        limit?: number;
      };
      const limit = Math.min(Math.max(payload.limit ?? 50, 1), 100);

      let query = supabaseAdmin
        .from("client_projects")
        .select(
          "id, client_profile_id, project_type, status, title, created_from, primary_admin_profile_id, created_at, updated_at"
        )
        .order("updated_at", { ascending: false })
        .limit(limit);

      if (payload.projectType) query = query.eq("project_type", payload.projectType);
      if (payload.status) query = query.eq("status", payload.status);

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return { items: data ?? [], count: data?.length ?? 0 };
    },
  },
  {
    name: "client_projects.get",
    readsPii: true,
    description:
      "Retourne un client_project + son seller_project / buyer_project + properties liees + co-owners.",
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
      const { clientProjectId } = input as { clientProjectId: string };

      const [
        projectResult,
        sellerProjectResult,
        buyerProjectResult,
        membershipsResult,
        propertyLinksResult,
      ] = await Promise.all([
        supabaseAdmin
          .from("client_projects")
          .select("*")
          .eq("id", clientProjectId)
          .maybeSingle(),
        supabaseAdmin
          .from("seller_projects")
          .select("*")
          .eq("client_project_id", clientProjectId)
          .maybeSingle(),
        supabaseAdmin
          .from("buyer_projects")
          .select("*")
          .eq("client_project_id", clientProjectId)
          .maybeSingle(),
        supabaseAdmin
          .from("client_project_clients")
          .select("client_profile_id, role, created_at")
          .eq("client_project_id", clientProjectId)
          .is("removed_at", null),
        supabaseAdmin
          .from("project_properties")
          .select("property_id, relationship_type, is_primary")
          .eq("client_project_id", clientProjectId)
          .is("unlinked_at", null),
      ]);
      if (projectResult.error) throw new Error(projectResult.error.message);
      if (sellerProjectResult.error)
        throw new Error(sellerProjectResult.error.message);
      if (buyerProjectResult.error)
        throw new Error(buyerProjectResult.error.message);
      if (membershipsResult.error)
        throw new Error(membershipsResult.error.message);
      if (propertyLinksResult.error)
        throw new Error(propertyLinksResult.error.message);

      return {
        project: projectResult.data ?? null,
        sellerProject: sellerProjectResult.data ?? null,
        buyerProject: buyerProjectResult.data ?? null,
        memberships: membershipsResult.data ?? [],
        propertyLinks: propertyLinksResult.data ?? [],
      };
    },
  },
  {
    name: "client_projects.timeline",
    readsPii: true,
    description:
      "Lit la timeline (client_project_events) d'un projet. audience=client filtre visible_to_client.",
    version: "1.0.0",
    inputSchema: {
      type: "object",
      properties: {
        clientProjectId: { type: "string", format: "uuid" },
        audience: { type: "string", enum: ["admin", "client"] },
        limit: { type: "number", minimum: 1, maximum: 200 },
      },
      required: ["clientProjectId"],
      additionalProperties: false,
    },
    handler: async (input) => {
      const payload = input as {
        clientProjectId: string;
        audience?: "admin" | "client";
        limit?: number;
      };
      const limit = Math.min(Math.max(payload.limit ?? 100, 1), 200);
      const audience = payload.audience ?? "admin";

      let query = supabaseAdmin
        .from("client_project_events")
        .select(
          "id, created_at, event_name, event_category, visible_to_client, actor_type, actor_id, payload, seller_project_id"
        )
        .eq("client_project_id", payload.clientProjectId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (audience === "client") {
        query = query.eq("visible_to_client", true);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return { items: data ?? [], count: data?.length ?? 0, audience };
    },
  },
];
