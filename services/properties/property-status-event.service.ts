import "server-only";
import { hashValue } from "@/lib/audit/hash";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Database } from "@/types/db/supabase";

/**
 * Append-only status journal.
 *
 * Required by the Sillage definition of the mandate price: "the price at the
 * first transition to a public status". A first transition cannot be detected
 * without recording transitions.
 *
 * It also carries the first indicator of the public register — the share of
 * mandates taken through to a sale — which needs the whole
 * estimation → mandate → available → agreement → sold sequence.
 *
 * `status` is deliberately not constrained: the vocabulary belongs to
 * SweepBright and may gain a value without notice. A CHECK would fail the
 * ingestion on an unknown status, which is exactly the silent data loss this
 * lot exists to prevent.
 */

type StatusEventRow = Database["public"]["Tables"]["property_status_events"]["Row"];
type StatusEventInsert = Database["public"]["Tables"]["property_status_events"]["Insert"];

export type StatusEventSource = StatusEventRow["source"];

const POSTGRES_UNIQUE_VIOLATION = "23505";

export type RecordStatusEventInput = {
  propertyId: string;
  mandateNumber?: string | null;
  status: string;
  previousStatus?: string | null;
  isPublic: boolean;
  occurredAt: string;
  source: StatusEventSource;
  sourceRef?: string | null;
  deliveryId?: string | null;
  metadata?: Record<string, unknown>;
};

export const buildStatusEventDedupeKey = (input: {
  propertyId: string;
  status: string;
  occurredAt: string;
  source: StatusEventSource;
}) =>
  hashValue(
    [
      "status-event",
      input.source,
      input.propertyId,
      input.status,
      input.occurredAt,
    ].join(":")
  );

export const getLastStatusEvent = async (
  propertyId: string
): Promise<StatusEventRow | null> => {
  const { data, error } = await supabaseAdmin
    .from("property_status_events")
    .select("*")
    .eq("property_id", propertyId)
    .order("occurred_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }
  return (data?.[0] as StatusEventRow | undefined) ?? null;
};

/**
 * Earliest transition to a public status, i.e. the moment that fixes the
 * mandate price. Returns null while the property has never been published.
 */
export const getFirstPublicStatusEvent = async (
  propertyId: string
): Promise<StatusEventRow | null> => {
  const { data, error } = await supabaseAdmin
    .from("property_status_events")
    .select("*")
    .eq("property_id", propertyId)
    .eq("is_public", true)
    .order("occurred_at", { ascending: true })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }
  return (data?.[0] as StatusEventRow | undefined) ?? null;
};

export const recordStatusEvent = async (
  input: RecordStatusEventInput
): Promise<{ inserted: boolean; row: StatusEventRow | null }> => {
  const status = input.status.trim();
  if (!status) {
    throw new Error("A status event needs a status.");
  }

  const payload: StatusEventInsert = {
    property_id: input.propertyId,
    mandate_number: input.mandateNumber ?? null,
    status,
    previous_status: input.previousStatus ?? null,
    is_public: input.isPublic,
    occurred_at: input.occurredAt,
    source: input.source,
    source_ref: input.sourceRef ?? null,
    delivery_id: input.deliveryId ?? null,
    dedupe_key: buildStatusEventDedupeKey({
      propertyId: input.propertyId,
      status,
      occurredAt: input.occurredAt,
      source: input.source,
    }),
    metadata: input.metadata ?? {},
  };

  const { data, error } = await supabaseAdmin
    .from("property_status_events")
    .insert(payload)
    .select("*")
    .single();

  if (!error && data) {
    return { inserted: true, row: data as StatusEventRow };
  }
  if (error?.code === POSTGRES_UNIQUE_VIOLATION) {
    return { inserted: false, row: null };
  }
  throw new Error(error?.message ?? "Unable to record status event.");
};
