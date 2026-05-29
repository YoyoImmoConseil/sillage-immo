import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  previewMyNotaryCandidates,
  createProjectFromMyNotaryDocument as createProjectFromDoc,
  type ReconcileCandidatePreview,
} from "@/services/reconciliation/reconcile.service";
import {
  computePropertyGoldenRecord,
  type PropertyGoldenRecord,
} from "@/services/properties/golden-record.service";

// Orchestration for the smart manual rattachement UI (MyNotary dashboard).
//   - getMyNotaryMatchContext: the contract facts already in DB + ranked
//     candidate dossiers (read-only).
//   - createProjectFromMyNotaryDocument: manual trigger of the Case-1
//     dossier creation, returning the resulting golden record.
//   - goldenForSellerProject: golden record resolved from a seller_project id
//     (used after an attach to show divergences in step 2).

export type MyNotarySellerContact = {
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
};

export type MyNotaryMatchContext = {
  contract: {
    id: string;
    mynotaryContractId: string | null;
    contractKind: string;
    signedAt: string | null;
    sellerContacts: MyNotarySellerContact[];
    address: string | null;
    price: number | null;
    livingArea: number | null;
    currentSellerProjectId: string | null;
    currentPropertyId: string | null;
  };
  candidates: ReconcileCandidatePreview[];
};

type DocRow = {
  id: string;
  mynotary_contract_id: string | null;
  contract_kind: string;
  signed_at: string | null;
  seller_contacts: MyNotarySellerContact[] | null;
  property_price: number | null;
  living_area: number | null;
  matched_seller_project_id: string | null;
  matched_property_id: string | null;
  raw_payload: { parsed?: { inline_address?: string | null } } | null;
};

export const getMyNotaryMatchContext = async (
  documentId: string
): Promise<MyNotaryMatchContext | null> => {
  const reader = supabaseAdmin as unknown as {
    from: (table: "mynotary_signed_documents") => {
      select: (cols: string) => {
        eq: (
          col: string,
          value: string
        ) => {
          maybeSingle: () => Promise<{ data: DocRow | null }>;
        };
      };
    };
  };
  const { data: doc } = await reader
    .from("mynotary_signed_documents")
    .select(
      "id, mynotary_contract_id, contract_kind, signed_at, seller_contacts, property_price, living_area, matched_seller_project_id, matched_property_id, raw_payload"
    )
    .eq("id", documentId)
    .maybeSingle();
  if (!doc) return null;

  const candidates = await previewMyNotaryCandidates(documentId, 5);

  return {
    contract: {
      id: doc.id,
      mynotaryContractId: doc.mynotary_contract_id,
      contractKind: doc.contract_kind,
      signedAt: doc.signed_at,
      sellerContacts: doc.seller_contacts ?? [],
      address: doc.raw_payload?.parsed?.inline_address ?? null,
      price: doc.property_price ?? null,
      livingArea: doc.living_area ?? null,
      currentSellerProjectId: doc.matched_seller_project_id,
      currentPropertyId: doc.matched_property_id,
    },
    candidates,
  };
};

// Resolve the client_profile_id for a client_project (needed to build the
// /admin/clients/[clientId]/projects/[projectId] link in the UI).
export const resolveClientProfileId = async (
  clientProjectId: string
): Promise<string | null> => {
  const { data } = await supabaseAdmin
    .from("client_projects")
    .select("client_profile_id")
    .eq("id", clientProjectId)
    .maybeSingle();
  return (data as { client_profile_id: string | null } | null)?.client_profile_id ?? null;
};

// Resolve the golden record for a seller_project id (the modal works with
// seller_project / client_project, computePropertyGoldenRecord needs the
// client_project id). Also returns the client_profile_id for the deep link.
export const goldenForSellerProject = async (
  sellerProjectId: string
): Promise<{ golden: PropertyGoldenRecord | null; clientProfileId: string | null }> => {
  const { data: sp } = await supabaseAdmin
    .from("seller_projects")
    .select("client_project_id")
    .eq("id", sellerProjectId)
    .maybeSingle();
  const clientProjectId =
    (sp as { client_project_id: string | null } | null)?.client_project_id ?? null;
  if (!clientProjectId) return { golden: null, clientProfileId: null };
  const [golden, clientProfileId] = await Promise.all([
    computePropertyGoldenRecord(clientProjectId),
    resolveClientProfileId(clientProjectId),
  ]);
  return { golden, clientProfileId };
};

// Free-text dossier search (fallback when no suggestion fits). Matches on
// the client identity (name / email / phone) and on the linked property
// address, then returns rows in the same shape as the suggestions so the
// modal can render a single card type. score/reasons are placeholders.
export const searchDossiers = async (
  term: string,
  limit = 10
): Promise<ReconcileCandidatePreview[]> => {
  const t = term.trim();
  if (t.length < 2) return [];
  const like = `%${t}%`;

  const clientProjectIds = new Set<string>();

  const { data: profiles } = await supabaseAdmin
    .from("client_profiles")
    .select("id")
    .or(`full_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
    .limit(25);
  const profileIds = (profiles ?? []).map((p) => (p as { id: string }).id);
  if (profileIds.length > 0) {
    const { data: cps } = await supabaseAdmin
      .from("client_projects")
      .select("id")
      .in("client_profile_id", profileIds)
      .limit(50);
    for (const r of (cps ?? []) as Array<{ id: string }>) clientProjectIds.add(r.id);
  }

  const { data: props } = await supabaseAdmin
    .from("properties")
    .select("id")
    .ilike("formatted_address", like)
    .limit(25);
  const propIds = (props ?? []).map((p) => (p as { id: string }).id);
  if (propIds.length > 0) {
    const { data: links } = await supabaseAdmin
      .from("project_properties")
      .select("client_project_id")
      .in("property_id", propIds)
      .is("unlinked_at", null);
    for (const r of (links ?? []) as Array<{ client_project_id: string }>) {
      clientProjectIds.add(r.client_project_id);
    }
  }

  if (clientProjectIds.size === 0) return [];
  return enrichDossiers(Array.from(clientProjectIds).slice(0, limit));
};

const enrichDossiers = async (
  clientProjectIds: string[]
): Promise<ReconcileCandidatePreview[]> => {
  if (clientProjectIds.length === 0) return [];

  const { data: sps } = await supabaseAdmin
    .from("seller_projects")
    .select("id, client_project_id")
    .in("client_project_id", clientProjectIds);
  const spByProject = new Map<string, string>();
  for (const r of (sps ?? []) as Array<{ id: string; client_project_id: string }>) {
    if (!spByProject.has(r.client_project_id)) spByProject.set(r.client_project_id, r.id);
  }

  const { data: links } = await supabaseAdmin
    .from("project_properties")
    .select("client_project_id, property_id, is_primary")
    .in("client_project_id", clientProjectIds)
    .is("unlinked_at", null);
  const linkRows = (links ?? []) as Array<{
    client_project_id: string;
    property_id: string;
    is_primary: boolean | null;
  }>;
  const primaryByProject = new Map<string, string>();
  for (const l of linkRows) {
    if (!primaryByProject.has(l.client_project_id) || l.is_primary) {
      primaryByProject.set(l.client_project_id, l.property_id);
    }
  }
  const propertyIds = Array.from(new Set(linkRows.map((l) => l.property_id)));
  const addressByProperty = new Map<string, string | null>();
  if (propertyIds.length > 0) {
    const { data: properties } = await supabaseAdmin
      .from("properties")
      .select("id, formatted_address")
      .in("id", propertyIds);
    for (const p of (properties ?? []) as Array<{ id: string; formatted_address: string | null }>) {
      addressByProperty.set(p.id, p.formatted_address);
    }
  }

  const { data: cps } = await supabaseAdmin
    .from("client_projects")
    .select("id, client_profile_id, title")
    .in("id", clientProjectIds);
  const cpRows = (cps ?? []) as Array<{
    id: string;
    client_profile_id: string | null;
    title: string | null;
  }>;
  const profileIds = Array.from(
    new Set(cpRows.map((c) => c.client_profile_id).filter((x): x is string => Boolean(x)))
  );
  const profileById = new Map<string, { full_name: string | null; email: string | null }>();
  if (profileIds.length > 0) {
    const { data: profiles } = await supabaseAdmin
      .from("client_profiles")
      .select("id, full_name, email")
      .in("id", profileIds);
    for (const p of (profiles ?? []) as Array<{
      id: string;
      full_name: string | null;
      email: string | null;
    }>) {
      profileById.set(p.id, { full_name: p.full_name, email: p.email });
    }
  }

  return clientProjectIds.map((clientProjectId) => {
    const cp = cpRows.find((c) => c.id === clientProjectId);
    const clientProfileId = cp?.client_profile_id ?? null;
    const profile = clientProfileId ? profileById.get(clientProfileId) : undefined;
    const label =
      profile?.full_name ??
      profile?.email ??
      cp?.title ??
      `Dossier ${clientProjectId.slice(0, 8)}`;
    const primaryPropertyId = primaryByProject.get(clientProjectId) ?? null;
    const address = primaryPropertyId
      ? addressByProperty.get(primaryPropertyId) ?? null
      : null;
    return {
      clientProjectId,
      clientProfileId,
      sellerProjectId: spByProject.get(clientProjectId) ?? null,
      primaryPropertyId,
      label,
      address,
      score: 0,
      reasons: ["recherche"],
    };
  });
};

export const createProjectFromMyNotaryDocument = async (
  documentId: string
): Promise<{
  ok: boolean;
  clientProjectId: string | null;
  sellerProjectId: string | null;
  clientProfileId: string | null;
  golden: PropertyGoldenRecord | null;
  reason?: string;
}> => {
  const result = await createProjectFromDoc(documentId);
  if (!result.ok || !result.clientProjectId) {
    return { ...result, clientProfileId: null, golden: null };
  }
  const [golden, clientProfileId] = await Promise.all([
    computePropertyGoldenRecord(result.clientProjectId),
    resolveClientProfileId(result.clientProjectId),
  ]);
  return { ...result, clientProfileId, golden };
};
