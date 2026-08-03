import "server-only";
import { hashValue } from "@/lib/audit/hash";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Database } from "@/types/db/supabase";

/**
 * Append-only price journal.
 *
 * The SweepBright projection upserts `property_listings`, so every sync
 * overwrites the previous price with no trace. This journal is the only place
 * where the chronology survives, and it is what the analytics views and the
 * public sales register read.
 *
 * Two invariants, both load-bearing:
 *   - rows are never updated nor deleted;
 *   - `occurred_at` is the business date of the event, `recorded_at` the date we
 *     observed it. Collapsing them would make any backfill lie about timing.
 */

type PriceEventRow = Database["public"]["Tables"]["property_price_events"]["Row"];
type PriceEventInsert = Database["public"]["Tables"]["property_price_events"]["Insert"];

export type PriceEventContext = PriceEventRow["context"];
export type PriceEventSource = PriceEventRow["source"];

const POSTGRES_UNIQUE_VIOLATION = "23505";

export type RecordPriceEventInput = {
  propertyId?: string | null;
  sellerProjectId?: string | null;
  mandateNumber?: string | null;
  context: PriceEventContext;
  amount: number;
  previousAmount?: number | null;
  currency?: string | null;
  /** Business date of the event (webhook `happened_at`, offer date, deed date). */
  occurredAt: string;
  source: PriceEventSource;
  sourceRef?: string | null;
  deliveryId?: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * Idempotency key. A plain unique constraint on the natural columns would not
 * do: `property_id` is nullable (an in-person valuation precedes the
 * SweepBright estate) and two NULLs are distinct in PostgreSQL, so replays
 * would duplicate. The delivery queue allows 5 attempts and the cron replays
 * every 10 minutes, so this is not a theoretical concern.
 */
export const buildPriceEventDedupeKey = (input: {
  propertyId?: string | null;
  sellerProjectId?: string | null;
  context: PriceEventContext;
  amount: number;
  occurredAt: string;
  source: PriceEventSource;
}) =>
  hashValue(
    [
      "price-event",
      input.source,
      input.context,
      input.propertyId ?? "no-property",
      input.sellerProjectId ?? "no-project",
      String(input.amount),
      input.occurredAt,
    ].join(":")
  );

/** Most recent event of a given context, used to skip unchanged amounts. */
export const getLastPriceEvent = async (input: {
  propertyId: string;
  context?: PriceEventContext;
}): Promise<PriceEventRow | null> => {
  let query = supabaseAdmin
    .from("property_price_events")
    .select("*")
    .eq("property_id", input.propertyId);

  if (input.context) {
    query = query.eq("context", input.context);
  }

  const { data, error } = await query
    .order("occurred_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }
  return (data?.[0] as PriceEventRow | undefined) ?? null;
};

/** True when the property already carries at least one price event. */
export const hasPriceEvents = async (propertyId: string) => {
  const { count, error } = await supabaseAdmin
    .from("property_price_events")
    .select("id", { count: "exact", head: true })
    .eq("property_id", propertyId);

  if (error) {
    throw new Error(error.message);
  }
  return (count ?? 0) > 0;
};

/**
 * Inserts one event. A duplicate (same dedupe key) is a no-op, not an error:
 * replaying a delivery must be safe.
 */
export const recordPriceEvent = async (
  input: RecordPriceEventInput
): Promise<{ inserted: boolean; row: PriceEventRow | null }> => {
  if (!input.propertyId && !input.sellerProjectId) {
    throw new Error("A price event needs either a property or a seller project.");
  }
  if (!Number.isFinite(input.amount)) {
    throw new Error("A price event needs a finite amount.");
  }

  const payload: PriceEventInsert = {
    property_id: input.propertyId ?? null,
    seller_project_id: input.sellerProjectId ?? null,
    mandate_number: input.mandateNumber ?? null,
    context: input.context,
    amount: Math.round(input.amount),
    previous_amount:
      typeof input.previousAmount === "number" && Number.isFinite(input.previousAmount)
        ? Math.round(input.previousAmount)
        : null,
    currency: input.currency?.trim() || "EUR",
    occurred_at: input.occurredAt,
    source: input.source,
    source_ref: input.sourceRef ?? null,
    delivery_id: input.deliveryId ?? null,
    dedupe_key: buildPriceEventDedupeKey({
      propertyId: input.propertyId,
      sellerProjectId: input.sellerProjectId,
      context: input.context,
      amount: Math.round(input.amount),
      occurredAt: input.occurredAt,
      source: input.source,
    }),
    metadata: input.metadata ?? {},
  };

  const { data, error } = await supabaseAdmin
    .from("property_price_events")
    .insert(payload)
    .select("*")
    .single();

  if (!error && data) {
    return { inserted: true, row: data as PriceEventRow };
  }
  if (error?.code === POSTGRES_UNIQUE_VIOLATION) {
    return { inserted: false, row: null };
  }
  throw new Error(error?.message ?? "Unable to record price event.");
};
