import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  priceContextForOccurrence,
  type OfferOccurrence,
  type ZapierOfferPayload,
} from "@/lib/sweepbright/offer-payload-schema";
import type { Database } from "@/types/db/supabase";
import { getLatestPropertyMandate } from "./property-mandate.service";
import { recordPriceEvent } from "./property-price-event.service";

/**
 * Persistence of SweepBright offers.
 *
 * The row carries the current state of an offer (upsert on the SweepBright
 * offer id, since `Offer Changed` fires on every modification); the chronology
 * lives in `property_price_events`.
 */

type OfferRow = Database["public"]["Tables"]["property_offers"]["Row"];
type OfferInsert = Database["public"]["Tables"]["property_offers"]["Insert"];

const toTimestamp = (value: string | null): string | null => {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value.trim());
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export type UpsertOfferResult = {
  offer: OfferRow;
  created: boolean;
  priceEventContext: "offer" | "agreement" | null;
  priceEventRecorded: boolean;
};

export const upsertOfferFromZapierPayload = async (input: {
  payload: ZapierOfferPayload;
  propertyId: string;
  externalOfferId: string;
  occurrence: OfferOccurrence;
}): Promise<UpsertOfferResult> => {
  const { payload, propertyId, externalOfferId, occurrence } = input;
  const offer = payload.offer;
  const money = payload.financials;

  const { data: existing } = await supabaseAdmin
    .from("property_offers")
    .select("id")
    .eq("external_offer_id", externalOfferId)
    .maybeSingle();

  const row: OfferInsert = {
    property_id: propertyId,
    external_offer_id: externalOfferId,
    parent_external_offer_id: offer.parent_id,
    company_id: offer.company_id,
    status: offer.status,
    reason: payload.reason,
    notes: offer.notes,
    currency: money.currency?.trim() || "EUR",
    transaction_amount: money.transaction_amount,
    buyer_gross_amount: money.buyer_gross_amount,
    owner_net_amount: money.owner_net_amount,
    total_agency_fee: money.total_agency_fee,
    buyer_total_fee: money.buyer_total_fee,
    buyer_fee_fixed: money.buyer_fee_fixed,
    buyer_fee_percentage: money.buyer_fee_percentage,
    owner_total_fee: money.owner_total_fee,
    owner_fee_fixed: money.owner_fee_fixed,
    owner_fee_percentage: money.owner_fee_percentage,
    source_created_at: toTimestamp(offer.created_at),
    source_updated_at: toTimestamp(offer.updated_at),
    valid_until: toTimestamp(offer.valid_until),
    accepted_at: toTimestamp(offer.accepted_at),
    refused_at: toTimestamp(offer.refused_at),
    cancelled_at: toTimestamp(offer.cancelled_at),
    archived_at: toTimestamp(offer.archived_at),
    occurred_at: occurrence.at,
    occurrence_kind: occurrence.kind,
    source: "zapier",
    raw_payload: payload as unknown as Record<string, unknown>,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from("property_offers")
    .upsert(row, { onConflict: "external_offer_id" })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to upsert offer.");
  }

  const priceEventContext = priceContextForOccurrence(occurrence.kind);
  let priceEventRecorded = false;

  // The offered price is the buyer's gross amount: what the buyer commits to
  // pay, fees included. `owner_net_amount` would understate the negotiation.
  if (priceEventContext && typeof money.buyer_gross_amount === "number") {
    const mandate = await getLatestPropertyMandate(propertyId);
    const result = await recordPriceEvent({
      propertyId,
      mandateNumber: mandate?.mandate_number ?? null,
      context: priceEventContext,
      amount: money.buyer_gross_amount,
      currency: money.currency,
      occurredAt: occurrence.at,
      source: "zapier",
      sourceRef: externalOfferId,
      metadata: {
        offer_status: offer.status,
        offer_reason: payload.reason,
        occurrence_kind: occurrence.kind,
        owner_net_amount: money.owner_net_amount,
        total_agency_fee: money.total_agency_fee,
        parent_offer_id: offer.parent_id,
      },
    });
    priceEventRecorded = result.inserted;
  }

  return {
    offer: data as OfferRow,
    created: !existing,
    priceEventContext,
    priceEventRecorded,
  };
};
