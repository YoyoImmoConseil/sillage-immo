import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  attachPropertyToSellerProject,
  getSellerProjectByClientProjectId,
} from "@/services/clients/seller-project.service";

// Admin-facing list + resolution of the reconciliation_suggestions queue.

export type ReconciliationSourceKind =
  | "sweepbright_property"
  | "mynotary_document"
  | "estimator_lead";

export type ReconciliationSuggestionRow = {
  id: string;
  createdAt: string;
  sourceKind: ReconciliationSourceKind;
  sourceRef: string;
  sourceLabel: string;
  targetClientProjectId: string | null;
  targetLabel: string;
  targetClientId: string | null;
  score: number;
  reasons: string[];
  fieldsPreview: Record<string, unknown>;
};

type RawSuggestion = {
  id: string;
  created_at: string;
  source_kind: ReconciliationSourceKind;
  source_ref: string;
  target_client_project_id: string | null;
  score: number;
  reasons: unknown;
  fields_preview: unknown;
};

const SUGGESTIONS_TABLE = "reconciliation_suggestions";

type SuggestionsReader = {
  from: (table: typeof SUGGESTIONS_TABLE) => {
    select: (cols: string) => {
      eq: (
        col: string,
        value: string
      ) => {
        order: (
          col: string,
          opts: { ascending: boolean }
        ) => {
          limit: (n: number) => Promise<{ data: RawSuggestion[] | null; error: { message: string } | null }>;
        };
      };
    };
  };
};

// Best-effort human label for the source record.
const labelForSource = async (
  kind: ReconciliationSourceKind,
  sourceRef: string
): Promise<string> => {
  if (kind === "sweepbright_property") {
    const { data } = await supabaseAdmin
      .from("properties")
      .select("formatted_address")
      .eq("id", sourceRef)
      .maybeSingle();
    return (data as { formatted_address: string | null } | null)?.formatted_address ?? `Bien ${sourceRef.slice(0, 8)}`;
  }
  if (kind === "estimator_lead") {
    const { data } = await supabaseAdmin
      .from("seller_leads")
      .select("full_name, property_address")
      .eq("id", sourceRef)
      .maybeSingle();
    const row = data as { full_name: string | null; property_address: string | null } | null;
    return [row?.full_name, row?.property_address].filter(Boolean).join(" · ") || `Lead ${sourceRef.slice(0, 8)}`;
  }
  // mynotary_document
  const reader = supabaseAdmin as unknown as {
    from: (table: "mynotary_signed_documents") => {
      select: (cols: string) => {
        eq: (col: string, value: string) => {
          maybeSingle: () => Promise<{
            data: {
              contract_kind: string | null;
              raw_payload: { parsed?: { inline_address?: string | null } } | null;
            } | null;
          }>;
        };
      };
    };
  };
  const { data } = await reader
    .from("mynotary_signed_documents")
    .select("contract_kind, raw_payload")
    .eq("id", sourceRef)
    .maybeSingle();
  const addr = data?.raw_payload?.parsed?.inline_address ?? null;
  return [data?.contract_kind, addr].filter(Boolean).join(" · ") || `Doc ${sourceRef.slice(0, 8)}`;
};

const labelForTarget = async (
  clientProjectId: string | null
): Promise<{ label: string; clientId: string | null }> => {
  if (!clientProjectId) return { label: "Dossier inconnu", clientId: null };
  const { data: project } = await supabaseAdmin
    .from("client_projects")
    .select("client_profile_id, title")
    .eq("id", clientProjectId)
    .maybeSingle();
  const clientProfileId = (project as { client_profile_id: string | null } | null)?.client_profile_id ?? null;
  const title = (project as { title: string | null } | null)?.title ?? null;
  let label = title ?? `Dossier ${clientProjectId.slice(0, 8)}`;
  if (clientProfileId) {
    const { data: profile } = await supabaseAdmin
      .from("client_profiles")
      .select("full_name, email")
      .eq("id", clientProfileId)
      .maybeSingle();
    const row = profile as { full_name: string | null; email: string | null } | null;
    label = row?.full_name ?? row?.email ?? label;
  }
  return { label, clientId: clientProfileId };
};

export const listReconciliationSuggestions = async (
  limit = 50
): Promise<ReconciliationSuggestionRow[]> => {
  const reader = supabaseAdmin as unknown as SuggestionsReader;
  const { data, error } = await reader
    .from(SUGGESTIONS_TABLE)
    .select(
      "id, created_at, source_kind, source_ref, target_client_project_id, score, reasons, fields_preview"
    )
    .eq("status", "pending")
    .order("score", { ascending: false })
    .limit(limit);
  if (error || !data) return [];

  const rows: ReconciliationSuggestionRow[] = [];
  for (const raw of data) {
    const [sourceLabel, target] = await Promise.all([
      labelForSource(raw.source_kind, raw.source_ref),
      labelForTarget(raw.target_client_project_id),
    ]);
    rows.push({
      id: raw.id,
      createdAt: raw.created_at,
      sourceKind: raw.source_kind,
      sourceRef: raw.source_ref,
      sourceLabel,
      targetClientProjectId: raw.target_client_project_id,
      targetLabel: target.label,
      targetClientId: target.clientId,
      score: raw.score,
      reasons: Array.isArray(raw.reasons) ? (raw.reasons as string[]) : [],
      fieldsPreview:
        raw.fields_preview && typeof raw.fields_preview === "object"
          ? (raw.fields_preview as Record<string, unknown>)
          : {},
    });
  }
  return rows;
};

type SuggestionWriter = {
  from: (table: typeof SUGGESTIONS_TABLE) => {
    update: (row: Record<string, unknown>) => {
      eq: (col: string, value: string) => Promise<{ error: { message: string } | null }>;
    };
    select: (cols: string) => {
      eq: (col: string, value: string) => {
        maybeSingle: () => Promise<{ data: RawSuggestion | null; error: { message: string } | null }>;
      };
    };
  };
};

const getSuggestion = async (id: string): Promise<RawSuggestion | null> => {
  const reader = supabaseAdmin as unknown as SuggestionWriter;
  const { data } = await reader
    .from(SUGGESTIONS_TABLE)
    .select("id, created_at, source_kind, source_ref, target_client_project_id, score, reasons, fields_preview")
    .eq("id", id)
    .maybeSingle();
  return data ?? null;
};

const markSuggestion = async (
  id: string,
  status: "accepted" | "rejected",
  adminProfileId?: string | null
) => {
  const writer = supabaseAdmin as unknown as SuggestionWriter;
  await writer
    .from(SUGGESTIONS_TABLE)
    .update({
      status,
      resolved_at: new Date().toISOString(),
      resolved_by_admin_profile_id: adminProfileId ?? null,
    })
    .eq("id", id);
};

// Accept a suggestion: perform the link implied by the source kind, then
// mark it accepted. Returns the client_project the source was attached to.
export const acceptReconciliationSuggestion = async (
  id: string,
  adminProfileId?: string | null
): Promise<{ ok: boolean; clientProjectId: string | null; message?: string }> => {
  const suggestion = await getSuggestion(id);
  if (!suggestion) return { ok: false, clientProjectId: null, message: "Suggestion introuvable." };
  const target = suggestion.target_client_project_id;
  if (!target) return { ok: false, clientProjectId: null, message: "Dossier cible manquant." };

  try {
    if (suggestion.source_kind === "sweepbright_property") {
      await attachPropertyToSellerProject(target, suggestion.source_ref, {
        isPrimary: false,
        adminProfileId: adminProfileId ?? undefined,
      });
    } else if (suggestion.source_kind === "mynotary_document") {
      const sellerProject = await getSellerProjectByClientProjectId(target);
      if (!sellerProject) {
        return { ok: false, clientProjectId: null, message: "Projet vendeur cible introuvable." };
      }
      const writer = supabaseAdmin as unknown as {
        from: (table: "mynotary_signed_documents") => {
          update: (row: Record<string, unknown>) => {
            eq: (col: string, value: string) => Promise<{ error: { message: string } | null }>;
          };
        };
      };
      await writer
        .from("mynotary_signed_documents")
        .update({
          matched_seller_project_id: sellerProject.id,
          match_confidence: Math.max(suggestion.score, 0.7),
          match_method: "manual",
          match_attempted_at: new Date().toISOString(),
        })
        .eq("id", suggestion.source_ref);
    }
    // estimator_lead: a new lead that matches an existing dossier. There
    // is no property to physically attach at lead-capture time, so we
    // only record acceptance — the operator uses the target dossier link
    // to continue. (Auto-link of the estimation property happens later
    // when the project is created from the lead.)

    await markSuggestion(id, "accepted", adminProfileId);
    return { ok: true, clientProjectId: target };
  } catch (error) {
    return {
      ok: false,
      clientProjectId: null,
      message: error instanceof Error ? error.message : "Échec du rattachement.",
    };
  }
};

export const rejectReconciliationSuggestion = async (
  id: string,
  adminProfileId?: string | null
): Promise<{ ok: boolean }> => {
  await markSuggestion(id, "rejected", adminProfileId);
  return { ok: true };
};
