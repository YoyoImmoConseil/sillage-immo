import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type DomainEventName =
  | "seller_lead.created"
  | "seller_lead.scored"
  | "seller_lead.ai_insight_generated";

type EmitDomainEventInput = {
  aggregateType: "seller_lead";
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
