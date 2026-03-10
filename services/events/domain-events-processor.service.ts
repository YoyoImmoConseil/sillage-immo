import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

type DomainEventRow = {
  id: string;
  aggregate_type: string;
  aggregate_id: string;
  event_name: string;
  event_version: number;
  payload: Record<string, unknown>;
  attempts: number;
};

type ProcessDomainEventsResult = {
  scanned: number;
  processed: number;
  failed: number;
  retried: number;
};

const MAX_ATTEMPTS = 5;

const safeErrorMessage = (error: unknown) => {
  const raw = error instanceof Error ? error.message : "Unknown domain event error.";
  return raw.slice(0, 500);
};

const logProcessedEvent = async (event: DomainEventRow, status: "processed" | "failed") => {
  await supabaseAdmin.from("audit_log").insert({
    actor_type: "system",
    actor_id: null,
    action: "domain_event_processed",
    entity_type: event.aggregate_type,
    entity_id: event.aggregate_id,
    data: {
      event_id: event.id,
      event_name: event.event_name,
      event_version: event.event_version,
      status,
    },
  });
};

const handleDomainEvent = async (event: DomainEventRow) => {
  switch (event.event_name) {
    case "seller_lead.created":
    case "seller_lead.duplicate_detected":
    case "seller_lead.scored":
    case "seller_lead.ai_insight_generated":
    case "seller_lead.chat_message_logged":
      await logProcessedEvent(event, "processed");
      return;
    default:
      throw new Error(`Unsupported domain event: ${event.event_name}`);
  }
};

const updateEventSuccess = async (eventId: string, attempts: number) => {
  const { error } = await supabaseAdmin
    .from("domain_events")
    .update({
      status: "processed",
      attempts,
      last_error: null,
      published_at: new Date().toISOString(),
    })
    .eq("id", eventId);
  if (error) throw new Error(error.message);
};

const updateEventFailure = async (
  eventId: string,
  attempts: number,
  message: string,
  terminal: boolean
) => {
  const { error } = await supabaseAdmin
    .from("domain_events")
    .update({
      status: terminal ? "failed" : "pending",
      attempts,
      last_error: message,
    })
    .eq("id", eventId);
  if (error) throw new Error(error.message);
};

export const processPendingDomainEvents = async (
  limit = 25
): Promise<ProcessDomainEventsResult> => {
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(Math.trunc(limit), 1), 100) : 25;

  const { data, error } = await supabaseAdmin
    .from("domain_events")
    .select("id, aggregate_type, aggregate_id, event_name, event_version, payload, attempts")
    .eq("status", "pending")
    .lt("attempts", MAX_ATTEMPTS)
    .order("created_at", { ascending: true })
    .limit(safeLimit);

  if (error) throw new Error(error.message);

  const events = (data ?? []) as DomainEventRow[];
  const result: ProcessDomainEventsResult = {
    scanned: events.length,
    processed: 0,
    failed: 0,
    retried: 0,
  };

  for (const event of events) {
    const nextAttempts = (event.attempts ?? 0) + 1;
    try {
      await handleDomainEvent(event);
      await updateEventSuccess(event.id, nextAttempts);
      result.processed += 1;
    } catch (error) {
      const message = safeErrorMessage(error);
      const terminal = nextAttempts >= MAX_ATTEMPTS;
      await updateEventFailure(event.id, nextAttempts, message, terminal);
      if (terminal) {
        try {
          await logProcessedEvent(event, "failed");
        } catch {
          // no-op
        }
        result.failed += 1;
      } else {
        result.retried += 1;
      }
    }
  }

  return result;
};

export const getDomainEventQueueStats = async () => {
  const countByStatus = async (status: "pending" | "processed" | "failed") => {
    const { count, error } = await supabaseAdmin
      .from("domain_events")
      .select("id", { count: "exact", head: true })
      .eq("status", status);
    if (error) throw new Error(error.message);
    return count ?? 0;
  };

  const [pending, processed, failed] = await Promise.all([
    countByStatus("pending"),
    countByStatus("processed"),
    countByStatus("failed"),
  ]);

  return { pending, processed, failed };
};
