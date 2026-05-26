import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type DomainEventName =
  | "seller_lead.created"
  | "seller_lead.duplicate_detected"
  | "seller_lead.scored"
  | "seller_lead.ai_insight_generated"
  | "seller_lead.chat_message_logged"
  | "buyer_lead.created"
  | "buyer_lead.search_profile_updated"
  | "property_listing.published"
  | "property_listing.unpublished"
  | "seller_project.status_changed"
  | "seller_project.advisor_assigned"
  | "ai_conversation.turn_appended"
  | "ai_conversation.closed"
  | "gdpr_deletion_requested"
  | "gdpr_deletion_executed"
  | "mynotary.mandate_signed"
  | "mynotary.offer_signed"
  | "mynotary.preliminary_sale_signed"
  | "mynotary.document_soft_deleted";

export type DomainAggregateType =
  | "seller_lead"
  | "buyer_lead"
  | "property_listing"
  | "seller_project"
  | "ai_conversation"
  | "gdpr_request"
  | "mynotary_document";

type EmitDomainEventInput = {
  aggregateType: DomainAggregateType;
  aggregateId: string;
  eventName: DomainEventName;
  payload?: Record<string, unknown>;
  eventVersion?: number;
};

export const emitDomainEvent = async (input: EmitDomainEventInput) => {
  const { error } = await supabaseAdmin.from("domain_events").insert({
    aggregate_type: input.aggregateType,
    aggregate_id: input.aggregateId,
    event_name: input.eventName,
    event_version: input.eventVersion ?? 1,
    payload: input.payload ?? {},
    status: "pending",
  });

  if (error) {
    throw new Error(error.message);
  }
};
