import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  normalizeEmail,
  normalizePhone,
} from "@/services/contacts/contact-identity.service";
import {
  attachPropertyToSellerProject,
  createSellerProjectFromProperty,
} from "@/services/clients/seller-project.service";
import { createClientProfile } from "@/services/clients/client-profile.service";

// ─────────────────────────────────────────────────────────────────────
// Multi-source reconciliation engine (Phase 2).
//
// Given a freshly-ingested source record (a SweepBright property, a
// signed MyNotary document, or an estimator seller lead), find the
// `client_project` hub it belongs to by combining:
//   - address similarity (pg_trgm RPCs on seller_leads.property_address)
//   - seller identity (email / phone on seller_leads, name fuzzy RPC)
//   - price band (±12%) and living-area band (±12%) as confirmation
//     boosters.
//
// Decision:
//   - score ≥ 0.80 → AUTO-LINK (attach property / set matched_*)
//   - 0.50 ≤ score < 0.80 → SUGGESTION (reconciliation_suggestions queue)
//   - score < 0.50 → NONE
//
// Idempotent + reversible: auto-links go through the existing
// attachPropertyToSellerProject (UNIQUE on project_properties), and a
// pending suggestion is upserted on (source_kind, source_ref, target).
// ─────────────────────────────────────────────────────────────────────

export type ReconcileSourceKind =
  | "sweepbright_property"
  | "mynotary_document"
  | "estimator_lead";

export type ReconcileIdentity = {
  email?: string | null;
  phone?: string | null;
  fullName?: string | null;
};

export type ReconcileFacts = {
  kind: ReconcileSourceKind;
  /** properties.id / mynotary_signed_documents.id / seller_leads.id */
  sourceRef: string;
  address?: string | null;
  price?: number | null;
  livingArea?: number | null;
  identities?: ReconcileIdentity[];
  /** The properties.id carried by this source (SweepBright / estimator). */
  propertyId?: string | null;
  /**
   * client_project the source already belongs to (estimator lead). Used
   * to avoid suggesting/linking the source to its own hub.
   */
  ownClientProjectId?: string | null;
};

export type ReconcileDecision = "auto_link" | "suggestion" | "none";

export type ReconcileResult = {
  decision: ReconcileDecision;
  clientProjectId: string | null;
  score: number;
  reasons: string[];
  candidatesEvaluated: number;
};

const AUTO_LINK_THRESHOLD = 0.8;
const SUGGESTION_THRESHOLD = 0.5;
const BAND_RATIO = 0.12;

const normalizeAddress = (raw: string | null | undefined): string => {
  if (!raw) return "";
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
};

const withinBand = (a: number | null | undefined, b: number | null | undefined) => {
  if (!a || !b || a <= 0 || b <= 0) return false;
  const ratio = Math.abs(a - b) / Math.max(a, b);
  return ratio <= BAND_RATIO;
};

type Candidate = {
  clientProjectId: string;
  sellerProjectId: string | null;
  sellerLeadId: string | null;
  score: number;
  reasons: Set<string>;
};

type SellerProjectLite = {
  id: string;
  client_project_id: string;
  seller_lead_id: string | null;
};

// Resolve seller_project rows → client_project ids.
const loadSellerProjects = async (
  sellerProjectIds: string[]
): Promise<Map<string, SellerProjectLite>> => {
  const map = new Map<string, SellerProjectLite>();
  const unique = Array.from(new Set(sellerProjectIds.filter(Boolean)));
  if (unique.length === 0) return map;
  const { data } = await supabaseAdmin
    .from("seller_projects")
    .select("id, client_project_id, seller_lead_id")
    .in("id", unique);
  for (const row of (data ?? []) as SellerProjectLite[]) {
    map.set(row.id, row);
  }
  return map;
};

// Resolve client_project ids → their seller_project row (one is enough for
// reconciliation). Used by the property-based candidate path, where the hub
// is found via project_properties → client_project rather than a seller_lead.
const loadSellerProjectsByClientProject = async (
  clientProjectIds: string[]
): Promise<Map<string, SellerProjectLite>> => {
  const map = new Map<string, SellerProjectLite>();
  const unique = Array.from(new Set(clientProjectIds.filter(Boolean)));
  if (unique.length === 0) return map;
  const { data } = await supabaseAdmin
    .from("seller_projects")
    .select("id, client_project_id, seller_lead_id")
    .in("client_project_id", unique);
  for (const row of (data ?? []) as SellerProjectLite[]) {
    if (!map.has(row.client_project_id)) map.set(row.client_project_id, row);
  }
  return map;
};

type AddressRpc = {
  rpc: (
    name: "mynotary_match_seller_project_by_address",
    args: { p_query: string; p_min_similarity: number; p_limit: number }
  ) => Promise<{
    data: Array<{ seller_project_id: string; similarity: number }> | null;
    error: { message: string } | null;
  }>;
};

type NamesRpc = {
  rpc: (
    name: "mynotary_match_seller_project_by_names",
    args: { p_names: string[]; p_min_similarity: number; p_limit: number }
  ) => Promise<{
    data: Array<{ seller_project_id: string; similarity: number }> | null;
    error: { message: string } | null;
  }>;
};

const upsertCandidate = (
  candidates: Map<string, Candidate>,
  sellerProject: SellerProjectLite | null,
  clientProjectId: string,
  scoreContribution: number,
  reason: string
) => {
  const existing = candidates.get(clientProjectId);
  if (existing) {
    existing.score = Math.max(existing.score, scoreContribution);
    existing.reasons.add(reason);
    if (!existing.sellerProjectId && sellerProject) {
      existing.sellerProjectId = sellerProject.id;
      existing.sellerLeadId = sellerProject.seller_lead_id;
    }
    return;
  }
  candidates.set(clientProjectId, {
    clientProjectId,
    sellerProjectId: sellerProject?.id ?? null,
    sellerLeadId: sellerProject?.seller_lead_id ?? null,
    score: scoreContribution,
    reasons: new Set([reason]),
  });
};

// Candidate generation from the seller identity (email / phone exact on
// seller_leads, then the lead's seller_project → client_project).
const candidatesFromIdentities = async (
  identities: ReconcileIdentity[]
): Promise<
  Map<
    string,
    { score: number; reason: string; sellerProjectId: string | null; sellerLeadId: string | null }
  >
> => {
  const result = new Map<
    string,
    { score: number; reason: string; sellerProjectId: string | null; sellerLeadId: string | null }
  >();
  const emails = Array.from(
    new Set(
      identities
        .map((i) => normalizeEmail(i.email))
        .filter((e): e is string => Boolean(e))
    )
  );
  const phones = Array.from(
    new Set(
      identities
        .map((i) => normalizePhone(i.phone))
        .filter((p): p is string => Boolean(p))
    )
  );
  if (emails.length === 0 && phones.length === 0) return result;

  // seller_leads exact match on email or normalized phone.
  const leadQuery = supabaseAdmin
    .from("seller_leads")
    .select("id, email, phone");
  const orClauses: string[] = [];
  if (emails.length > 0) orClauses.push(`email.in.(${emails.join(",")})`);
  if (phones.length > 0) {
    // phone stored raw; compare on a best-effort ilike for each.
    for (const phone of phones) {
      orClauses.push(`phone.ilike.%${phone.slice(-9)}%`);
    }
  }
  if (orClauses.length === 0) return result;
  const { data: leads } = await leadQuery.or(orClauses.join(","));
  const leadList = (leads ?? []) as Array<{
    id: string;
    email: string | null;
    phone: string | null;
  }>;
  if (leadList.length === 0) return result;

  const matchedLeadIds: string[] = [];
  const reasonByLead = new Map<string, string>();
  for (const lead of leadList) {
    const leadEmail = normalizeEmail(lead.email);
    const leadPhone = normalizePhone(lead.phone);
    if (leadEmail && emails.includes(leadEmail)) {
      matchedLeadIds.push(lead.id);
      reasonByLead.set(lead.id, "identity_email");
    } else if (
      leadPhone &&
      phones.some((p) => leadPhone.endsWith(p.slice(-9)))
    ) {
      matchedLeadIds.push(lead.id);
      reasonByLead.set(lead.id, "identity_phone");
    }
  }
  if (matchedLeadIds.length === 0) return result;

  const { data: projects } = await supabaseAdmin
    .from("seller_projects")
    .select("id, client_project_id, seller_lead_id")
    .in("seller_lead_id", matchedLeadIds);
  for (const sp of (projects ?? []) as SellerProjectLite[]) {
    const reason = sp.seller_lead_id
      ? reasonByLead.get(sp.seller_lead_id) ?? "identity_email"
      : "identity_email";
    // email is stronger than phone.
    const base = reason === "identity_email" ? 0.75 : 0.65;
    result.set(sp.client_project_id, {
      score: base,
      reason,
      sellerProjectId: sp.id,
      sellerLeadId: sp.seller_lead_id,
    });
  }
  return result;
};

type ProjectFacts = { price: number | null; livingArea: number | null };

// Best-effort price + living-area for a candidate project so we can run
// the confirmation bands. Reads the primary linked property (+ its
// listing price) and falls back to the seller_lead estimated price.
const getProjectFacts = async (
  clientProjectId: string,
  sellerLeadId: string | null
): Promise<ProjectFacts> => {
  let price: number | null = null;
  let livingArea: number | null = null;

  const { data: links } = await supabaseAdmin
    .from("project_properties")
    .select("property_id, is_primary")
    .eq("client_project_id", clientProjectId)
    .is("unlinked_at", null);
  const propertyIds = (links ?? []).map((l) => l.property_id as string);
  if (propertyIds.length > 0) {
    const { data: props } = await supabaseAdmin
      .from("properties")
      .select("id, living_area")
      .in("id", propertyIds);
    for (const p of (props ?? []) as Array<{ id: string; living_area: number | null }>) {
      if (livingArea === null && typeof p.living_area === "number") {
        livingArea = p.living_area;
      }
    }
    const { data: listings } = await supabaseAdmin
      .from("property_listings")
      .select("property_id, price_amount")
      .in("property_id", propertyIds);
    for (const l of (listings ?? []) as Array<{
      property_id: string;
      price_amount: number | null;
    }>) {
      if (price === null && typeof l.price_amount === "number") {
        price = l.price_amount;
      }
    }
  }

  if (price === null && sellerLeadId) {
    const { data: lead } = await supabaseAdmin
      .from("seller_leads")
      .select("estimated_price")
      .eq("id", sellerLeadId)
      .maybeSingle();
    const estimated = (lead as { estimated_price: number | null } | null)?.estimated_price;
    if (typeof estimated === "number") price = estimated;
  }

  return { price, livingArea };
};

// Persist a weak match into the review queue (idempotent on the pending
// unique index).
const upsertSuggestion = async (input: {
  kind: ReconcileSourceKind;
  sourceRef: string;
  targetClientProjectId: string;
  score: number;
  reasons: string[];
  fieldsPreview: Record<string, unknown>;
}) => {
  // The uniqueness guard is a *partial* index (… where status = 'pending'),
  // which PostgREST upsert/onConflict cannot target. Do an explicit
  // select-then-update/insert keyed on the live (pending) row instead.
  // `reconciliation_suggestions` is not in the generated Database types,
  // so cast a minimal builder shape (same pattern as applyAutoLink).
  type Result = { error: { message: string } | null };
  type Filterable = {
    select: (cols: string) => Filterable;
    eq: (col: string, val: string) => Filterable;
    maybeSingle: () => Promise<{ data: { id: string } | null; error: { message: string } | null }>;
  };
  const db = supabaseAdmin as unknown as {
    from: (table: "reconciliation_suggestions") => Filterable & {
      update: (row: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<Result> };
      insert: (row: Record<string, unknown>) => Promise<Result>;
    };
  };

  const { data: existing, error: selectError } = await db
    .from("reconciliation_suggestions")
    .select("id")
    .eq("source_kind", input.kind)
    .eq("source_ref", input.sourceRef)
    .eq("target_client_project_id", input.targetClientProjectId)
    .eq("status", "pending")
    .maybeSingle();
  if (selectError) {
    console.error("[reconcile] suggestion lookup failed", selectError.message);
    return;
  }

  if (existing?.id) {
    const { error: updateError } = await db
      .from("reconciliation_suggestions")
      .update({
        score: input.score,
        reasons: input.reasons,
        fields_preview: input.fieldsPreview,
      })
      .eq("id", existing.id);
    if (updateError) {
      console.error("[reconcile] suggestion update failed", updateError.message);
    }
    return;
  }

  const { error: insertError } = await db
    .from("reconciliation_suggestions")
    .insert({
      source_kind: input.kind,
      source_ref: input.sourceRef,
      target_client_project_id: input.targetClientProjectId,
      score: input.score,
      reasons: input.reasons,
      fields_preview: input.fieldsPreview,
      status: "pending",
    });
  if (insertError) {
    console.error("[reconcile] suggestion insert failed", insertError.message);
  }
};

// Auto-link side effects depending on the source kind.
const applyAutoLink = async (
  facts: ReconcileFacts,
  candidate: Candidate
): Promise<void> => {
  if (facts.kind === "mynotary_document") {
    const writer = supabaseAdmin as unknown as {
      from: (table: "mynotary_signed_documents") => {
        update: (row: Record<string, unknown>) => {
          eq: (col: string, value: string) => Promise<{ error: unknown }>;
        };
      };
    };
    await writer
      .from("mynotary_signed_documents")
      .update({
        matched_seller_project_id: candidate.sellerProjectId,
        match_confidence: Math.min(candidate.score, 1),
        match_method: candidate.reasons.has("identity_email")
          ? "email_exact"
          : candidate.reasons.has("identity_phone")
            ? "email_exact"
            : "address_exact",
        match_attempted_at: new Date().toISOString(),
      })
      .eq("id", facts.sourceRef);
    return;
  }

  // SweepBright property (case 2 doublon) → attach the SweepBright line
  // to the existing estimator hub instead of creating a 2nd project.
  if (facts.kind === "sweepbright_property" && facts.propertyId) {
    await attachPropertyToSellerProject(candidate.clientProjectId, facts.propertyId, {
      isPrimary: false,
    });
  }
};

export const reconcileSourceRecord = async (
  facts: ReconcileFacts
): Promise<ReconcileResult> => {
  const candidates = new Map<string, Candidate>();
  const normalizedAddress = normalizeAddress(facts.address);

  // 1. Address candidates (seller_leads.property_address RPC).
  if (normalizedAddress) {
    const addressRpc = supabaseAdmin as unknown as AddressRpc;
    const { data: addrRows } = await addressRpc.rpc(
      "mynotary_match_seller_project_by_address",
      { p_query: normalizedAddress, p_min_similarity: 0.5, p_limit: 5 }
    );
    const sellerProjectIds = (addrRows ?? []).map((r) => r.seller_project_id);
    const spMap = await loadSellerProjects(sellerProjectIds);
    for (const row of addrRows ?? []) {
      const sp = spMap.get(row.seller_project_id) ?? null;
      if (!sp) continue;
      // address similarity → up to 0.7 (exact address alone is a
      // suggestion, never an auto-link without a confirmation band).
      const contribution = Math.min(row.similarity, 1) * 0.7;
      upsertCandidate(candidates, sp, sp.client_project_id, contribution, "address");
    }
  }

  // 1b. Address candidates via SweepBright properties → project_properties.
  //     Covers dossiers created from a SweepBright property *without* an
  //     estimator lead (seller_lead_id NULL): the matching address lives on
  //     the property, not on a seller_lead, so the lead-based RPC above
  //     would never surface them.
  if (normalizedAddress) {
    const propRpc = supabaseAdmin as unknown as PropertyMatchRpc;
    // Low threshold on purpose: the RPC compares the *raw* formatted_address
    // against the normalized query, so formatting differences (e.g.
    // "… Alpes-Maritimes" vs "… France 06000") drag the trigram score down
    // even for the same street. A weak address contributes little on its own
    // (0.3 × 0.7 ≈ 0.21, below the suggestion threshold), so a candidate only
    // survives here if the price + surface bands also confirm it — gated by
    // the address_price_surface rule below.
    const { data: propRows } = await propRpc.rpc("mynotary_match_address", {
      p_query: normalizedAddress,
      p_min_similarity: 0.3,
      p_limit: 8,
    });
    const simByProperty = new Map<string, number>();
    for (const row of propRows ?? []) {
      // SweepBright source reconciling against itself → skip its own line.
      if (
        facts.kind === "sweepbright_property" &&
        row.property_id === facts.propertyId
      ) {
        continue;
      }
      simByProperty.set(row.property_id, Math.min(row.similarity, 1));
    }
    if (simByProperty.size > 0) {
      const { data: links } = await supabaseAdmin
        .from("project_properties")
        .select("client_project_id, property_id")
        .in("property_id", Array.from(simByProperty.keys()))
        .is("unlinked_at", null);
      const linkRows = (links ?? []) as Array<{
        client_project_id: string;
        property_id: string;
      }>;
      const spByClientProject = await loadSellerProjectsByClientProject(
        linkRows.map((l) => l.client_project_id)
      );
      for (const link of linkRows) {
        const sim = simByProperty.get(link.property_id) ?? 0;
        const sp = spByClientProject.get(link.client_project_id) ?? null;
        upsertCandidate(
          candidates,
          sp,
          link.client_project_id,
          sim * 0.7,
          "address"
        );
      }
    }
  }

  // 2. Identity candidates (email / phone exact on seller_leads).
  const identities = facts.identities ?? [];
  if (identities.length > 0) {
    const idMap = await candidatesFromIdentities(identities);
    for (const [clientProjectId, info] of idMap.entries()) {
      const sp = info.sellerProjectId
        ? ({
            id: info.sellerProjectId,
            client_project_id: clientProjectId,
            seller_lead_id: info.sellerLeadId,
          } as SellerProjectLite)
        : null;
      upsertCandidate(candidates, sp, clientProjectId, info.score, info.reason);
    }
  }

  // 3. Name-fuzzy candidates (only when we have full names).
  const names = Array.from(
    new Set(
      identities
        .map((i) => i.fullName?.trim() ?? "")
        .filter((n) => n.length > 0)
    )
  );
  if (names.length > 0) {
    const namesRpc = supabaseAdmin as unknown as NamesRpc;
    const { data: nameRows } = await namesRpc.rpc(
      "mynotary_match_seller_project_by_names",
      { p_names: names, p_min_similarity: 0.55, p_limit: 5 }
    );
    const sellerProjectIds = (nameRows ?? []).map((r) => r.seller_project_id);
    const spMap = await loadSellerProjects(sellerProjectIds);
    for (const row of nameRows ?? []) {
      const sp = spMap.get(row.seller_project_id) ?? null;
      if (!sp) continue;
      const contribution = Math.min(row.similarity, 1) * 0.55;
      upsertCandidate(candidates, sp, sp.client_project_id, contribution, "name_fuzzy");
    }
  }

  // Drop the source's own hub (estimator lead reconciling against itself).
  if (facts.ownClientProjectId) {
    candidates.delete(facts.ownClientProjectId);
  }

  if (candidates.size === 0) {
    return {
      decision: "none",
      clientProjectId: null,
      score: 0,
      reasons: [],
      candidatesEvaluated: 0,
    };
  }

  // 4. Confirmation bands (price + living area) per candidate.
  for (const candidate of candidates.values()) {
    const projectFacts = await getProjectFacts(
      candidate.clientProjectId,
      candidate.sellerLeadId
    );
    if (withinBand(facts.price, projectFacts.price)) {
      candidate.score = Math.min(candidate.score + 0.15, 1);
      candidate.reasons.add("price_band");
    }
    if (withinBand(facts.livingArea, projectFacts.livingArea)) {
      candidate.score = Math.min(candidate.score + 0.12, 1);
      candidate.reasons.add("surface_band");
    }
    // Address + price + surface all concordent → same physical property.
    // This is strong enough to auto-link even when the raw address
    // similarity alone stays modest (different formatting between sources).
    if (
      candidate.reasons.has("address") &&
      candidate.reasons.has("price_band") &&
      candidate.reasons.has("surface_band")
    ) {
      candidate.score = Math.max(candidate.score, 0.85);
      candidate.reasons.add("address_price_surface");
    }
  }

  // 5. Pick the best candidate.
  const best = Array.from(candidates.values()).sort((a, b) => b.score - a.score)[0];
  const reasons = Array.from(best.reasons);

  const fieldsPreview: Record<string, unknown> = {
    source: {
      kind: facts.kind,
      address: facts.address ?? null,
      price: facts.price ?? null,
      living_area: facts.livingArea ?? null,
    },
    score: best.score,
    reasons,
  };

  if (best.score >= AUTO_LINK_THRESHOLD) {
    try {
      await applyAutoLink(facts, best);
    } catch (error) {
      console.error("[reconcile] auto-link failed", error);
    }
    return {
      decision: "auto_link",
      clientProjectId: best.clientProjectId,
      score: best.score,
      reasons,
      candidatesEvaluated: candidates.size,
    };
  }

  if (best.score >= SUGGESTION_THRESHOLD) {
    try {
      await upsertSuggestion({
        kind: facts.kind,
        sourceRef: facts.sourceRef,
        targetClientProjectId: best.clientProjectId,
        score: best.score,
        reasons,
        fieldsPreview,
      });
    } catch (error) {
      console.error("[reconcile] suggestion upsert failed", error);
    }
    return {
      decision: "suggestion",
      clientProjectId: best.clientProjectId,
      score: best.score,
      reasons,
      candidatesEvaluated: candidates.size,
    };
  }

  return {
    decision: "none",
    clientProjectId: null,
    score: best.score,
    reasons,
    candidatesEvaluated: candidates.size,
  };
};

// ─────────────────────────────────────────────────────────────────────
// Source-specific wrappers (build ReconcileFacts from DB rows).
// ─────────────────────────────────────────────────────────────────────

type SignedDocFactsRow = {
  id: string;
  matched_seller_project_id: string | null;
  seller_contacts: Array<{
    fullName: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
  }> | null;
  property_price: number | null;
  living_area: number | null;
  raw_payload: { parsed?: { inline_address?: string | null } } | null;
};

type PropertyMatchRpc = {
  rpc: (
    name: "mynotary_match_address",
    args: { p_query: string; p_min_similarity: number; p_limit: number }
  ) => Promise<{
    data: Array<{ property_id: string; similarity: number }> | null;
    error: { message: string } | null;
  }>;
};

// Case 1 (SweepBright + MyNotary, no estimator): a mandate is signed in
// MyNotary, the property exists in SweepBright but no Sillage dossier
// exists yet. We create the dossier from the SweepBright property +
// the MyNotary seller identity, then attach the property. Guarded:
// requires a matched SweepBright property AND a seller identity with an
// email so we never spawn empty/orphan projects.
const tryAutoCreateProjectFromMyNotary = async (
  facts: ReconcileFacts,
  documentId: string
): Promise<string | null> => {
  const identities = facts.identities ?? [];
  const primary = identities.find((i) => i.email && i.email.trim().length > 0);
  if (!primary?.email) return null;

  const normalizedAddress = normalizeAddress(facts.address);
  if (!normalizedAddress) return null;

  const rpc = supabaseAdmin as unknown as PropertyMatchRpc;
  const { data: propRows } = await rpc.rpc("mynotary_match_address", {
    p_query: normalizedAddress,
    p_min_similarity: 0.6,
    p_limit: 1,
  });
  const propertyId = propRows && propRows.length > 0 ? propRows[0].property_id : null;
  if (!propertyId) return null;

  const [firstName, ...rest] = (primary.fullName ?? "").trim().split(/\s+/);
  const profile = await createClientProfile({
    email: primary.email,
    phone: primary.phone ?? undefined,
    firstName: firstName || undefined,
    lastName: rest.join(" ") || undefined,
    fullName: primary.fullName ?? undefined,
  });
  if (!profile.clientProfileId) return null;

  const created = await createSellerProjectFromProperty({
    clientProfileId: profile.clientProfileId,
    propertyId,
  });

  const writer = supabaseAdmin as unknown as {
    from: (table: "mynotary_signed_documents") => {
      update: (row: Record<string, unknown>) => {
        eq: (col: string, value: string) => Promise<{ error: unknown }>;
      };
    };
  };
  await writer
    .from("mynotary_signed_documents")
    .update({
      matched_seller_project_id: created.sellerProjectId,
      matched_property_id: propertyId,
      match_confidence: 0.85,
      match_method: "address_exact",
      match_attempted_at: new Date().toISOString(),
    })
    .eq("id", documentId);

  return created.clientProjectId;
};

export const reconcileMyNotaryDocument = async (
  documentId: string,
  options?: { autoCreate?: boolean }
): Promise<ReconcileResult> => {
  const { data } = await supabaseAdmin
    .from("mynotary_signed_documents")
    .select(
      "id, matched_seller_project_id, seller_contacts, property_price, living_area, raw_payload"
    )
    .eq("id", documentId)
    .maybeSingle();
  const doc = data as unknown as SignedDocFactsRow | null;
  if (!doc) {
    return { decision: "none", clientProjectId: null, score: 0, reasons: [], candidatesEvaluated: 0 };
  }

  const identities: ReconcileIdentity[] = (doc.seller_contacts ?? []).map((c) => ({
    email: c.email,
    phone: c.phone,
    fullName: c.fullName,
  }));

  const facts: ReconcileFacts = {
    kind: "mynotary_document",
    sourceRef: documentId,
    address: doc.raw_payload?.parsed?.inline_address ?? null,
    price: doc.property_price ?? null,
    livingArea: doc.living_area ?? null,
    identities,
  };

  const result = await reconcileSourceRecord(facts);

  // Case 1 auto-creation: only when reconcile found nothing AND the
  // caller opted in (the signature-completed path does).
  if (
    result.decision === "none" &&
    options?.autoCreate &&
    !doc.matched_seller_project_id
  ) {
    try {
      const clientProjectId = await tryAutoCreateProjectFromMyNotary(facts, documentId);
      if (clientProjectId) {
        return {
          decision: "auto_link",
          clientProjectId,
          score: 0.85,
          reasons: ["auto_created_from_property"],
          candidatesEvaluated: result.candidatesEvaluated,
        };
      }
    } catch (error) {
      console.error("[reconcile] auto-create project (case 1) failed", error);
    }
  }

  return result;
};

export const reconcileSweepBrightProperty = async (
  propertyId: string
): Promise<ReconcileResult> => {
  const { data: property } = await supabaseAdmin
    .from("properties")
    .select("id, formatted_address, living_area, raw_payload")
    .eq("id", propertyId)
    .maybeSingle();
  if (!property) {
    return { decision: "none", clientProjectId: null, score: 0, reasons: [], candidatesEvaluated: 0 };
  }

  const { data: listing } = await supabaseAdmin
    .from("property_listings")
    .select("price_amount")
    .eq("property_id", propertyId)
    .maybeSingle();

  const vendors = extractVendorIdentitiesFromRawPayload(
    (property as { raw_payload: unknown }).raw_payload
  );

  const facts: ReconcileFacts = {
    kind: "sweepbright_property",
    sourceRef: propertyId,
    propertyId,
    address: (property as { formatted_address: string | null }).formatted_address,
    price: (listing as { price_amount: number | null } | null)?.price_amount ?? null,
    livingArea: (property as { living_area: number | null }).living_area,
    identities: vendors,
  };

  return reconcileSourceRecord(facts);
};

export const reconcileEstimatorLead = async (
  sellerLeadId: string,
  ownClientProjectId?: string | null
): Promise<ReconcileResult> => {
  const { data: lead } = await supabaseAdmin
    .from("seller_leads")
    .select("id, email, phone, full_name, property_address, estimated_price")
    .eq("id", sellerLeadId)
    .maybeSingle();
  if (!lead) {
    return { decision: "none", clientProjectId: null, score: 0, reasons: [], candidatesEvaluated: 0 };
  }
  const row = lead as {
    id: string;
    email: string | null;
    phone: string | null;
    full_name: string | null;
    property_address: string | null;
    estimated_price: number | null;
  };

  const facts: ReconcileFacts = {
    kind: "estimator_lead",
    sourceRef: sellerLeadId,
    address: row.property_address,
    price: row.estimated_price,
    livingArea: null,
    identities: [{ email: row.email, phone: row.phone, fullName: row.full_name }],
    ownClientProjectId: ownClientProjectId ?? null,
  };

  return reconcileSourceRecord(facts);
};

// Defensive extraction of SweepBright vendor identities from a
// property's raw_payload (same shape handling as the sync service).
const extractVendorIdentitiesFromRawPayload = (
  rawPayload: unknown
): ReconcileIdentity[] => {
  if (!rawPayload || typeof rawPayload !== "object") return [];
  const vendors = (rawPayload as Record<string, unknown>).vendors;
  const list = Array.isArray(vendors) ? vendors : vendors ? [vendors] : [];
  const out: ReconcileIdentity[] = [];
  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const v = entry as Record<string, unknown>;
    const firstName =
      (typeof v.first_name === "string" && v.first_name) ||
      (typeof v.firstname === "string" && v.firstname) ||
      "";
    const lastName =
      (typeof v.last_name === "string" && v.last_name) ||
      (typeof v.lastname === "string" && v.lastname) ||
      "";
    const fullName =
      [firstName, lastName].filter(Boolean).join(" ").trim() ||
      (typeof v.name === "string" ? v.name.trim() : "") ||
      null;
    const email =
      typeof v.email === "string"
        ? v.email
        : Array.isArray(v.emails) && typeof (v.emails[0] as Record<string, unknown>)?.address === "string"
          ? ((v.emails[0] as Record<string, unknown>).address as string)
          : null;
    const phone =
      typeof v.phone === "string"
        ? v.phone
        : Array.isArray(v.phones) && typeof (v.phones[0] as Record<string, unknown>)?.number === "string"
          ? ((v.phones[0] as Record<string, unknown>).number as string)
          : null;
    if (!fullName && !email && !phone) continue;
    out.push({ email, phone, fullName });
  }
  return out;
};
