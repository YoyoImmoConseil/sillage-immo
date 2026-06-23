import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

export type RecordMarketObservationInput = {
  source?: "loupe" | "manual" | "zapier";
  valuationId?: string | null;
  propertyId?: string | null;
  externalId?: string | null;
  city?: string | null;
  postalCode?: string | null;
  zoneSlug?: string | null;
  neighborhood?: string | null;
  propertyType?: string | null;
  businessType?: "sale" | "rental";
  estimatedPrice?: number | null;
  livingAreaM2?: number | null;
  valuationLow?: number | null;
  valuationHigh?: number | null;
  /**
   * Direct €/m² override. When provided, it takes precedence over the value
   * derived from `estimatedPrice / livingAreaM2` (useful for sources that
   * already publish a price/m² without a total price + area).
   */
  pricePerM2?: number | null;
  currency?: string;
  observedAt?: string;
  rawPayload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

// Pure helper: derive a €/m² from a total price and a living area. Returns
// null when inputs are missing or non-sensical (so callers never persist a
// bogus observation). Extracted for unit testing.
export const computePricePerM2 = (
  totalPrice: number | null | undefined,
  livingAreaM2: number | null | undefined
): number | null => {
  if (
    typeof totalPrice !== "number" ||
    !Number.isFinite(totalPrice) ||
    totalPrice <= 0
  ) {
    return null;
  }
  if (
    typeof livingAreaM2 !== "number" ||
    !Number.isFinite(livingAreaM2) ||
    livingAreaM2 <= 0
  ) {
    return null;
  }
  return Math.round(totalPrice / livingAreaM2);
};

// Persists a market observation. Best-effort by design: returns the row id on
// success or null on failure (callers in hot paths must not break on this).
export const recordMarketObservation = async (
  input: RecordMarketObservationInput
): Promise<{ id: string } | null> => {
  const derivedPricePerM2 = computePricePerM2(
    input.estimatedPrice,
    input.livingAreaM2
  );
  const pricePerM2 =
    typeof input.pricePerM2 === "number" && Number.isFinite(input.pricePerM2)
      ? Math.round(input.pricePerM2)
      : derivedPricePerM2;
  const pricePerM2Low = computePricePerM2(input.valuationLow, input.livingAreaM2);
  const pricePerM2High = computePricePerM2(input.valuationHigh, input.livingAreaM2);

  // Nothing usable to observe — skip silently.
  if (pricePerM2 === null && input.estimatedPrice == null) {
    return null;
  }

  try {
    // Idempotent dedupe on the inbound external id (Zap retries).
    if (input.externalId) {
      const { data: existing } = await supabaseAdmin
        .from("market_observations")
        .select("id")
        .eq("external_id", input.externalId)
        .maybeSingle();
      if (existing?.id) return { id: existing.id };
    }

    const { data, error } = await supabaseAdmin
      .from("market_observations")
      .insert({
        source: input.source ?? "loupe",
        valuation_id: input.valuationId ?? null,
        property_id: input.propertyId ?? null,
        external_id: input.externalId ?? null,
        city: input.city ?? null,
        postal_code: input.postalCode ?? null,
        zone_slug: input.zoneSlug ?? null,
        neighborhood: input.neighborhood ?? null,
        property_type: input.propertyType ?? null,
        business_type: input.businessType ?? "sale",
        price_per_m2: pricePerM2,
        price_per_m2_low: pricePerM2Low,
        price_per_m2_high: pricePerM2High,
        estimated_price:
          typeof input.estimatedPrice === "number"
            ? Math.round(input.estimatedPrice)
            : null,
        living_area_m2: input.livingAreaM2 ?? null,
        currency: input.currency ?? "EUR",
        observed_at: input.observedAt ?? new Date().toISOString(),
        raw_payload: input.rawPayload ?? {},
        metadata: input.metadata ?? {},
      })
      .select("id")
      .single();

    if (error || !data?.id) return null;
    return { id: data.id };
  } catch {
    return null;
  }
};
