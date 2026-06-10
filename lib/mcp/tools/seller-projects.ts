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
  {
    name: "seller_projects.milestones_stats",
    description:
      "Agrège les 4 jalons signés (mandat / offre / compromis / acte) sur une période, en union MyNotary + saisie manuelle (dédupliqué par seller_project).",
    version: "1.0.0",
    inputSchema: {
      type: "object",
      properties: {
        since: { type: "string", format: "date-time" },
        until: { type: "string", format: "date-time" },
        milestones: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "mandate_signed",
              "offer_received",
              "preliminary_sale_signed",
              "deed_signed",
            ],
          },
          maxItems: 4,
        },
      },
      required: ["since", "until"],
      additionalProperties: false,
    },
    handler: async (input) => {
      const payload = input as {
        since: string;
        until: string;
        milestones?: Array<
          | "mandate_signed"
          | "offer_received"
          | "preliminary_sale_signed"
          | "deed_signed"
        >;
      };
      const requested =
        payload.milestones && payload.milestones.length > 0
          ? payload.milestones
          : [
              "mandate_signed" as const,
              "offer_received" as const,
              "preliminary_sale_signed" as const,
              "deed_signed" as const,
            ];

      const columnFor: Record<string, string> = {
        mandate_signed: "mandate_signed_at",
        offer_received: "offer_received_at",
        preliminary_sale_signed: "preliminary_sale_signed_at",
        deed_signed: "deed_signed_at",
      };
      const myNotaryKindFor: Record<string, string | null> = {
        mandate_signed: "mandate",
        offer_received: "purchase_offer",
        preliminary_sale_signed: "preliminary_sale",
        deed_signed: null,
      };

      const results: Record<
        string,
        {
          fromMyNotary: number;
          fromManual: number;
          total: number;
          matchedSellerProjectIds: string[];
        }
      > = {};

      for (const milestone of requested) {
        const column = columnFor[milestone];
        const kind = myNotaryKindFor[milestone];

        const matched = new Set<string>();
        let unmatchedMyNotaryCount = 0;
        if (kind !== null) {
          const { data: docs } = await supabaseAdmin
            .from("mynotary_signed_documents")
            .select("matched_seller_project_id")
            .eq("contract_kind", kind)
            .is("deleted_at", null)
            .gte("signed_at", payload.since)
            .lte("signed_at", payload.until);
          for (const doc of docs ?? []) {
            if (doc.matched_seller_project_id) {
              matched.add(doc.matched_seller_project_id);
            } else {
              unmatchedMyNotaryCount += 1;
            }
          }
        }

        const { data: projects } = await supabaseAdmin
          .from("seller_projects")
          .select("id")
          .not(column, "is", null)
          .gte(column, payload.since)
          .lte(column, payload.until);
        const manualIds = new Set<string>((projects ?? []).map((p) => p.id));

        let total = unmatchedMyNotaryCount;
        for (const pid of manualIds) {
          total += 1;
          matched.delete(pid);
        }
        total += matched.size;

        results[milestone] = {
          fromMyNotary:
            unmatchedMyNotaryCount + matched.size + (manualIds.size - 0),
          fromManual: manualIds.size,
          total,
          matchedSellerProjectIds: Array.from(
            new Set([...manualIds, ...matched])
          ),
        };
      }

      return {
        since: payload.since,
        until: payload.until,
        milestones: results,
      };
    },
  },
];
