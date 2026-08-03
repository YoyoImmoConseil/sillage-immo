import "server-only";
import { isPublicAvailabilityStatus } from "@/lib/properties/canonical-types";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { SweepBrightEstateData } from "@/types/api/sweepbright";
import { freezeMandatePrice, upsertPropertyMandate } from "./property-mandate.service";
import { getLastPriceEvent, recordPriceEvent } from "./property-price-event.service";
import {
  getFirstPublicStatusEvent,
  getLastStatusEvent,
  recordStatusEvent,
} from "./property-status-event.service";
import {
  decidePriceContext,
  isFirstPublicTransition,
  type PriceEventDecision,
} from "./sweepbright-history.rules";

/**
 * Turns a SweepBright estate into history rows.
 *
 * Kept out of `sweepbright-sync.service.ts` on purpose: that file is the
 * ingestion source of truth and a silent regression there loses mandate data,
 * so its diff is held to a snapshot read plus one call.
 *
 * Every write here is best-effort at the call site: the history must never
 * break the projection.
 */

const SWEEPBRIGHT_SOURCE = "sweepbright";
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type SweepBrightProjectionSnapshot = {
  propertyId: string;
  availabilityStatus: string | null;
  priceAmount: number | null;
};

const asIsoDate = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, 10);
  return ISO_DATE.test(trimmed) ? trimmed : null;
};

const asFiniteNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const asMandateNumber = (value: unknown): string | null => {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
};

/**
 * State of the projection BEFORE the upsert overwrites it. This is the only
 * moment where the previous price and status are still readable.
 */
export const readSweepBrightProjectionSnapshot = async (input: {
  sourceRef: string;
  businessType: "sale" | "rental";
}): Promise<SweepBrightProjectionSnapshot | null> => {
  const { data: property, error: propertyError } = await supabaseAdmin
    .from("properties")
    .select("id, availability_status")
    .eq("source", SWEEPBRIGHT_SOURCE)
    .eq("source_ref", input.sourceRef)
    .maybeSingle();

  if (propertyError) {
    throw new Error(propertyError.message);
  }
  if (!property) return null;

  const { data: listing, error: listingError } = await supabaseAdmin
    .from("property_listings")
    .select("price_amount")
    .eq("property_id", property.id)
    .eq("business_type", input.businessType)
    .maybeSingle();

  if (listingError) {
    throw new Error(listingError.message);
  }

  return {
    propertyId: property.id,
    availabilityStatus: property.availability_status ?? null,
    priceAmount: listing?.price_amount ?? null,
  };
};

/**
 * Journals a SweepBright deletion as a status transition.
 *
 * `estate-deleted` takes a different code path from the projection, so without
 * this the journal would never see a mandate that ended without a sale — which
 * is the denominator of the "share of mandates taken through to a sale"
 * indicator. Missing it would bias the figure upwards.
 */
export const recordSweepBrightDeletionHistory = async (input: {
  properties: Array<{ id: string; previousStatus: string | null }>;
  sourceRef: string;
  occurredAt: string;
  deliveryId?: string | null;
}): Promise<{ recorded: number }> => {
  let recorded = 0;
  for (const property of input.properties) {
    if (property.previousStatus === "deleted") continue;
    const result = await recordStatusEvent({
      propertyId: property.id,
      status: "deleted",
      previousStatus: property.previousStatus,
      isPublic: false,
      occurredAt: input.occurredAt,
      source: "sweepbright_webhook",
      sourceRef: input.sourceRef,
      deliveryId: input.deliveryId ?? null,
      metadata: { event: "estate-deleted" },
    });
    if (result.inserted) recorded += 1;
  }
  return { recorded };
};

export type RecordSweepBrightHistoryResult = {
  mandateNumber: string | null;
  statusRecorded: boolean;
  priceContext: "mandate" | "baseline" | "listing_change" | null;
  mandatePriceFrozen: boolean;
};

export const recordSweepBrightHistory = async (input: {
  estate: SweepBrightEstateData;
  propertyId: string;
  priceAmount: number | null;
  priceCurrency: string | null;
  snapshot: SweepBrightProjectionSnapshot | null;
  /** SweepBright `happened_at`; falls back to now when replaying an old delivery. */
  occurredAt: string;
  deliveryId?: string | null;
}): Promise<RecordSweepBrightHistoryResult> => {
  const { estate, propertyId, occurredAt } = input;
  const status = typeof estate.status === "string" ? estate.status.trim() : "";
  const isPublic = isPublicAvailabilityStatus(estate.status);
  const mandateNumber = asMandateNumber(estate.mandate?.number);
  const commission = estate.agency_commission ?? null;

  if (mandateNumber) {
    await upsertPropertyMandate({
      propertyId,
      mandateNumber,
      isExclusive:
        typeof estate.mandate?.exclusive === "boolean" ? estate.mandate.exclusive : null,
      startDate: asIsoDate(estate.mandate?.start_date),
      endDate: asIsoDate(estate.mandate?.end_date),
      // SweepBright fills the flat root keys and leaves `agency_commission`
      // null on this account; both shapes are probed.
      vendorPercentage:
        asFiniteNumber(estate.vendor_percentage) ??
        asFiniteNumber(commission?.seller_percentage) ??
        asFiniteNumber(commission?.percentage),
      vendorFixedFee:
        asFiniteNumber(estate.vendor_fixed_fee) ??
        asFiniteNumber(commission?.seller_fixed_fee) ??
        asFiniteNumber(commission?.fixed_fee),
      buyerPercentage:
        asFiniteNumber(estate.buyer_percentage) ?? asFiniteNumber(commission?.buyer_percentage),
      buyerFixedFee:
        asFiniteNumber(estate.buyer_fixed_fee) ?? asFiniteNumber(commission?.buyer_fixed_fee),
      metadata: { source_ref: estate.id },
    });
  }

  // ---- Status -------------------------------------------------------------
  const lastStatusEvent = await getLastStatusEvent(propertyId);
  const firstPublicEventBefore = await getFirstPublicStatusEvent(propertyId);

  // Previous status: the journal when it exists, otherwise the projection row
  // as it stood before this sync (pre-journal properties).
  const previousStatus = lastStatusEvent?.status ?? input.snapshot?.availabilityStatus ?? null;

  let statusRecorded = false;
  if (status && previousStatus !== status) {
    const result = await recordStatusEvent({
      propertyId,
      mandateNumber,
      status,
      previousStatus,
      isPublic,
      occurredAt,
      source: "sweepbright_webhook",
      sourceRef: estate.id,
      deliveryId: input.deliveryId ?? null,
    });
    statusRecorded = result.inserted;
  }

  // ---- Price --------------------------------------------------------------
  const firstPublicTransition = isFirstPublicTransition({
    isPublic,
    previousStatus,
    hasFirstPublicEvent: Boolean(firstPublicEventBefore),
  });

  let priceContext: PriceEventDecision = null;
  let mandatePriceFrozen = false;

  if (typeof input.priceAmount === "number" && Number.isFinite(input.priceAmount)) {
    const amount = Math.round(input.priceAmount);
    const lastPriceEvent = await getLastPriceEvent({ propertyId });

    priceContext = decidePriceContext({
      firstPublicTransition,
      lastPriceAmount: lastPriceEvent?.amount ?? null,
      amount,
    });

    if (priceContext) {
      await recordPriceEvent({
        propertyId,
        mandateNumber,
        context: priceContext,
        amount,
        previousAmount: lastPriceEvent?.amount ?? input.snapshot?.priceAmount ?? null,
        currency: input.priceCurrency,
        occurredAt,
        source: "sweepbright_webhook",
        sourceRef: estate.id,
        deliveryId: input.deliveryId ?? null,
        metadata: {
          status,
          is_public: isPublic,
          previous_status: previousStatus,
          ...(priceContext === "mandate" && input.snapshot === null
            ? { inferred_from: "estate_creation" }
            : {}),
        },
      });

      if (priceContext === "mandate" && mandateNumber) {
        const result = await freezeMandatePrice({
          propertyId,
          mandateNumber,
          amount,
          currency: input.priceCurrency,
          firstPublishedAt: occurredAt,
        });
        mandatePriceFrozen = result.frozen;
      }
    }
  }

  return { mandateNumber, statusRecorded, priceContext, mandatePriceFrozen };
};
