import { supabaseAdmin } from "@/lib/supabase/admin";
import { sanitizeAuditInput } from "@/lib/audit/sanitize";

export type SellerLeadInput = {
  fullName: string;
  email: string;
  phone?: string;
  propertyType?: string;
  propertyAddress?: string;
  city?: string;
  postalCode?: string;
  timeline?: string;
  occupancyStatus?: string;
  estimatedPrice?: number;
  diagnosticsReady?: boolean;
  diagnosticsSupportNeeded?: boolean;
  syndicDocsReady?: boolean;
  syndicSupportNeeded?: boolean;
  message?: string;
  source?: string;
};

export type CreateSellerLeadResult =
  | { status: "created"; sellerLeadId: string; auditLogged: boolean }
  | { status: "failed"; reason: string };

const normalizeOptional = (value?: string) => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

export const createSellerLead = async (
  input: SellerLeadInput
): Promise<CreateSellerLeadResult> => {
  const { data, error } = await supabaseAdmin
    .from("seller_leads")
    .insert({
      full_name: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      phone: normalizeOptional(input.phone),
      property_type: normalizeOptional(input.propertyType),
      property_address: normalizeOptional(input.propertyAddress),
      city: normalizeOptional(input.city),
      postal_code: normalizeOptional(input.postalCode),
      timeline: normalizeOptional(input.timeline),
      occupancy_status: normalizeOptional(input.occupancyStatus),
      estimated_price:
        typeof input.estimatedPrice === "number" ? Math.round(input.estimatedPrice) : null,
      diagnostics_ready: input.diagnosticsReady ?? null,
      diagnostics_support_needed: input.diagnosticsSupportNeeded ?? null,
      syndic_docs_ready: input.syndicDocsReady ?? null,
      syndic_support_needed: input.syndicSupportNeeded ?? null,
      message: normalizeOptional(input.message),
      source: normalizeOptional(input.source),
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    return {
      status: "failed",
      reason: error?.message ?? "Insertion failed.",
    };
  }

  const auditResult = await supabaseAdmin.from("audit_log").insert({
    actor_type: "anonymous",
    actor_id: null,
    action: "seller_lead_created",
    entity_type: "seller_lead",
    entity_id: data.id,
    data: {
      input: sanitizeAuditInput({
        fullName: input.fullName,
        email: input.email,
        phone: input.phone ?? null,
        propertyType: input.propertyType ?? null,
        propertyAddress: input.propertyAddress ?? null,
        city: input.city ?? null,
        postalCode: input.postalCode ?? null,
        timeline: input.timeline ?? null,
        occupancyStatus: input.occupancyStatus ?? null,
        estimatedPrice: input.estimatedPrice ?? null,
        diagnosticsReady: input.diagnosticsReady ?? null,
        diagnosticsSupportNeeded: input.diagnosticsSupportNeeded ?? null,
        syndicDocsReady: input.syndicDocsReady ?? null,
        syndicSupportNeeded: input.syndicSupportNeeded ?? null,
        source: input.source ?? null,
      }),
    },
  });

  return {
    status: "created",
    sellerLeadId: data.id,
    auditLogged: !auditResult.error,
  };
};
