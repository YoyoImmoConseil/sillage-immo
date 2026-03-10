import { supabaseAdmin } from "@/lib/supabase/admin";
import { sanitizeAuditInput } from "@/lib/audit/sanitize";
import { emitDomainEvent } from "@/lib/events/domain-events";
import { scoreSellerLead } from "./seller-score.service";
import { createHash } from "crypto";

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

export type SellerLeadExecutionMeta = {
  requestId?: string;
  actor?: "system" | "anonymous" | "user";
  toolName?: string;
  toolVersion?: string;
};

export type CreateSellerLeadResult =
  | { status: "created"; sellerLeadId: string; auditLogged: boolean }
  | { status: "reused"; sellerLeadId: string; auditLogged: boolean; duplicateDetected: true }
  | {
      status: "duplicate_blocked";
      sellerLeadId: string;
      auditLogged: boolean;
      reason: string;
      duplicateDetected: true;
    }
  | { status: "failed"; reason: string };

const normalizeOptional = (value?: string) => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

const normalizePhone = (value?: string) => {
  const digits = (value ?? "").replace(/[^\d+]/g, "").trim();
  return digits.length > 0 ? digits : null;
};

const normalizeAddress = (value?: string) => {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
};

const computeLeadFingerprint = (email: string, phone: string | null, address: string) => {
  const source = [email.trim().toLowerCase(), phone ?? "", address.trim().toLowerCase()].join("|");
  return createHash("sha256").update(source).digest("hex");
};

export const createSellerLead = async (
  input: SellerLeadInput,
  meta?: SellerLeadExecutionMeta
): Promise<CreateSellerLeadResult> => {
  const email = input.email.trim().toLowerCase();
  const phone = normalizePhone(input.phone);
  const propertyAddressNorm = normalizeAddress(input.propertyAddress);
  const postalCode = normalizeOptional(input.postalCode);
  const dedupeStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const fingerprint = computeLeadFingerprint(email, phone, propertyAddressNorm);
  const metadata = {
    ...(input.metadata ?? {}),
    identity: {
      fingerprint,
      dedupe_window_hours: 24,
      computed_at: new Date().toISOString(),
    },
  };

  const { data: recentLeads, error: dedupeError } = await supabaseAdmin
    .from("seller_leads")
    .select("id, email, phone, property_address, postal_code, status, created_at")
    .eq("email", email)
    .gte("created_at", dedupeStart)
    .order("created_at", { ascending: false })
    .limit(25);

  if (dedupeError) {
    return {
      status: "failed",
      reason: dedupeError.message,
    };
  }

  const duplicate = (recentLeads ?? []).find((lead) => {
    const samePhone = phone && normalizePhone(lead.phone ?? undefined) === phone;
    const sameAddress =
      propertyAddressNorm.length > 0 &&
      normalizeAddress(lead.property_address ?? undefined) === propertyAddressNorm &&
      (postalCode ? (lead.postal_code ?? null) === postalCode : true);
    return Boolean(samePhone || sameAddress);
  });

  if (duplicate?.id) {
    const duplicateStatus = typeof duplicate.status === "string" ? duplicate.status : "new";
    const shouldBlock = !["new", "contacted"].includes(duplicateStatus);

    const duplicateAudit = await supabaseAdmin.from("audit_log").insert({
      actor_type: meta?.actor ?? "anonymous",
      actor_id: null,
      action: "seller_lead_duplicate_detected",
      entity_type: "seller_lead",
      entity_id: duplicate.id,
      data: {
        execution: {
          request_id: meta?.requestId ?? null,
          tool_name: meta?.toolName ?? null,
          tool_version: meta?.toolVersion ?? null,
        },
        input: sanitizeAuditInput({
          email,
          phone: input.phone ?? null,
          propertyAddress: input.propertyAddress ?? null,
          postalCode: input.postalCode ?? null,
          source: input.source ?? null,
        }),
      },
    });

    try {
      await emitDomainEvent({
        aggregateType: "seller_lead",
        aggregateId: duplicate.id,
        eventName: "seller_lead.duplicate_detected",
        payload: {
          email,
          source: input.source ?? null,
        },
      });
    } catch {
      // non-blocking
    }

    if (shouldBlock) {
      return {
        status: "duplicate_blocked",
        sellerLeadId: duplicate.id as string,
        auditLogged: !duplicateAudit.error,
        reason: `Lead deja existant avec statut ${duplicateStatus}, creation bloquee.`,
        duplicateDetected: true,
      };
    }

    return {
      status: "reused",
      sellerLeadId: duplicate.id as string,
      auditLogged: !duplicateAudit.error,
      duplicateDetected: true,
    };
  }

  const { data, error } = await supabaseAdmin
    .from("seller_leads")
    .insert({
      full_name: input.fullName.trim(),
      email,
      phone,
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
      metadata,
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
    actor_type: meta?.actor ?? "anonymous",
    actor_id: null,
    action: "seller_lead_created",
    entity_type: "seller_lead",
    entity_id: data.id,
    data: {
      execution: {
        request_id: meta?.requestId ?? null,
        tool_name: meta?.toolName ?? null,
        tool_version: meta?.toolVersion ?? null,
      },
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
