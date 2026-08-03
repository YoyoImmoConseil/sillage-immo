import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Database } from "@/types/db/supabase";

/**
 * Mandate anchor.
 *
 * A property can be re-mandated years later at another price. Anchoring the
 * mandate price on the property alone would make the new mandate inherit the
 * old reference price and skew every published ratio, so the SweepBright
 * mandate number is the business key.
 *
 * At Sillage every exclusive mandate is a "Mandat Sillage" (decision of
 * 3 Aug 2026), which makes `is_exclusive` the perimeter filter of the public
 * register.
 */

type MandateRow = Database["public"]["Tables"]["property_mandates"]["Row"];
type MandateInsert = Database["public"]["Tables"]["property_mandates"]["Insert"];

export type UpsertPropertyMandateInput = {
  propertyId: string;
  mandateNumber: string;
  isExclusive?: boolean | null;
  startDate?: string | null;
  endDate?: string | null;
  vendorPercentage?: number | null;
  vendorFixedFee?: number | null;
  buyerPercentage?: number | null;
  buyerFixedFee?: number | null;
  source?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Upserts the mandate terms. Deliberately never writes `mandate_price_amount`
 * nor `first_published_at`: those are frozen once by `freezeMandatePrice` and
 * an upsert running every 10 minutes would otherwise overwrite them with the
 * current price, which is the very bug this lot fixes.
 */
export const upsertPropertyMandate = async (
  input: UpsertPropertyMandateInput
): Promise<MandateRow> => {
  const mandateNumber = input.mandateNumber.trim();
  if (!mandateNumber) {
    throw new Error("A mandate needs a mandate number.");
  }

  const payload: MandateInsert = {
    property_id: input.propertyId,
    mandate_number: mandateNumber,
    is_exclusive: input.isExclusive ?? null,
    start_date: input.startDate ?? null,
    end_date: input.endDate ?? null,
    vendor_percentage: input.vendorPercentage ?? null,
    vendor_fixed_fee: input.vendorFixedFee ?? null,
    buyer_percentage: input.buyerPercentage ?? null,
    buyer_fixed_fee: input.buyerFixedFee ?? null,
    source: input.source ?? "sweepbright_webhook",
    metadata: input.metadata ?? {},
  };

  const { data, error } = await supabaseAdmin
    .from("property_mandates")
    .upsert(payload, { onConflict: "property_id,mandate_number" })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to upsert property mandate.");
  }
  return data as MandateRow;
};

export const getPropertyMandate = async (input: {
  propertyId: string;
  mandateNumber: string;
}): Promise<MandateRow | null> => {
  const { data, error } = await supabaseAdmin
    .from("property_mandates")
    .select("*")
    .eq("property_id", input.propertyId)
    .eq("mandate_number", input.mandateNumber)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  return (data as MandateRow | null) ?? null;
};

/**
 * Freezes the mandate price — the price observed at the first transition to a
 * public status. Write-once: the filter on `mandate_price_amount is null`
 * guarantees that a later republication, or a fallen agreement putting the
 * property back on the market, can never rewrite the reference. That would
 * happen precisely when the negotiation was hardest, so the guard matters.
 */
export const freezeMandatePrice = async (input: {
  propertyId: string;
  mandateNumber: string;
  amount: number;
  currency?: string | null;
  firstPublishedAt: string;
}): Promise<{ frozen: boolean }> => {
  const { data, error } = await supabaseAdmin
    .from("property_mandates")
    .update({
      mandate_price_amount: Math.round(input.amount),
      mandate_price_currency: input.currency?.trim() || "EUR",
      first_published_at: input.firstPublishedAt,
    })
    .eq("property_id", input.propertyId)
    .eq("mandate_number", input.mandateNumber)
    .is("mandate_price_amount", null)
    .select("id");

  if (error) {
    throw new Error(error.message);
  }
  return { frozen: (data?.length ?? 0) > 0 };
};
