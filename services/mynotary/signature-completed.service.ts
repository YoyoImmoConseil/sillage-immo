import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { emitDomainEvent } from "@/lib/events/domain-events";
import {
  classifyContractModel,
  type MyNotaryContractKind,
  type MyNotaryFile,
  type MyNotarySignatureCompletedPayload,
  type MyNotarySigner,
} from "@/lib/mynotary/types";
import { matchSignedDocument } from "./auto-match.service";
import { archiveSignedDocument } from "./archive-signed-document.service";
import type { OperationEnrichment } from "./operation-enrichment.service";

// Processes a MyNotary `signature_completed` payload (also reused by
// the backfill cron). The service is split into 3 deterministic steps
// so it can be unit-tested without a live MyNotary endpoint:
//
//   1. classify  — derive our internal `contract_kind` from the
//                  MyNotary contractType string (mandate /
//                  purchase_offer / preliminary_sale or null).
//   2. upsert    — insert/replace one row in mynotary_signed_documents
//                  (idempotent on mynotary_contract_id UNIQUE).
//   3. attach    — run auto-match against seller_leads / properties and
//                  store the resulting confidence + method. When the
//                  document is a mandate and confidence ≥ 0.7, also
//                  promote seller_projects.mandate_status='signed' and
//                  set mandate_signed_at to the MyNotary signed_at.
//
// The function returns the persisted document id so the caller (the
// webhook handler / the backfill script) can log it.

export type ProcessSignatureCompletedInput = {
  payload: MyNotarySignatureCompletedPayload;
  // Optional address shortcut: backfill via /register-entries can
  // already carry the property address — we forward it to the
  // matcher to avoid an extra API call.
  inlineAddress?: string | null;
  // Optional list of seller names parsed from /register-entries'
  // free-form `mandants` field. The matcher uses them as a fallback
  // when no signer email is available (typical for the backfill
  // path).
  inlineSellerNames?: string[] | null;
  // Optional verbatim register entry (only set on the backfill
  // path). We persist it inside `raw_payload.entry` so downstream
  // re-enrichment can read fields we don't model yet (e.g.
  // `legalOperationLabel`, `dateFinMandat`) without re-hitting the
  // MyNotary API.
  inlineRawEntry?: Record<string, unknown> | null;
  // Structured facts parsed from GET /operations/{id} (+ /records/{id}):
  // seller/buyer parties, property address, Loi Carrez surface and the
  // headline price. Computed by the caller (webhook / backfill) so this
  // service stays pure + unit-testable. When present, the seller
  // identities feed the matcher (email/name) and the facts are persisted
  // into the structured columns for the reconciliation engine.
  inlineEnrichment?: OperationEnrichment | null;
  // Source of the event ("webhook" | "backfill" | "manual"). Stored
  // in raw_payload for audit.
  source: "webhook" | "backfill" | "manual";
  // MyNotary register the entry came from (only when the source is a
  // backfill via GET /register-entries — undefined for webhook
  // delivery).
  registerType?: "MANAGEMENT" | "TRANSACTION";
};

export type ProcessSignatureCompletedResult = {
  documentId: string;
  contractKind: MyNotaryContractKind | null;
  skipped: boolean;
  matched: boolean;
  confidence: number;
  sellerProjectUpdated: boolean;
};

const sanitizeSigners = (signers: MyNotarySigner[] | undefined): MyNotarySigner[] => {
  if (!Array.isArray(signers)) return [];
  return signers.map((s) => ({
    recordId: s.recordId ?? undefined,
    firstName: typeof s.firstName === "string" ? s.firstName : undefined,
    lastName: typeof s.lastName === "string" ? s.lastName : undefined,
    email: typeof s.email === "string" ? s.email.trim().toLowerCase() : undefined,
    phone: typeof s.phone === "string" ? s.phone : undefined,
    role: typeof s.role === "string" ? s.role : undefined,
  }));
};

const sanitizeFiles = (files: MyNotaryFile[] | undefined): MyNotaryFile[] => {
  if (!Array.isArray(files)) return [];
  return files
    .filter((f) => typeof f?.url === "string" && f.url.length > 0)
    .map((f) => ({
      name: typeof f.name === "string" ? f.name : "document",
      url: f.url,
      contentType: typeof f.contentType === "string" ? f.contentType : undefined,
    }));
};

const resolveSignedAt = (
  payload: MyNotarySignatureCompletedPayload
): string => {
  // Per the spec, webhook payloads ship `signatureTime` as Unix ms
  // (int64). Backfill entries ship ISO 8601 via `signedAt`. We
  // tolerate both formats and any drift in between.
  const candidate = payload.signedAt ?? payload.signatureTime;
  if (candidate !== undefined && candidate !== null) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      const fromMs = new Date(candidate > 1e12 ? candidate : candidate * 1000);
      if (!Number.isNaN(fromMs.getTime())) return fromMs.toISOString();
    }
    if (typeof candidate === "string") {
      const fromString = new Date(candidate);
      if (!Number.isNaN(fromString.getTime())) {
        return fromString.toISOString();
      }
      const asNum = Number(candidate);
      if (Number.isFinite(asNum)) {
        const fromMs = new Date(asNum > 1e12 ? asNum : asNum * 1000);
        if (!Number.isNaN(fromMs.getTime())) return fromMs.toISOString();
      }
    }
  }
  return new Date().toISOString();
};

export const processSignatureCompleted = async (
  input: ProcessSignatureCompletedInput
): Promise<ProcessSignatureCompletedResult> => {
  const {
    payload,
    inlineAddress,
    inlineSellerNames,
    inlineRawEntry,
    inlineEnrichment,
    source,
    registerType,
  } = input;

  const enrichment = inlineEnrichment ?? null;

  // Classify from the MyNotary `model` (or free-form label). The
  // classifier always returns a concrete kind ("other" as catch-all),
  // so every SIGNATURE_COMPLETED contract is ingested for the MCP / AI
  // layer. Only the 3 sale kinds feed the dashboard KPIs (filtered
  // downstream in the aggregator).
  const contractKind: MyNotaryContractKind = classifyContractModel(
    payload.contractType
  );
  const mynotaryContractId = String(payload.contractId);
  const mynotaryOperationId = String(payload.operationId);
  const signedAt = resolveSignedAt(payload);
  const signers = sanitizeSigners(payload.signers);
  const files = sanitizeFiles(payload.files);

  const { data: upsertRow, error: upsertError } = await supabaseAdmin
    .from("mynotary_signed_documents")
    .upsert(
      {
        mynotary_operation_id: mynotaryOperationId,
        mynotary_contract_id: mynotaryContractId,
        contract_kind: contractKind,
        contract_type_raw: payload.contractType,
        signed_at: signedAt,
        signers,
        files,
        mynotary_register_type: registerType ?? null,
        // Structured facts (Phase 1 reconciliation socle). Persisted as
        // dedicated columns so the reconciliation engine + golden record
        // can match on price / surface / seller identity.
        seller_contacts: enrichment?.sellerContacts ?? [],
        property_price: enrichment?.price ?? null,
        living_area: enrichment?.livingArea ?? null,
        raw_payload: {
          source,
          register_type: registerType ?? null,
          payload: payload as unknown as Record<string, unknown>,
          // Persist the verbatim register entry (when available) so
          // re-enrichment / re-matching can run without a fresh
          // MyNotary roundtrip.
          entry: inlineRawEntry ?? null,
          parsed: {
            inline_address: inlineAddress ?? enrichment?.propertyAddress ?? null,
            inline_seller_names: inlineSellerNames ?? null,
          },
          // Full enrichment snapshot (buyer side incl.) for audit / replay.
          enrichment: enrichment
            ? (enrichment as unknown as Record<string, unknown>)
            : null,
        },
      },
      { onConflict: "mynotary_contract_id" }
    )
    .select("id, matched_seller_project_id")
    .single();
  if (upsertError || !upsertRow) {
    throw new Error(
      `mynotary_signed_documents upsert failed: ${upsertError?.message ?? "no row returned"}`
    );
  }
  const documentId = upsertRow.id as string;

  let matchOutcome = {
    sellerProjectId: null as string | null,
    propertyId: null as string | null,
    confidence: 0,
    method: "none" as
      | "email_exact"
      | "name_exact"
      | "address_exact"
      | "address_fuzzy"
      | "name_fuzzy"
      | "manual"
      | "none",
  };
  // When a webhook payload ships structured signers, synthesise a
  // "Lastname Firstname" name list so the matcher's name-based path
  // also runs against `seller_leads.full_name`. We dedupe between
  // these names and any caller-supplied inlineSellerNames.
  const namesFromSigners = signers
    .map((s) => `${s.firstName ?? ""} ${s.lastName ?? ""}`.trim())
    .filter((n) => n.length > 0);
  // The enrichment recovers the seller identity from the VENDEUR /
  // MANDANT records even when it is absent from the signers list (the
  // typical "case 1": SweepBright/MyNotary mandate where Sillage never
  // saw the seller email). Feed those identities into the matcher as
  // synthetic signers (email path) + names (name path).
  const sellerContacts = enrichment?.sellerContacts ?? [];
  const namesFromEnrichment = sellerContacts
    .map((c) => c.fullName?.trim() ?? "")
    .filter((n) => n.length > 0);
  const enrichmentSigners: MyNotarySigner[] = sellerContacts
    .filter((c) => (c.email && c.email.length > 0) || (c.phone && c.phone.length > 0))
    .map((c) => ({
      firstName: c.firstName ?? undefined,
      lastName: c.lastName ?? undefined,
      email: c.email ? c.email.trim().toLowerCase() : undefined,
      phone: c.phone ?? undefined,
      role: c.role,
    }));
  const allSigners = [...signers, ...enrichmentSigners];
  const allInlineNames = Array.from(
    new Set([
      ...(inlineSellerNames ?? []),
      ...namesFromSigners,
      ...namesFromEnrichment,
    ])
  );

  try {
    const m = await matchSignedDocument({
      mynotaryOperationId,
      signers: allSigners,
      inlineAddress: inlineAddress ?? enrichment?.propertyAddress ?? null,
      inlineSellerNames: allInlineNames.length > 0 ? allInlineNames : null,
    });
    matchOutcome = m;
  } catch {
    // matching is best-effort; failures are non-blocking.
  }

  await supabaseAdmin
    .from("mynotary_signed_documents")
    .update({
      matched_seller_project_id: matchOutcome.sellerProjectId,
      matched_property_id: matchOutcome.propertyId,
      match_confidence: matchOutcome.confidence,
      match_method: matchOutcome.method,
      match_attempted_at: new Date().toISOString(),
    })
    .eq("id", documentId);

  // Best-effort archive of the signed PDF (and the eIDAS proof when
  // delivered). MyNotary's `files[].url` are short-lived signed
  // links, so we download them right after the upsert. Failures here
  // are non-blocking — the document row still exists and the link
  // remains usable until it expires.
  if (files.length > 0) {
    try {
      const archive = await archiveSignedDocument({
        documentId,
        mynotaryContractId,
        files,
      });
      const archiveUpdate: Record<string, unknown> = {};
      if (archive.signedDocumentPath) {
        archiveUpdate.signed_document_path = archive.signedDocumentPath;
      }
      if (archive.signatureProofPath) {
        archiveUpdate.signature_proof_path = archive.signatureProofPath;
      }
      if (Object.keys(archiveUpdate).length > 0) {
        await supabaseAdmin
          .from("mynotary_signed_documents")
          .update(archiveUpdate)
          .eq("id", documentId);
      }
    } catch {
      // Already swallowed by archiveSignedDocument; this is a belt
      // and suspenders catch in case the function itself throws.
    }
  }

  // Multi-source reconciliation (Phase 2). When the legacy matcher
  // didn't attach a seller_project, run the reconciliation engine which
  // also considers the enriched seller identity + price/surface bands,
  // and (case 1) can auto-create the dossier from a matching SweepBright
  // property. Best-effort, never blocks ingestion.
  if (!matchOutcome.sellerProjectId) {
    try {
      const { reconcileMyNotaryDocument } = await import(
        "@/services/reconciliation/reconcile.service"
      );
      const reconcileResult = await reconcileMyNotaryDocument(documentId, {
        autoCreate: contractKind === "mandate",
      });
      if (
        reconcileResult.decision === "auto_link" &&
        reconcileResult.clientProjectId
      ) {
        // Re-read the freshly written match so downstream logic
        // (mandate promotion) sees the reconciled seller_project.
        const { data: reread } = await supabaseAdmin
          .from("mynotary_signed_documents")
          .select("matched_seller_project_id, match_confidence, match_method")
          .eq("id", documentId)
          .maybeSingle();
        if (reread?.matched_seller_project_id) {
          matchOutcome = {
            sellerProjectId: reread.matched_seller_project_id,
            propertyId: matchOutcome.propertyId,
            confidence: reread.match_confidence ?? reconcileResult.score,
            method: (reread.match_method as typeof matchOutcome.method) ?? "address_exact",
          };
        }
      }
    } catch {
      // reconciliation is best-effort
    }
  }

  let sellerProjectUpdated = false;
  if (
    contractKind === "mandate" &&
    matchOutcome.sellerProjectId &&
    matchOutcome.confidence >= 0.7
  ) {
    const { error: updateError } = await supabaseAdmin
      .from("seller_projects")
      .update({
        mandate_status: "signed",
        mandate_signed_at: signedAt,
        mynotary_operation_id: mynotaryOperationId,
      })
      .eq("id", matchOutcome.sellerProjectId);
    if (!updateError) {
      sellerProjectUpdated = true;
    }
  }

  // Domain events drive the embedding worker + downstream automations.
  // We only emit the 3 canonical sale events; non-sale contracts
  // (rental / lease / guarantee…) are stored but don't trigger a
  // sale-funnel domain event.
  const saleEventName =
    contractKind === "mandate"
      ? "mynotary.mandate_signed"
      : contractKind === "purchase_offer"
        ? "mynotary.offer_signed"
        : contractKind === "preliminary_sale"
          ? "mynotary.preliminary_sale_signed"
          : null;
  try {
    if (saleEventName) {
      await emitDomainEvent({
        aggregateType: "mynotary_document",
        aggregateId: documentId,
        eventName: saleEventName,
        payload: {
          mynotary_contract_id: mynotaryContractId,
          mynotary_operation_id: mynotaryOperationId,
          contract_kind: contractKind,
          matched: matchOutcome.sellerProjectId !== null,
          confidence: matchOutcome.confidence,
          match_method: matchOutcome.method,
          signed_at: signedAt,
          source,
        },
      });
    }
  } catch {
    // non-blocking
  }

  return {
    documentId,
    contractKind,
    skipped: false,
    matched: matchOutcome.sellerProjectId !== null,
    confidence: matchOutcome.confidence,
    sellerProjectUpdated,
  };
};

// Soft-delete: the webhook handler maps signature_cancel +
// operation_deleted to this helper. Idempotent.
export const softDeleteByContractOrOperation = async (input: {
  mynotaryContractId?: string;
  mynotaryOperationId?: string;
}): Promise<{ softDeleted: number }> => {
  if (!input.mynotaryContractId && !input.mynotaryOperationId) {
    return { softDeleted: 0 };
  }
  const filterCol = input.mynotaryContractId
    ? ("mynotary_contract_id" as const)
    : ("mynotary_operation_id" as const);
  const filterValue = (input.mynotaryContractId ?? input.mynotaryOperationId)!;
  const { data } = await supabaseAdmin
    .from("mynotary_signed_documents")
    .update({ deleted_at: new Date().toISOString() })
    .is("deleted_at", null)
    .eq(filterCol, filterValue)
    .select("id");
  return { softDeleted: Array.isArray(data) ? data.length : 0 };
};
