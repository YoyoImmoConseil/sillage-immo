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
};

export type BuyerSignupInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  rgpdAcceptedAt: string;
  sourceUrl?: string | null;
  initialFilters?: Record<string, unknown>;
  criteria: BuyerSignupCriteriaInput;
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
}): Promise<BuyerLeadRow> => {
  const fullName = [input.firstName, input.lastName].filter(Boolean).join(" ").trim() || input.email;

  const { data: existingData, error: existingError } = await supabaseAdmin
    .from("buyer_leads")
    .select("*")
    .eq("email", input.email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingError) throw existingError;
  const existing = (existingData as BuyerLeadRow | null) ?? null;

  if (existing) {
    const metadata = (existing.metadata ?? {}) as Record<string, unknown>;
    const mergedMetadata = {
      ...metadata,
      origin: metadata.origin ?? input.origin,
      rgpdAcceptedAt: metadata.rgpdAcceptedAt ?? input.rgpdAcceptedAt,
      sourceUrl: input.sourceUrl ?? metadata.sourceUrl ?? null,
      lastSignupAt: new Date().toISOString(),
      initialFilters: metadata.initialFilters ?? input.initialFilters ?? null,
    };

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("buyer_leads")
      .update({
        full_name: existing.full_name || fullName,
        phone: existing.phone ?? input.phone,
        contact_identity_id: existing.contact_identity_id ?? input.contactIdentityId,
        source: existing.source ?? input.origin,
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
      phone: input.phone,
      source: input.origin,
      contact_identity_id: input.contactIdentityId,
      metadata: {
        origin: input.origin,
        rgpdAcceptedAt: input.rgpdAcceptedAt,
        sourceUrl: input.sourceUrl,
        initialFilters: input.initialFilters ?? null,
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
  const origin = "website_buyer_signup";

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
      },
    })
    .select("id")
    .single();
  if (searchProfileError || !searchProfile) {
    throw searchProfileError ?? new Error("Impossible de creer le profil de recherche acquereur.");
  }

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
  });

  try {
    const { recomputeMatchesForBuyerLead } = await import("./buyer-matching.service");
    await recomputeMatchesForBuyerLead(buyerLead.id);
  } catch (error) {
    console.error("[buyer-signup] initial recompute failed", error);
  }

  // Audit
  await supabaseAdmin.from("audit_log").insert({
    actor_type: "anonymous",
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
};
