import { supabaseAdmin } from "@/lib/supabase/admin";
import { sanitizeAuditInput } from "@/lib/audit/sanitize";
import { emitDomainEvent } from "@/lib/events/domain-events";
import { scoreSellerLead } from "./seller-score.service";

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
  metadata?: Record<string, unknown>;
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
      metadata: input.metadata ?? {},
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

  try {
    await emitDomainEvent({
      aggregateType: "seller_lead",
      aggregateId: data.id,
      eventName: "seller_lead.created",
      payload: {
        source: input.source ?? null,
        status: "new",
      },
    });
  } catch {
    // non-blocking: lead creation must not fail on event bus issues
  }

  // Best effort auto-scoring on creation. If scoring fails, lead creation still succeeds.
  try {
    await scoreSellerLead(data.id);
  } catch {
    // no-op
  }

  return {
    status: "created",
    sellerLeadId: data.id,
    auditLogged: !auditResult.error,
  };
};
