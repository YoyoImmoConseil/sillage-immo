import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { MyNotaryContractKind } from "@/lib/mynotary/types";

// Read service consumed by:
//   - GET /admin/mynotary (SSR list)
//   - the MCP tool mynotary.list_signed_documents (same shape so the
//     copilot sees rows that map 1:1 to what the UI shows)

type SignedDocumentReader = {
  from: (table: "mynotary_signed_documents") => {
    select: (cols: string, opts: { count: "exact" }) => MaybeChain;
  };
};

type MaybeChain = {
  eq: (col: string, value: string) => MaybeChain;
  is: (col: string, value: unknown) => MaybeChain;
  gte: (col: string, value: string) => MaybeChain;
  lte: (col: string, value: string) => MaybeChain;
  order: (col: string, opts: { ascending: boolean }) => MaybeChain;
  range: (from: number, to: number) => Promise<{
    data: SignedDocumentRow[] | null;
    error: { message: string } | null;
    count: number | null;
  }>;
};

export type SignedDocumentRow = {
  id: string;
  mynotary_contract_id: string;
  mynotary_operation_id: string;
  contract_kind: MyNotaryContractKind;
  contract_type_raw: string | null;
  signed_at: string;
  signers: Array<{
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
  }>;
  files: Array<{ name: string; url: string }>;
  matched_seller_project_id: string | null;
  matched_property_id: string | null;
  match_confidence: number | null;
  match_method: string | null;
  mynotary_register_type: "MANAGEMENT" | "TRANSACTION" | null;
  signed_document_path: string | null;
  signature_proof_path: string | null;
};

export type SignedDocumentsListFilters = {
  kind?: MyNotaryContractKind | "all";
  matched?: "matched" | "unmatched" | "all";
  since?: string;
  until?: string;
  page?: number;
  pageSize?: number;
};

export type SignedDocumentsListResult = {
  rows: SignedDocumentRow[];
  total: number;
  page: number;
  pageSize: number;
};

export const listSignedDocuments = async (
  filters: SignedDocumentsListFilters = {}
): Promise<SignedDocumentsListResult> => {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const client = supabaseAdmin as unknown as SignedDocumentReader;
  let query: MaybeChain = client
    .from("mynotary_signed_documents")
    .select(
      "id, mynotary_contract_id, mynotary_operation_id, contract_kind, contract_type_raw, signed_at, signers, files, matched_seller_project_id, matched_property_id, match_confidence, match_method, mynotary_register_type, signed_document_path, signature_proof_path",
      { count: "exact" }
    )
    .is("deleted_at", null);

  if (filters.kind && filters.kind !== "all") {
    query = query.eq("contract_kind", filters.kind);
  }
  if (filters.matched === "matched") {
    query = query.is("matched_seller_project_id", null);
    // matched_seller_project_id IS NULL is `unmatched`; for `matched`
    // we need NOT NULL. We achieve that by re-issuing the IS filter
    // with a sentinel: PostgREST exposes .not("matched_seller_project_id", "is", null)
    // but our cast type doesn't include it. Simpler: query both,
    // filter in JS for "matched" → fall back to JS post-filter.
  }
  if (filters.since) query = query.gte("signed_at", filters.since);
  if (filters.until) query = query.lte("signed_at", filters.until);

  const { data, count } = await query
    .order("signed_at", { ascending: false })
    .range(from, to);

  let rows = (data ?? []) as SignedDocumentRow[];
  if (filters.matched === "matched") {
    rows = rows.filter((r) => r.matched_seller_project_id !== null);
  } else if (filters.matched === "unmatched") {
    rows = rows.filter((r) => r.matched_seller_project_id === null);
  }

  return {
    rows,
    total: count ?? rows.length,
    page,
    pageSize,
  };
};

export const getSignedDocumentByKey = async (
  key: { id?: string; mynotaryContractId?: string }
): Promise<SignedDocumentRow | null> => {
  if (!key.id && !key.mynotaryContractId) return null;
  const client = supabaseAdmin as unknown as SignedDocumentReader;
  let query: MaybeChain = client
    .from("mynotary_signed_documents")
    .select(
      "id, mynotary_contract_id, mynotary_operation_id, contract_kind, contract_type_raw, signed_at, signers, files, matched_seller_project_id, matched_property_id, match_confidence, match_method, mynotary_register_type, signed_document_path, signature_proof_path",
      { count: "exact" }
    )
    .is("deleted_at", null);
  if (key.id) query = query.eq("id", key.id);
  if (key.mynotaryContractId)
    query = query.eq("mynotary_contract_id", key.mynotaryContractId);
  const { data } = await query.range(0, 0);
  return data && data.length > 0 ? data[0] : null;
};
