import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { emitDomainEvent } from "@/lib/events/domain-events";
import {
  resolveContractKind,
  type MyNotaryContractKind,
  type MyNotaryFile,
  type MyNotarySignatureCompletedPayload,
  type MyNotarySigner,
} from "@/lib/mynotary/types";
import { matchSignedDocument } from "./auto-match.service";

// Cast types for the new tables that are not in the generated Supabase
// schema yet.
type SignedDocsWriter = {
  from: (table: "mynotary_signed_documents") => {
    upsert: (
      row: Record<string, unknown>,
      opts: { onConflict: string }
    ) => {
      select: (cols: string) => {
        single: () => Promise<{
          data: { id: string; matched_seller_project_id: string | null } | null;
          error: { message: string } | null;
        }>;
      };
    };
    update: (row: Record<string, unknown>) => {
      eq: (col: string, value: string) => Promise<{ error: { message: string } | null }>;
      is: (
        col: string,
        value: unknown
      ) => {
        select: (cols: string) => {
          eq: (col: string, value: string) => Promise<{
            data: Array<{ id: string }> | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
  };
};

type SellerProjectsWriter = {
  from: (table: "seller_projects") => {
    update: (row: Record<string, unknown>) => {
      eq: (col: string, value: string) => Promise<{ error: { message: string } | null }>;
    };
  };
};

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
  // Source of the event ("webhook" | "backfill" | "manual"). Stored
  // in raw_payload for audit.
  source: "webhook" | "backfill" | "manual";
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
  const candidate = payload.signedAt ?? payload.signatureTime;
  if (candidate) {
    const ts = new Date(candidate);
    if (!Number.isNaN(ts.getTime())) {
      return ts.toISOString();
    }
  }
  return new Date().toISOString();
};

export const processSignatureCompleted = async (
  input: ProcessSignatureCompletedInput
): Promise<ProcessSignatureCompletedResult> => {
  const { payload, inlineAddress, source } = input;

  const contractKind = resolveContractKind(payload.contractType);
  const mynotaryContractId = String(payload.contractId);
  const mynotaryOperationId = String(payload.operationId);
  const signedAt = resolveSignedAt(payload);
  const signers = sanitizeSigners(payload.signers);
  const files = sanitizeFiles(payload.files);

  if (!contractKind) {
    // We still log this in mynotary_events (handled upstream by the
    // webhook route). Nothing to ingest in the canonical table.
    return {
      documentId: "",
      contractKind: null,
      skipped: true,
      matched: false,
      confidence: 0,
      sellerProjectUpdated: false,
    };
  }

  const docsWriter = supabaseAdmin as unknown as SignedDocsWriter;
  const { data: upsertRow, error: upsertError } = await docsWriter
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
        raw_payload: {
          source,
          payload: payload as unknown as Record<string, unknown>,
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
    method: "none" as "email_exact" | "address_exact" | "address_fuzzy" | "manual" | "none",
  };
  try {
    const m = await matchSignedDocument({
      mynotaryOperationId,
      signers,
      inlineAddress: inlineAddress ?? null,
    });
    matchOutcome = m;
  } catch {
    // matching is best-effort; failures are non-blocking.
  }

  await docsWriter
    .from("mynotary_signed_documents")
    .update({
      matched_seller_project_id: matchOutcome.sellerProjectId,
      matched_property_id: matchOutcome.propertyId,
      match_confidence: matchOutcome.confidence,
      match_method: matchOutcome.method,
      match_attempted_at: new Date().toISOString(),
    })
    .eq("id", documentId);

  let sellerProjectUpdated = false;
  if (
    contractKind === "mandate" &&
    matchOutcome.sellerProjectId &&
    matchOutcome.confidence >= 0.7
  ) {
    const projectsWriter = supabaseAdmin as unknown as SellerProjectsWriter;
    const { error: updateError } = await projectsWriter
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

  try {
    await emitDomainEvent({
      aggregateType: "mynotary_document",
      aggregateId: documentId,
      eventName:
        contractKind === "mandate"
          ? "mynotary.mandate_signed"
          : contractKind === "purchase_offer"
            ? "mynotary.offer_signed"
            : "mynotary.preliminary_sale_signed",
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
  const docsWriter = supabaseAdmin as unknown as SignedDocsWriter;
  const filterCol = input.mynotaryContractId
    ? "mynotary_contract_id"
    : "mynotary_operation_id";
  const filterValue = (input.mynotaryContractId ?? input.mynotaryOperationId)!;
  const { data } = await docsWriter
    .from("mynotary_signed_documents")
    .update({ deleted_at: new Date().toISOString() })
    .is("deleted_at", null)
    .select("id")
    .eq(filterCol, filterValue);
  return { softDeleted: Array.isArray(data) ? data.length : 0 };
};
