import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  ensureContactIdentity,
  normalizeEmail,
  normalizePhone,
} from "@/services/contacts/contact-identity.service";
import { createClientProfile } from "@/services/clients/client-profile.service";
import {
  createClientProject,
  emitClientProjectEvent,
} from "@/services/clients/client-project.service";
import { createInvitation } from "@/services/clients/client-project-invitation.service";
import type { PropertyBusinessType } from "@/types/domain/properties";
import type { Database } from "@/types/db/supabase";

type BuyerLeadRow = Database["public"]["Tables"]["buyer_leads"]["Row"];

export type BuyerSignupCriteriaInput = {
  businessType: PropertyBusinessType;
  cities: string[];
  propertyTypes: string[];
  locationText?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  roomsMin?: number | null;
  roomsMax?: number | null;
  bedroomsMin?: number | null;
  livingAreaMin?: number | null;
  livingAreaMax?: number | null;
  floorMin?: number | null;
  floorMax?: number | null;
  requiresTerrace?: boolean | null;
  requiresElevator?: boolean | null;
  zonePolygon?: Array<[number, number]> | null;
};

export type BuyerSignupInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  rgpdAcceptedAt: string;
  sourceUrl?: string | null;
  initialFilters?: Record<string, unknown>;
  /**
   * Stable id of the originating record (e.g. SweepBright lead id). Used for
   * idempotent inbound upsert + identity merge: an existing lead matched by
   * external_id (or email) is enriched and gets the external_id attached
   * (never overwritten once set).
   */
  externalId?: string | null;
  criteria: BuyerSignupCriteriaInput;
  /**
   * Collaborateur Sillage (admin_profile) auquel rattacher le lead. Résolu en
   * amont (ex. depuis l'assignee SweepBright). N'écrase jamais une assignation
   * déjà posée sur un lead existant.
   */
  assignedAdminProfileId?: string | null;
  /** Indices bruts d'assignee (email/id/nom) conservés en metadata. */
  assignee?: Record<string, unknown> | null;
  /**
   * Origine de la création. Par défaut le signup public
   * (`website_buyer_signup`). La création manuelle en back-office passe
   * `admin_manual_creation`.
   */
  origin?: string;
  /** Id du profil admin créateur (création manuelle), pour l'audit. */
  createdByAdminId?: string | null;
};

export type BuyerSignupResult = {
  buyerLeadId: string;
  clientProfileId: string;
  clientProjectId: string;
  buyerProjectId: string;
  buyerSearchProfileId: string;
  invitationToken: string;
};

const getOrCreateBuyerLead = async (input: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  contactIdentityId: string | null;
  origin: string;
  rgpdAcceptedAt: string;
  sourceUrl: string | null;
  initialFilters: Record<string, unknown> | undefined;
  externalId?: string | null;
  assignedAdminProfileId?: string | null;
  assignee?: Record<string, unknown> | null;
}): Promise<BuyerLeadRow> => {
  const fullName = [input.firstName, input.lastName].filter(Boolean).join(" ").trim() || input.email;

  // Identity resolution: prefer the stable external id (a SweepBright Zap
  // retry / "Lead Updated"), then fall back to email so a self-service lead
  // created on the website merges with the incoming SweepBright record.
  let existing: BuyerLeadRow | null = null;
  if (input.externalId) {
    const { data, error } = await supabaseAdmin
      .from("buyer_leads")
      .select("*")
      .eq("external_id", input.externalId)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    existing = (data as BuyerLeadRow | null) ?? null;
  }
  if (!existing) {
    const { data, error } = await supabaseAdmin
      .from("buyer_leads")
      .select("*")
      .eq("email", input.email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    existing = (data as BuyerLeadRow | null) ?? null;
  }

  if (existing) {
    const metadata = (existing.metadata ?? {}) as Record<string, unknown>;
    const mergedMetadata = {
      ...metadata,
      origin: metadata.origin ?? input.origin,
      rgpdAcceptedAt: metadata.rgpdAcceptedAt ?? input.rgpdAcceptedAt,
      sourceUrl: input.sourceUrl ?? metadata.sourceUrl ?? null,
      lastSignupAt: new Date().toISOString(),
      initialFilters: metadata.initialFilters ?? input.initialFilters ?? null,
      assignee: input.assignee ?? metadata.assignee ?? null,
    };

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("buyer_leads")
      .update({
        full_name: existing.full_name || fullName,
        phone: existing.phone ?? input.phone,
        contact_identity_id: existing.contact_identity_id ?? input.contactIdentityId,
        source: existing.source ?? input.origin,
        // Attach the SweepBright id the first time; never overwrite an
        // already-linked external id.
        external_id: existing.external_id ?? input.externalId ?? null,
        // Auto-assign only if the lead has no advisor yet (don't override a
        // manual assignment).
        assigned_admin_profile_id:
          existing.assigned_admin_profile_id ?? input.assignedAdminProfileId ?? null,
        metadata: mergedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (updateError || !updated) throw updateError ?? new Error("Impossible de mettre a jour le lead acquereur existant.");
    return updated as BuyerLeadRow;
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("buyer_leads")
    .insert({
      full_name: fullName,
      email: input.email,
      assigned_admin_profile_id: input.assignedAdminProfileId ?? null,
      phone: input.phone,
      source: input.origin,
      contact_identity_id: input.contactIdentityId,
      external_id: input.externalId ?? null,
      metadata: {
        origin: input.origin,
        rgpdAcceptedAt: input.rgpdAcceptedAt,
        sourceUrl: input.sourceUrl,
        initialFilters: input.initialFilters ?? null,
        assignee: input.assignee ?? null,
      },
    })
    .select("*")
    .single();
  if (insertError || !inserted) {
    throw insertError ?? new Error("Impossible de creer le lead acquereur.");
  }
  return inserted as BuyerLeadRow;
};

const buildProjectTitle = (criteria: BuyerSignupCriteriaInput) => {
  const businessLabel = criteria.businessType === "rental" ? "Location" : "Achat";
  const area =
    criteria.locationText?.trim() ||
    (criteria.cities.length > 0 ? criteria.cities.join(", ") : "");
  return area ? `${businessLabel} - ${area}` : `${businessLabel} acquereur`;
};

export const createBuyerSearchSignup = async (
  input: BuyerSignupInput
): Promise<BuyerSignupResult> => {
  const email = normalizeEmail(input.email);
  if (!email) {
    throw new Error("Email acquereur invalide.");
  }

  const phone = normalizePhone(input.phone);
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim() || email;
  const origin = input.origin?.trim() || "website_buyer_signup";
  const createdByAdminId = input.createdByAdminId ?? null;

  const contactIdentity = await ensureContactIdentity({
    email,
    phone,
    firstName: firstName || null,
    lastName: lastName || null,
    fullName,
    metadata: {
      source: origin,
      capture_kind: "buyer_signup",
    },
  });

  const buyerLead = await getOrCreateBuyerLead({
    firstName,
    lastName,
    email,
    phone,
    contactIdentityId: contactIdentity?.id ?? null,
    origin,
    rgpdAcceptedAt: input.rgpdAcceptedAt,
    sourceUrl: input.sourceUrl ?? null,
    initialFilters: input.initialFilters,
    externalId: input.externalId ?? null,
    assignedAdminProfileId: input.assignedAdminProfileId ?? null,
    assignee: input.assignee ?? null,
  });

  const clientProfileResult = await createClientProfile({
    email,
    phone: phone ?? undefined,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    fullName,
  });
  const clientProfileId = clientProfileResult.clientProfileId;

  const clientProjectId = await createClientProject({
    clientProfileId,
    projectType: "buyer",
    title: buildProjectTitle(input.criteria),
    createdFrom: "buyer_lead",
    source: origin,
  });

  // Compensation : Supabase ne permet pas de transaction multi-tables côté
  // API, donc en cas d'échec d'une étape on supprime ce qui vient d'être
  // créé (le lead et le profil client sont réutilisés au prochain essai,
  // inutile de les supprimer).
  let createdSearchProfileId: string | null = null;
  let createdBuyerProjectId: string | null = null;
  const rollbackSignupArtifacts = async () => {
    try {
      if (createdBuyerProjectId) {
        await supabaseAdmin.from("buyer_projects").delete().eq("id", createdBuyerProjectId);
      }
      if (createdSearchProfileId) {
        await supabaseAdmin
          .from("buyer_search_profiles")
          .delete()
          .eq("id", createdSearchProfileId);
      }
      await supabaseAdmin.from("client_projects").delete().eq("id", clientProjectId);
    } catch (rollbackError) {
      console.error(
        "[buyer-signup] rollback failed (artefacts orphelins a nettoyer):",
        rollbackError instanceof Error ? rollbackError.message : rollbackError
      );
    }
  };

  try {
    const { data: searchProfile, error: searchProfileError } = await supabaseAdmin
      .from("buyer_search_profiles")
      .insert({
        buyer_lead_id: buyerLead.id,
        client_project_id: clientProjectId,
        business_type: input.criteria.businessType,
        status: "active",
        location_text: input.criteria.locationText?.trim() || null,
        cities: input.criteria.cities,
        property_types: input.criteria.propertyTypes,
        budget_min: input.criteria.budgetMin ?? null,
        budget_max: input.criteria.budgetMax ?? null,
        rooms_min: input.criteria.roomsMin ?? null,
        rooms_max: input.criteria.roomsMax ?? null,
        bedrooms_min: input.criteria.bedroomsMin ?? null,
        living_area_min: input.criteria.livingAreaMin ?? null,
        living_area_max: input.criteria.livingAreaMax ?? null,
        floor_min: input.criteria.floorMin ?? null,
        floor_max: input.criteria.floorMax ?? null,
        requires_terrace: input.criteria.requiresTerrace ?? null,
        requires_elevator: input.criteria.requiresElevator ?? null,
        criteria: {
          source: origin,
          ...(input.criteria.zonePolygon && input.criteria.zonePolygon.length >= 3
            ? { zonePolygon: input.criteria.zonePolygon }
            : {}),
        },
      })
      .select("id")
      .single();
    if (searchProfileError || !searchProfile) {
      throw searchProfileError ?? new Error("Impossible de creer le profil de recherche acquereur.");
    }
    createdSearchProfileId = searchProfile.id;

    const { data: buyerProject, error: buyerProjectError } = await supabaseAdmin
      .from("buyer_projects")
      .insert({
        client_project_id: clientProjectId,
        buyer_lead_id: buyerLead.id,
        active_search_profile_id: searchProfile.id,
        metadata: {
          origin,
          sourceUrl: input.sourceUrl ?? null,
        },
      })
      .select("id")
      .single();
    if (buyerProjectError || !buyerProject) {
      throw buyerProjectError ?? new Error("Impossible de creer le projet acquereur.");
    }
    createdBuyerProjectId = buyerProject.id;

    await emitClientProjectEvent({
      clientProjectId,
      eventName: "buyer_project.created_from_signup",
      eventCategory: "project",
      actorType: "client",
      visibleToClient: true,
      payload: {
        buyer_lead_id: buyerLead.id,
        buyer_search_profile_id: searchProfile.id,
        origin,
      },
    });

    const invitation = await createInvitation({
      clientProjectId,
      clientProfileId,
      email,
      providerHint: "email",
      createdByAdminId: createdByAdminId ?? undefined,
    });

    try {
      const { recomputeMatchesForBuyerLead } = await import("./buyer-matching.service");
      await recomputeMatchesForBuyerLead(buyerLead.id);
    } catch (error) {
      console.error("[buyer-signup] initial recompute failed", error);
    }

    // Audit
    await supabaseAdmin.from("audit_log").insert({
      actor_type: createdByAdminId ? "admin" : "anonymous",
      actor_id: createdByAdminId,
      action: "buyer_signup_created",
      entity_type: "buyer_lead",
      entity_id: buyerLead.id,
      data: {
        email,
        client_project_id: clientProjectId,
        buyer_search_profile_id: searchProfile.id,
        origin,
      },
    });

    return {
      buyerLeadId: buyerLead.id,
      clientProfileId,
      clientProjectId,
      buyerProjectId: buyerProject.id,
      buyerSearchProfileId: searchProfile.id,
      invitationToken: invitation.token,
    };
  } catch (error) {
    await rollbackSignupArtifacts();
    throw error;
  }
};

export type BuyerUpsertResult = {
  buyerLeadId: string;
  created: boolean;
  clientProjectId: string | null;
  buyerSearchProfileId: string | null;
};

const findExistingBuyerLead = async (
  externalId: string | null,
  email: string
): Promise<BuyerLeadRow | null> => {
  if (externalId) {
    const { data, error } = await supabaseAdmin
      .from("buyer_leads")
      .select("*")
      .eq("external_id", externalId)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (data) return data as BuyerLeadRow;
  }
  const { data, error } = await supabaseAdmin
    .from("buyer_leads")
    .select("*")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as BuyerLeadRow | null) ?? null;
};

/**
 * Point d'entrée idempotent pour les intégrations (Zapier / SweepBright).
 *
 * - Lead inconnu (external_id puis email) → création complète via
 *   `createBuyerSearchSignup` (lead + projet + profil de recherche + matching).
 * - Lead déjà connu → on enrichit la fiche et on met à jour **en place** le
 *   profil de recherche le plus récent (pas de doublon de projet), puis on
 *   relance le matching. Sémantique « coalesce » : on n'écrase un critère que
 *   si une valeur exploitable est fournie (on ne vide jamais un critère
 *   existant avec un champ non mappé côté SweepBright).
 */
export const upsertBuyerLeadFromIntegration = async (
  input: BuyerSignupInput
): Promise<BuyerUpsertResult> => {
  const email = normalizeEmail(input.email);
  if (!email) throw new Error("Email acquereur invalide.");

  const existing = await findExistingBuyerLead(input.externalId ?? null, email);
  if (!existing) {
    const signup = await createBuyerSearchSignup(input);
    return {
      buyerLeadId: signup.buyerLeadId,
      created: true,
      clientProjectId: signup.clientProjectId,
      buyerSearchProfileId: signup.buyerSearchProfileId,
    };
  }

  const phone = normalizePhone(input.phone);
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const fullName =
    [firstName, lastName].filter(Boolean).join(" ").trim() || email;
  const origin = input.origin?.trim() || "zapier_integration";

  const contactIdentity = await ensureContactIdentity({
    email,
    phone,
    firstName: firstName || null,
    lastName: lastName || null,
    fullName,
    metadata: { source: origin, capture_kind: "buyer_signup" },
  });

  const lead = await getOrCreateBuyerLead({
    firstName,
    lastName,
    email,
    phone,
    contactIdentityId: contactIdentity?.id ?? null,
    origin,
    rgpdAcceptedAt: input.rgpdAcceptedAt,
    sourceUrl: input.sourceUrl ?? null,
    initialFilters: input.initialFilters,
    externalId: input.externalId ?? null,
    assignedAdminProfileId: input.assignedAdminProfileId ?? null,
    assignee: input.assignee ?? null,
  });

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("buyer_search_profiles")
    .select("id, client_project_id")
    .eq("buyer_lead_id", lead.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (profileError) throw profileError;

  // Lead connu mais sans profil de recherche (ex. contact self-service fusionné
  // par email) → on crée le projet/profil manquant via le rail standard.
  if (!profile) {
    const signup = await createBuyerSearchSignup(input);
    return {
      buyerLeadId: lead.id,
      created: false,
      clientProjectId: signup.clientProjectId,
      buyerSearchProfileId: signup.buyerSearchProfileId,
    };
  }

  const c = input.criteria;
  const patch: Record<string, unknown> = {
    business_type: c.businessType,
    updated_at: new Date().toISOString(),
  };
  if (c.cities.length > 0) patch.cities = c.cities;
  if (c.propertyTypes.length > 0) patch.property_types = c.propertyTypes;
  const setIf = (key: string, value: number | boolean | string | null | undefined) => {
    if (value !== null && value !== undefined) patch[key] = value;
  };
  setIf("location_text", c.locationText ?? undefined);
  setIf("budget_min", c.budgetMin ?? undefined);
  setIf("budget_max", c.budgetMax ?? undefined);
  setIf("rooms_min", c.roomsMin ?? undefined);
  setIf("rooms_max", c.roomsMax ?? undefined);
  setIf("bedrooms_min", c.bedroomsMin ?? undefined);
  setIf("living_area_min", c.livingAreaMin ?? undefined);
  setIf("living_area_max", c.livingAreaMax ?? undefined);
  setIf("floor_min", c.floorMin ?? undefined);
  setIf("floor_max", c.floorMax ?? undefined);
  setIf("requires_terrace", c.requiresTerrace ?? undefined);
  setIf("requires_elevator", c.requiresElevator ?? undefined);

  const { error: updateError } = await supabaseAdmin
    .from("buyer_search_profiles")
    .update(patch)
    .eq("id", profile.id);
  if (updateError) throw updateError;

  try {
    const { recomputeMatchesForBuyerLead } = await import("./buyer-matching.service");
    await recomputeMatchesForBuyerLead(lead.id);
  } catch (error) {
    console.error("[buyer-upsert] recompute failed", error);
  }

  return {
    buyerLeadId: lead.id,
    created: false,
    clientProjectId: (profile.client_project_id as string | null) ?? null,
    buyerSearchProfileId: profile.id,
  };
};
