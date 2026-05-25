import type { ToolDefinition } from "../types";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { emitClientProjectEvent } from "@/services/clients/client-project.service";
import { assignAdvisorToSellerProject } from "@/services/clients/seller-project.service";
import { emitDomainEvent } from "@/lib/events/domain-events";

const SELLER_PROJECT_STATUSES = [
  "estimation_realisee",
  "a_contacter",
  "rdv_estimation_planifie",
  "estimation_physique_realisee",
  "mandat_en_preparation",
  "mandat_signe",
  "bien_en_commercialisation",
  "bien_sous_offre",
  "bien_vendu",
  "projet_suspendu",
] as const;

export const sellerProjectsTools: ToolDefinition<unknown, unknown>[] = [
  {
    name: "seller_projects.advance_status",
    description:
      "Change le project_status d'un seller_project (transition controlee + event timeline).",
    version: "1.0.0",
    inputSchema: {
      type: "object",
      properties: {
        sellerProjectId: { type: "string", format: "uuid" },
        nextStatus: {
          type: "string",
          enum: [...SELLER_PROJECT_STATUSES],
        },
        reason: { type: "string" },
      },
      required: ["sellerProjectId", "nextStatus"],
      additionalProperties: false,
    },
    handler: async (input, context) => {
      const payload = input as {
        sellerProjectId: string;
        nextStatus: (typeof SELLER_PROJECT_STATUSES)[number];
        reason?: string;
      };

      const { data: current, error: currentError } = await supabaseAdmin
        .from("seller_projects")
        .select("id, client_project_id, project_status")
        .eq("id", payload.sellerProjectId)
        .maybeSingle();
      if (currentError) throw new Error(currentError.message);
      if (!current) throw new Error("Projet vendeur introuvable.");

      const previousStatus = current.project_status;
      if (previousStatus === payload.nextStatus) {
        return {
          sellerProjectId: payload.sellerProjectId,
          previousStatus,
          nextStatus: payload.nextStatus,
          changed: false,
        };
      }

      const { error: updateError } = await supabaseAdmin
        .from("seller_projects")
        .update({
          project_status: payload.nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payload.sellerProjectId);
      if (updateError) throw new Error(updateError.message);

      try {
        await emitClientProjectEvent({
          clientProjectId: current.client_project_id,
          sellerProjectId: payload.sellerProjectId,
          eventName: "seller_project.status_changed",
          eventCategory: "status",
          actorType: context.actor,
          actorId: context.actorId ?? undefined,
          payload: {
            previousStatus,
            nextStatus: payload.nextStatus,
            reason: payload.reason ?? null,
          },
        });
      } catch {
        // non-blocking timeline
      }

      try {
        await emitDomainEvent({
          aggregateType: "seller_project",
          aggregateId: payload.sellerProjectId,
          eventName: "seller_project.status_changed",
          payload: {
            previousStatus,
            nextStatus: payload.nextStatus,
            reason: payload.reason ?? null,
          },
        });
      } catch {
        // non-blocking outbox
      }

      return {
        sellerProjectId: payload.sellerProjectId,
        previousStatus,
        nextStatus: payload.nextStatus,
        changed: true,
      };
    },
  },
  {
    name: "seller_projects.assign_advisor",
    description:
      "Assigne un admin_profile a un seller_project (historise dans seller_project_advisor_history).",
    version: "1.0.0",
    inputSchema: {
      type: "object",
      properties: {
        sellerProjectId: { type: "string", format: "uuid" },
        adminProfileId: { type: "string", format: "uuid" },
        reason: { type: "string" },
      },
      required: ["sellerProjectId", "adminProfileId"],
      additionalProperties: false,
    },
    handler: async (input, context) => {
      const payload = input as {
        sellerProjectId: string;
        adminProfileId: string;
        reason?: string;
      };

      await assignAdvisorToSellerProject(
        payload.sellerProjectId,
        payload.adminProfileId,
        {
          assignedByAdminId: context.actorId ?? undefined,
          reason: payload.reason,
        }
      );

      try {
        await emitDomainEvent({
          aggregateType: "seller_project",
          aggregateId: payload.sellerProjectId,
          eventName: "seller_project.advisor_assigned",
          payload: {
            adminProfileId: payload.adminProfileId,
            reason: payload.reason ?? null,
          },
        });
      } catch {
        // non-blocking outbox
      }

      return {
        sellerProjectId: payload.sellerProjectId,
        adminProfileId: payload.adminProfileId,
        assigned: true,
      };
    },
  },
];
