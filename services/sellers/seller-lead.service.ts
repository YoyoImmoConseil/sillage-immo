import { supabaseAdmin } from "@/lib/supabase/admin";
import { sanitizeAuditInput } from "@/lib/audit/sanitize";
import { emitDomainEvent } from "@/lib/events/domain-events";
import {
  ensureContactIdentity,
  normalizeEmail,
  normalizePhone,
} from "@/services/contacts/contact-identity.service";
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

export const hydrateSellerLeadFromCapture = async (input: {
  sellerLeadId: string;
  fullName?: string;
  email: string;
  phone?: string;
  propertyType?: string;
  propertyAddress?: string;
  city?: string;
  postalCode?: string;
  timeline?: string;
  occupancyStatus?: string;
  estimatedPrice?: number | null;
  diagnosticsReady?: boolean;
  diagnosticsSupportNeeded?: boolean;
  syndicDocsReady?: boolean;
  syndicSupportNeeded?: boolean;
  message?: string;
  metadata?: Record<string, unknown>;
}) => {
  const email = normalizeEmail(input.email);
  if (!email) throw new Error("Email vendeur invalide.");
  const phone = normalizePhone(input.phone);
  const existingIdentity = await ensureContactIdentity({
    email,
    phone,
    fullName: input.fullName ?? null,
    metadata: {
      source: "seller_lead_capture_refresh",
      seller_lead_id: input.sellerLeadId,
    },
  });
  const { data: currentLead, error: currentLeadError } = await supabaseAdmin
    .from("seller_leads")
    .select("metadata")
    .eq("id", input.sellerLeadId)
    .single();
  if (currentLeadError) throw currentLeadError;

  const nextMetadata = {
    ...(currentLead?.metadata && typeof currentLead.metadata === "object"
      ? (currentLead.metadata as Record<string, unknown>)
      : {}),
    ...(input.metadata ?? {}),
  };

  const { error } = await supabaseAdmin
    .from("seller_leads")
    .update({
      full_name: input.fullName?.trim() || undefined,
      email,
      phone,
      contact_identity_id: existingIdentity?.id ?? null,
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
      metadata: nextMetadata,
    })
    .eq("id", input.sellerLeadId);
  if (error) throw error;
};

const normalizeOptional = (value?: string) => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
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

export type UpsertSellerLeadResult = {
  sellerLeadId: string;
  /** True when a brand-new lead row was inserted. */
  created: boolean;
  /** True when an existing lead (matched by external_id or email) was enriched. */
  merged: boolean;
};

/**
 * Idempotent upsert + identity merge for the integrations rail (SweepBright
 * "Owner" Zaps). Resolution order: external_id, then email. An existing lead
 * is enriched in place and gets the external_id attached the first time
 * (never overwritten). Falls back to createSellerLead when no match exists.
 *
 * This deliberately bypasses createSellerLead's 24h dedupe window: a contact
 * who self-created an estimation weeks earlier must still merge with the
 * incoming SweepBright record on email.
 */
export const upsertSellerLeadFromIntegration = async (
  input: SellerLeadInput & { externalId?: string | null }
): Promise<UpsertSellerLeadResult> => {
  const email = normalizeEmail(input.email);
  if (!email) throw new Error("Email vendeur invalide.");
  const externalId = input.externalId?.trim() || null;

  let existing: { id: string; external_id: string | null } | null = null;
  if (externalId) {
    const { data, error } = await supabaseAdmin
      .from("seller_leads")
      .select("id, external_id")
      .eq("external_id", externalId)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    existing = data ?? null;
  }
  if (!existing) {
    const { data, error } = await supabaseAdmin
      .from("seller_leads")
      .select("id, external_id")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    existing = data ?? null;
  }

  if (existing) {
    await hydrateSellerLeadFromCapture({
      sellerLeadId: existing.id,
      fullName: input.fullName,
      email,
      phone: input.phone,
      propertyType: input.propertyType,
      propertyAddress: input.propertyAddress,
      city: input.city,
      postalCode: input.postalCode,
      timeline: input.timeline,
      occupancyStatus: input.occupancyStatus,
      estimatedPrice: input.estimatedPrice ?? null,
      message: input.message,
      metadata: input.metadata,
    });
    if (externalId && !existing.external_id) {
      await supabaseAdmin
        .from("seller_leads")
        .update({ external_id: externalId })
        .eq("id", existing.id)
        .is("external_id", null);
    }
    return { sellerLeadId: existing.id, created: false, merged: true };
  }

  const result = await createSellerLead(input, {
    actor: "system",
    toolName: "integrations:seller_leads",
  });
  if (result.status === "failed") {
    throw new Error(result.reason);
  }
  if (externalId) {
    await supabaseAdmin
      .from("seller_leads")
      .update({ external_id: externalId })
      .eq("id", result.sellerLeadId)
      .is("external_id", null);
  }
  return {
    sellerLeadId: result.sellerLeadId,
    created: result.status === "created",
    merged: result.status !== "created",
  };
};

export const createSellerLead = async (
  input: SellerLeadInput,
  meta?: SellerLeadExecutionMeta
): Promise<CreateSellerLeadResult> => {
  const email = normalizeEmail(input.email);
  if (!email) {
    return {
      status: "failed",
      reason: "Email vendeur invalide.",
    };
  }
  const phone = normalizePhone(input.phone);
  const propertyAddressNorm = normalizeAddress(input.propertyAddress);
  const postalCode = normalizeOptional(input.postalCode);
  const dedupeStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const fingerprint = computeLeadFingerprint(email, phone, propertyAddressNorm);
  const sourceIdentity =
    input.metadata &&
    typeof input.metadata === "object" &&
    input.metadata.identity &&
    typeof input.metadata.identity === "object"
      ? (input.metadata.identity as Record<string, unknown>)
      : {};
  const metadata = {
    ...(input.metadata ?? {}),
    identity: {
      ...sourceIdentity,
      fingerprint,
      dedupe_window_hours: 24,
      computed_at: new Date().toISOString(),
    },
  };
  const contactIdentity = await ensureContactIdentity({
    email,
    phone,
    fullName: input.fullName,
    metadata: {
      source: input.source ?? "seller_lead",
      capture_kind: "seller_lead",
    },
  });

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
      contact_identity_id: contactIdentity?.id ?? null,
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

  // Multi-source reconciliation (Phase 2): a brand-new estimator lead may
  // describe a property that already has a SweepBright/MyNotary dossier.
  // Queue a suggestion (or auto-link) so the operator can merge instead
  // of ending up with a doublon. Best-effort, never blocks lead capture.
  try {
    const { reconcileEstimatorLead } = await import(
      "@/services/reconciliation/reconcile.service"
    );
    await reconcileEstimatorLead(data.id as string);
  } catch (reconcileError) {
    console.error("[seller-lead] reconciliation failed", reconcileError);
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
