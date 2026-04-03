import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

export type CreateValuationRecordInput = {
  clientProjectId?: string | null;
  sellerProjectId?: string | null;
  sellerLeadId?: string | null;
  propertyId?: string | null;
  contactIdentityId?: string | null;
  source: string;
  sourceRef?: string | null;
  provider?: string | null;
  valuationKind?: string;
  status?: string;
  estimatedPrice?: number | null;
  valuationLow?: number | null;
  valuationHigh?: number | null;
  currency?: string;
  valuatedAt?: string;
  rawPayload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export const createValuationRecord = async (input: CreateValuationRecordInput) => {
  const { data, error } = await supabaseAdmin
    .from("valuations")
    .insert({
      client_project_id: input.clientProjectId ?? null,
      seller_project_id: input.sellerProjectId ?? null,
      seller_lead_id: input.sellerLeadId ?? null,
      property_id: input.propertyId ?? null,
      contact_identity_id: input.contactIdentityId ?? null,
      source: input.source,
      source_ref: input.sourceRef ?? null,
      provider: input.provider ?? null,
      valuation_kind: input.valuationKind ?? "seller_estimation",
      status: input.status ?? "completed",
      estimated_price:
        typeof input.estimatedPrice === "number" ? Math.round(input.estimatedPrice) : null,
      valuation_low:
        typeof input.valuationLow === "number" ? Math.round(input.valuationLow) : null,
      valuation_high:
        typeof input.valuationHigh === "number" ? Math.round(input.valuationHigh) : null,
      currency: input.currency ?? "EUR",
      valuated_at: input.valuatedAt ?? new Date().toISOString(),
      raw_payload: input.rawPayload ?? {},
      metadata: input.metadata ?? {},
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !data?.id) {
    throw new Error(error?.message ?? "Impossible d'enregistrer la valuation.");
  }

  if (input.sellerProjectId) {
    const { error: updateError } = await supabaseAdmin
      .from("seller_projects")
      .update({
        latest_valuation_id: data.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.sellerProjectId);
    if (updateError) throw updateError;
  }

  return { id: data.id };
};

export const getLatestValuationForSellerProject = async (input: {
  sellerProjectId?: string | null;
  sellerLeadId?: string | null;
}) => {
  let query = supabaseAdmin
    .from("valuations")
    .select(
      "id, estimated_price, valuation_low, valuation_high, provider, valuated_at, source, raw_payload"
    )
    .order("valuated_at", { ascending: false })
    .limit(1);

  if (input.sellerProjectId) {
    query = query.eq("seller_project_id", input.sellerProjectId);
  } else if (input.sellerLeadId) {
    query = query.eq("seller_lead_id", input.sellerLeadId);
  } else {
    return null;
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
};
