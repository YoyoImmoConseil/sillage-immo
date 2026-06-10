import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { parseAdminProfileMetadata } from "@/services/admin/admin-profile-metadata";
import { splitFullName } from "@/services/contacts/contact-identity.service";
import { ensureEstimationProperty } from "@/services/properties/estimation-property.service";
import { createInvitation } from "./client-project-invitation.service";
import {
  addClientToProject,
  createClientProject,
  emitClientProjectEvent,
} from "./client-project.service";
import { createClientProfile, getClientById } from "./client-profile.service";
import type { SellerProjectEntryChannel } from "@/types/domain/client";

export type CreateSellerProjectFromLeadInput = {
  sellerLeadId: string;
  adminProfileId?: string;
};

export type CreateSellerProjectFromPropertyInput = {
  clientProfileId: string;
  propertyId: string;
  adminProfileId?: string;
};

export type SellerPortalAccessProvision = {
  sellerProjectId: string;
  clientProjectId: string;
  clientProfileId: string;
  portalAccess: {
    mode: "invite" | "login";
    email: string;
    nextPath: string;
    inviteToken: string | null;
  };
};

export type SellerProjectMilestones = {
  // Each milestone is `null` when not yet reached. `at` is a strict
  // ISO-8601 timestamp (the form uses an <input type="date"> and we
  // serialize at noon UTC to stay timezone-stable).
  mandateSignedAt: string | null;
  offerReceivedAt: string | null;
  offerBuyerLeadId: string | null;
  offerBuyerName: string | null;
  preliminarySaleSignedAt: string | null;
  deedSignedAt: string | null;
  // Convenience: when an offerBuyerLeadId resolves, we hydrate this
  // snapshot for the UI (avoids one extra query from the page).
  offerBuyerLead?: {
    id: string;
    fullName: string | null;
    email: string;
  } | null;
};

export type SellerProjectDetail = {
  id: string;
  clientProjectId: string;
  sellerLeadId: string | null;
  assignedAdminProfileId: string | null;
  entryChannel: string;
  projectStatus: string;
  mandateStatus: string;
  createdAt: string;
  milestones: SellerProjectMilestones;
  assignedAdvisor?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    fullName: string | null;
    email: string;
    phone: string | null;
    bookingUrl: string | null;
  } | null;
  sellerLead?: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    estimated_price: number | null;
  } | null;
  properties: Array<{
    id: string;
    propertyId: string;
    relationshipType: string;
    isPrimary: boolean;
    property?: {
      id: string;
      formatted_address: string | null;
      property_type: string | null;
      living_area: number | null;
    };
  }>;
  advisorHistory: Array<{
    id: string;
    adminProfileId: string;
    assignedAt: string;
    unassignedAt: string | null;
    adminProfile?: { first_name: string | null; last_name: string | null; email: string };
  }>;
  latestInvitation?: {
    id: string;
    email: string;
    createdAt: string;
    expiresAt: string;
    acceptedAt: string | null;
    revokedAt: string | null;
  } | null;
};

const createAdvisorHistoryAssignment = async (input: {
  sellerProjectId: string;
  adminProfileId?: string | null;
  assignedByAdminId?: string;
  reason?: string | null;
}) => {
  if (!input.adminProfileId) return;

  const { error } = await supabaseAdmin.from("seller_project_advisor_history").insert({
    seller_project_id: input.sellerProjectId,
    admin_profile_id: input.adminProfileId,
    assigned_by_admin_profile_id: input.assignedByAdminId ?? null,
    reason: input.reason ?? null,
  });
  if (error) throw error;
};

const ensureLeadIsNotAlreadyLinked = async (
  sellerLeadId: string,
  currentSellerProjectId?: string
) => {
  const { data, error } = await supabaseAdmin
    .from("seller_projects")
    .select("id")
    .eq("seller_lead_id", sellerLeadId)
    .maybeSingle();
  if (error) throw error;

  if (data && data.id !== currentSellerProjectId) {
    throw new Error("Ce lead vendeur est deja rattache a un autre projet.");
  }
};

export const createSellerProjectFromLead = async (
  input: CreateSellerProjectFromLeadInput
) => {
  await ensureLeadIsNotAlreadyLinked(input.sellerLeadId);

  const { data: lead, error: leadErr } = await supabaseAdmin
    .from("seller_leads")
    .select("id, email, phone, full_name, assigned_admin_profile_id")
    .eq("id", input.sellerLeadId)
    .single();
  if (leadErr || !lead) throw new Error("Lead vendeur introuvable");

  const { firstName, lastName } = splitFullName(lead.full_name);

  const result = await createClientProfile({
    email: lead.email,
    phone: lead.phone ?? undefined,
    firstName: firstName ?? undefined,
    lastName: lastName ?? undefined,
    fullName: lead.full_name ?? undefined,
  });

  const clientProfileIdResolved = result.clientProfileId;
  if (!clientProfileIdResolved) throw new Error("Impossible de créer ou retrouver le client");

  const projectId = await createClientProject({
    clientProfileId: clientProfileIdResolved,
    projectType: "seller",
    title: `Vente - ${lead.full_name ?? lead.email}`,
    createdFrom: "seller_lead",
    primaryAdminProfileId: input.adminProfileId,
  });

  const { data: sp, error: spErr } = await supabaseAdmin
    .from("seller_projects")
    .insert({
      client_project_id: projectId,
      seller_lead_id: input.sellerLeadId,
      assigned_admin_profile_id: input.adminProfileId ?? lead.assigned_admin_profile_id ?? null,
      entry_channel: "sillage_tunnel" as SellerProjectEntryChannel,
      project_status: "estimation_realisee",
      mandate_status: "none",
    })
    .select("id")
    .single();
  if (spErr) {
    // Rollback : ne pas laisser un client_project orphelin (le profil
    // client est réutilisé au prochain essai, on le conserve).
    await supabaseAdmin.from("client_projects").delete().eq("id", projectId);
    throw spErr;
  }

  try {
    await createAdvisorHistoryAssignment({
      sellerProjectId: sp.id,
      adminProfileId: input.adminProfileId ?? lead.assigned_admin_profile_id ?? null,
      assignedByAdminId: input.adminProfileId,
      reason: "Creation depuis lead vendeur",
    });

    await emitClientProjectEvent({
      clientProjectId: projectId,
      sellerProjectId: sp.id,
      eventName: "seller_project.created_from_lead",
      eventCategory: "project",
      actorType: "admin",
      actorId: input.adminProfileId ?? undefined,
      payload: { seller_lead_id: input.sellerLeadId },
    });

    await ensureEstimationProperty({
      sellerLeadId: input.sellerLeadId,
      clientProjectId: projectId,
      linkedByAdminProfileId: input.adminProfileId ?? lead.assigned_admin_profile_id ?? null,
    });
  } catch (error) {
    await supabaseAdmin.from("seller_projects").delete().eq("id", sp.id);
    await supabaseAdmin.from("client_projects").delete().eq("id", projectId);
    throw error;
  }

  return { clientProjectId: projectId, sellerProjectId: sp.id, clientProfileId: clientProfileIdResolved };
};

export const createSellerProjectManual = async (params: {
  clientProjectId: string;
  adminProfileId?: string;
}) => {
  const { data: sp, error } = await supabaseAdmin
    .from("seller_projects")
    .insert({
      client_project_id: params.clientProjectId,
      assigned_admin_profile_id: params.adminProfileId ?? null,
      entry_channel: "admin_created" as SellerProjectEntryChannel,
      project_status: "estimation_realisee",
      mandate_status: "none",
    })
    .select("id")
    .single();
  if (error) throw error;

  await createAdvisorHistoryAssignment({
    sellerProjectId: sp.id,
    adminProfileId: params.adminProfileId ?? null,
    assignedByAdminId: params.adminProfileId,
    reason: "Creation manuelle du projet vendeur",
  });

  await emitClientProjectEvent({
    clientProjectId: params.clientProjectId,
    sellerProjectId: sp.id,
    eventName: "seller_project.created_manual",
    eventCategory: "project",
    actorType: "admin",
    actorId: params.adminProfileId,
  });

  return sp.id;
};

export const createSellerProjectFromProperty = async (
  input: CreateSellerProjectFromPropertyInput
) => {
  const projectId = await createClientProject({
    clientProfileId: input.clientProfileId,
    projectType: "seller",
    title: undefined,
    createdFrom: "crm_property",
    primaryAdminProfileId: input.adminProfileId,
  });

  const { data: sp, error: spErr } = await supabaseAdmin
    .from("seller_projects")
    .insert({
      client_project_id: projectId,
      assigned_admin_profile_id: input.adminProfileId ?? null,
      entry_channel: "crm_direct" as SellerProjectEntryChannel,
      project_status: "estimation_realisee",
      mandate_status: "none",
    })
    .select("id")
    .single();
  if (spErr) throw spErr;

  try {
    // The primary membership (`client_project_clients` row) is already
    // created by `createClientProject` above; nothing to do here for the
    // single-owner case.

    const { error: propertyLinkError } = await supabaseAdmin.from("project_properties").insert({
      client_project_id: projectId,
      property_id: input.propertyId,
      relationship_type: "seller_subject_property",
      is_primary: true,
      linked_by_admin_profile_id: input.adminProfileId ?? null,
    });
    if (propertyLinkError) throw propertyLinkError;

    await createAdvisorHistoryAssignment({
      sellerProjectId: sp.id,
      adminProfileId: input.adminProfileId ?? null,
      assignedByAdminId: input.adminProfileId,
      reason: "Creation depuis fiche bien",
    });

    await emitClientProjectEvent({
      clientProjectId: projectId,
      sellerProjectId: sp.id,
      eventName: "seller_project.created_from_crm",
      eventCategory: "project",
      actorType: "admin",
      actorId: input.adminProfileId ?? undefined,
      payload: { property_id: input.propertyId },
    });

    await emitClientProjectEvent({
      clientProjectId: projectId,
      sellerProjectId: sp.id,
      eventName: "project_property.linked",
      eventCategory: "project",
      actorType: "admin",
      actorId: input.adminProfileId ?? undefined,
      payload: { property_id: input.propertyId },
    });
  } catch (error) {
    await supabaseAdmin.from("seller_projects").delete().eq("id", sp.id);
    await supabaseAdmin.from("client_projects").delete().eq("id", projectId);
    throw error;
  }

  return { clientProjectId: projectId, sellerProjectId: sp.id };
};

// =====================================================================
// Indivision : creation de projet vendeur partage par N proprietaires
// =====================================================================
//
// Each entry of `coOwners` is either:
//   - { clientProfileId } -> reuse an existing client_profile,
//   - { email, firstName?, lastName?, phone? } -> resolve / create a
//     client_profile via createClientProfile (idempotent on email).
// Order matters: the first entry becomes the legacy primary
// (`client_projects.client_profile_id`) AND the active primary in
// `client_project_clients`. Subsequent entries become co_owner rows.

export type CoOwnerInputExisting = { clientProfileId: string };
export type CoOwnerInputNew = {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
};
export type CoOwnerInput = CoOwnerInputExisting | CoOwnerInputNew;

export type CreateSellerProjectFromPropertyWithCoOwnersInput = {
  propertyId: string;
  coOwners: CoOwnerInput[];
  adminProfileId?: string;
};

export type CreateSellerProjectFromPropertyWithCoOwnersResult = {
  clientProjectId: string;
  sellerProjectId: string;
  primaryClientProfileId: string;
  coOwnerClientProfileIds: string[];
};

const resolveCoOwnerClientProfileId = async (
  input: CoOwnerInput
): Promise<string> => {
  if ("clientProfileId" in input && input.clientProfileId) {
    const existing = await getClientById(input.clientProfileId);
    if (!existing) {
      throw new Error("Client co-proprietaire introuvable.");
    }
    return existing.id;
  }
  const newInput = input as CoOwnerInputNew;
  if (!newInput.email?.trim()) {
    throw new Error("Email requis pour creer un nouveau co-proprietaire.");
  }
  const result = await createClientProfile({
    email: newInput.email,
    phone: newInput.phone,
    firstName: newInput.firstName,
    lastName: newInput.lastName,
  });
  if (!result.clientProfileId) {
    throw new Error("Impossible de creer le co-proprietaire.");
  }
  return result.clientProfileId;
};

export const createSellerProjectFromPropertyWithCoOwners = async (
  input: CreateSellerProjectFromPropertyWithCoOwnersInput
): Promise<CreateSellerProjectFromPropertyWithCoOwnersResult> => {
  if (!input.coOwners || input.coOwners.length === 0) {
    throw new Error("Au moins un proprietaire est requis.");
  }

  // 1. Resolve / create every client_profile up-front. We dedupe by id to
  // tolerate the same client being added twice in the modal.
  const resolvedIds: string[] = [];
  const seen = new Set<string>();
  for (const coOwner of input.coOwners) {
    const id = await resolveCoOwnerClientProfileId(coOwner);
    if (!seen.has(id)) {
      resolvedIds.push(id);
      seen.add(id);
    }
  }
  if (resolvedIds.length === 0) {
    throw new Error("Aucun proprietaire valide.");
  }

  const primaryClientProfileId = resolvedIds[0];
  const coOwnerClientProfileIds = resolvedIds.slice(1);

  // 2. Create the shared client_project with the primary as legacy owner.
  const projectId = await createClientProject({
    clientProfileId: primaryClientProfileId,
    projectType: "seller",
    title: undefined,
    createdFrom: "crm_property",
    primaryAdminProfileId: input.adminProfileId,
  });

  // 3. Materialize the seller_project + project_property + indivision rows.
  const { data: sp, error: spErr } = await supabaseAdmin
    .from("seller_projects")
    .insert({
      client_project_id: projectId,
      assigned_admin_profile_id: input.adminProfileId ?? null,
      entry_channel: "crm_direct" as SellerProjectEntryChannel,
      project_status: "estimation_realisee",
      mandate_status: "none",
    })
    .select("id")
    .single();
  if (spErr) throw spErr;

  try {
    // The primary membership is already inserted by `createClientProject`
    // above. We only have to register additional co-owners here.
    for (const coOwnerId of coOwnerClientProfileIds) {
      await addClientToProject({
        clientProjectId: projectId,
        clientProfileId: coOwnerId,
        role: "co_owner",
        adminProfileId: input.adminProfileId,
      });
    }

    const { error: propertyLinkError } = await supabaseAdmin.from("project_properties").insert({
      client_project_id: projectId,
      property_id: input.propertyId,
      relationship_type: "seller_subject_property",
      is_primary: true,
      linked_by_admin_profile_id: input.adminProfileId ?? null,
    });
    if (propertyLinkError) throw propertyLinkError;

    await createAdvisorHistoryAssignment({
      sellerProjectId: sp.id,
      adminProfileId: input.adminProfileId ?? null,
      assignedByAdminId: input.adminProfileId,
      reason: "Creation depuis fiche bien (indivision)",
    });

    await emitClientProjectEvent({
      clientProjectId: projectId,
      sellerProjectId: sp.id,
      eventName: "seller_project.created_from_crm",
      eventCategory: "project",
      actorType: "admin",
      actorId: input.adminProfileId ?? undefined,
      payload: {
        property_id: input.propertyId,
        primary_client_profile_id: primaryClientProfileId,
        co_owner_client_profile_ids: coOwnerClientProfileIds,
      },
    });

    await emitClientProjectEvent({
      clientProjectId: projectId,
      sellerProjectId: sp.id,
      eventName: "project_property.linked",
      eventCategory: "project",
      actorType: "admin",
      actorId: input.adminProfileId ?? undefined,
      payload: { property_id: input.propertyId },
    });

    if (coOwnerClientProfileIds.length > 0) {
      await emitClientProjectEvent({
        clientProjectId: projectId,
        sellerProjectId: sp.id,
        eventName: "client_project.co_owners_added",
        eventCategory: "project",
        actorType: "admin",
        actorId: input.adminProfileId ?? undefined,
        payload: { co_owner_client_profile_ids: coOwnerClientProfileIds },
      });
    }
  } catch (error) {
    await supabaseAdmin.from("seller_projects").delete().eq("id", sp.id);
    await supabaseAdmin.from("client_projects").delete().eq("id", projectId);
    throw error;
  }

  return {
    clientProjectId: projectId,
    sellerProjectId: sp.id,
    primaryClientProfileId,
    coOwnerClientProfileIds,
  };
};

export type SellerProjectRow = {
  id: string;
  client_project_id: string;
  seller_lead_id: string | null;
  assigned_admin_profile_id: string | null;
  entry_channel: string;
  project_status: string;
  mandate_status: string;
  created_at: string;
};

export const getSellerProjectByClientProjectId = async (
  clientProjectId: string
): Promise<SellerProjectRow | null> => {
  const { data, error } = await supabaseAdmin
    .from("seller_projects")
    .select("id, client_project_id, seller_lead_id, assigned_admin_profile_id, entry_channel, project_status, mandate_status, created_at")
    .eq("client_project_id", clientProjectId)
    .maybeSingle();
  if (error) throw error;
  return data as SellerProjectRow | null;
};

export const getSellerProjectByLeadId = async (
  sellerLeadId: string
): Promise<{ id: string; client_project_id: string } | null> => {
  const { data, error } = await supabaseAdmin
    .from("seller_projects")
    .select("id, client_project_id")
    .eq("seller_lead_id", sellerLeadId)
    .maybeSingle();
  if (error) throw error;
  return data as { id: string; client_project_id: string } | null;
};

export const ensureSellerPortalAccessFromLead = async (
  sellerLeadId: string
): Promise<SellerPortalAccessProvision> => {
  const existingSellerProject = await getSellerProjectByLeadId(sellerLeadId);

  let sellerProjectId: string;
  let clientProjectId: string;
  let clientProfileId: string;

  if (existingSellerProject) {
    sellerProjectId = existingSellerProject.id;
    clientProjectId = existingSellerProject.client_project_id;
    const { data: clientProject, error } = await supabaseAdmin
      .from("client_projects")
      .select("client_profile_id")
      .eq("id", clientProjectId)
      .single();
    if (error || !clientProject?.client_profile_id) {
      throw new Error(error?.message ?? "Projet client introuvable.");
    }
    clientProfileId = clientProject.client_profile_id;
  } else {
    const created = await createSellerProjectFromLead({ sellerLeadId });
    sellerProjectId = created.sellerProjectId;
    clientProjectId = created.clientProjectId;
    clientProfileId = created.clientProfileId;
  }

  const clientProfile = await getClientById(clientProfileId);
  if (!clientProfile) {
    throw new Error("Client introuvable pour l'espace vendeur.");
  }

  if (clientProfile.auth_user_id) {
    return {
      sellerProjectId,
      clientProjectId,
      clientProfileId,
      portalAccess: {
        mode: "login",
        email: clientProfile.email,
        nextPath: "/espace-client",
        inviteToken: null,
      },
    };
  }

  const invitation = await createInvitation({
    clientProjectId,
    clientProfileId,
    email: clientProfile.email,
    providerHint: "email",
  });

  return {
    sellerProjectId,
    clientProjectId,
    clientProfileId,
    portalAccess: {
      mode: "invite",
      email: clientProfile.email,
      nextPath: "/espace-client",
      inviteToken: invitation.token,
    },
  };
};

type SellerProjectDetailRow = {
  id: string;
  seller_lead_id: string | null;
  assigned_admin_profile_id: string | null;
  entry_channel: string;
  project_status: string;
  mandate_status: string;
  created_at: string;
  mandate_signed_at?: string | null;
  offer_received_at?: string | null;
  offer_buyer_lead_id?: string | null;
  offer_buyer_name?: string | null;
  preliminary_sale_signed_at?: string | null;
  deed_signed_at?: string | null;
};

export const getSellerProjectDetail = async (
  clientProjectId: string,
  sellerProjectId?: string
): Promise<SellerProjectDetail | null> => {
  let sp: SellerProjectDetailRow | null;

  const milestoneColumns =
    "id, seller_lead_id, assigned_admin_profile_id, entry_channel, project_status, mandate_status, created_at, mandate_signed_at, offer_received_at, offer_buyer_lead_id, offer_buyer_name, preliminary_sale_signed_at, deed_signed_at";

  if (sellerProjectId) {
    const { data, error } = await supabaseAdmin
      .from("seller_projects")
      .select(milestoneColumns)
      .eq("id", sellerProjectId)
      .eq("client_project_id", clientProjectId)
      .maybeSingle();
    if (error || !data) return null;
    sp = data;
  } else {
    const { data, error } = await supabaseAdmin
      .from("seller_projects")
      .select(milestoneColumns)
      .eq("client_project_id", clientProjectId)
      .maybeSingle();
    if (error || !data) return null;
    sp = data;
  }

  let sellerLead = null;
  if (sp.seller_lead_id) {
    const { data: lead } = await supabaseAdmin
      .from("seller_leads")
      .select("id, full_name, email, phone, estimated_price")
      .eq("id", sp.seller_lead_id)
      .maybeSingle();
    sellerLead = lead;
  }

  let assignedAdvisor: SellerProjectDetail["assignedAdvisor"] = null;
  if (sp.assigned_admin_profile_id) {
    const { data: advisorProfile } = await supabaseAdmin
      .from("admin_profiles")
      .select("id, first_name, last_name, full_name, email, metadata")
      .eq("id", sp.assigned_admin_profile_id)
      .maybeSingle();
    if (advisorProfile) {
      const metadata = parseAdminProfileMetadata(advisorProfile.metadata);
      assignedAdvisor = {
        id: advisorProfile.id,
        firstName: advisorProfile.first_name,
        lastName: advisorProfile.last_name,
        fullName: advisorProfile.full_name,
        email: advisorProfile.email,
        phone: metadata.phone,
        bookingUrl: metadata.bookingUrl,
      };
    }
  }

  const { data: props } = await supabaseAdmin
    .from("project_properties")
    .select("id, property_id, relationship_type, is_primary")
    .eq("client_project_id", clientProjectId)
    .is("unlinked_at", null);

  const propertyIds = (props ?? []).map((p) => p.property_id);
  let propertyDetails: Record<string, { formatted_address: string | null; property_type: string | null; living_area: number | null }> = {};
  if (propertyIds.length > 0) {
    const { data: propsData } = await supabaseAdmin
      .from("properties")
      .select("id, formatted_address, property_type, living_area")
      .in("id", propertyIds);
    propertyDetails = (propsData ?? []).reduce(
      (acc, p) => {
        acc[p.id] = {
          formatted_address: p.formatted_address,
          property_type: p.property_type,
          living_area: p.living_area,
        };
        return acc;
      },
      {} as Record<string, { formatted_address: string | null; property_type: string | null; living_area: number | null }>
    );
  }

  const { data: history } = await supabaseAdmin
    .from("seller_project_advisor_history")
    .select("id, admin_profile_id, assigned_at, unassigned_at")
    .eq("seller_project_id", sp.id)
    .order("assigned_at", { ascending: false })
    .limit(10);

  const adminIds = [...new Set((history ?? []).map((h) => h.admin_profile_id))];
  let adminDetails: Record<string, { first_name: string | null; last_name: string | null; email: string }> = {};
  if (adminIds.length > 0) {
    const { data: admins } = await supabaseAdmin
      .from("admin_profiles")
      .select("id, first_name, last_name, email")
      .in("id", adminIds);
    adminDetails = (admins ?? []).reduce(
      (acc, a) => {
        acc[a.id] = {
          first_name: a.first_name,
          last_name: a.last_name,
          email: a.email,
        };
        return acc;
      },
      {} as Record<string, { first_name: string | null; last_name: string | null; email: string }>
    );
  }

  const { data: invitations } = await supabaseAdmin
    .from("client_project_invitations")
    .select("id, email, created_at, expires_at, accepted_at, revoked_at")
    .eq("client_project_id", clientProjectId)
    .order("created_at", { ascending: false })
    .limit(1);
  const latestInvitation = invitations?.[0] ?? null;

  // Hydrate the offerer buyer_lead snapshot (full_name / email) when
  // `offer_buyer_lead_id` is set — used by the page to render a link
  // back to the acquéreur's project.
  let offerBuyerLeadSnapshot: SellerProjectMilestones["offerBuyerLead"] = null;
  if (sp.offer_buyer_lead_id) {
    const { data: buyer } = await supabaseAdmin
      .from("buyer_leads")
      .select("id, full_name, email")
      .eq("id", sp.offer_buyer_lead_id)
      .maybeSingle();
    if (buyer) {
      offerBuyerLeadSnapshot = {
        id: buyer.id,
        fullName: buyer.full_name ?? null,
        email: buyer.email ?? "",
      };
    }
  }

  return {
    id: sp.id,
    clientProjectId,
    sellerLeadId: sp.seller_lead_id,
    assignedAdminProfileId: sp.assigned_admin_profile_id,
    entryChannel: sp.entry_channel,
    projectStatus: sp.project_status,
    mandateStatus: sp.mandate_status,
    createdAt: sp.created_at,
    milestones: {
      mandateSignedAt: sp.mandate_signed_at ?? null,
      offerReceivedAt: sp.offer_received_at ?? null,
      offerBuyerLeadId: sp.offer_buyer_lead_id ?? null,
      offerBuyerName: sp.offer_buyer_name ?? null,
      preliminarySaleSignedAt: sp.preliminary_sale_signed_at ?? null,
      deedSignedAt: sp.deed_signed_at ?? null,
      offerBuyerLead: offerBuyerLeadSnapshot,
    },
    assignedAdvisor,
    sellerLead: sellerLead
      ? {
          id: sellerLead.id,
          full_name: sellerLead.full_name,
          email: sellerLead.email,
          phone: sellerLead.phone,
          estimated_price: sellerLead.estimated_price,
        }
      : null,
    properties: (props ?? []).map((p) => ({
      id: p.id,
      propertyId: p.property_id,
      relationshipType: p.relationship_type,
      isPrimary: p.is_primary,
      property: propertyDetails[p.property_id]
        ? { id: p.property_id, ...propertyDetails[p.property_id] }
        : undefined,
    })),
    advisorHistory: (history ?? []).map((h) => ({
      id: h.id,
      adminProfileId: h.admin_profile_id,
      assignedAt: h.assigned_at,
      unassignedAt: h.unassigned_at,
      adminProfile: adminDetails[h.admin_profile_id],
    })),
    latestInvitation: latestInvitation
      ? {
          id: latestInvitation.id,
          email: latestInvitation.email,
          createdAt: latestInvitation.created_at,
          expiresAt: latestInvitation.expires_at,
          acceptedAt: latestInvitation.accepted_at,
          revokedAt: latestInvitation.revoked_at,
        }
      : null,
  };
};

export const attachLeadToSellerProject = async (
  sellerProjectId: string,
  sellerLeadId: string,
  adminProfileId?: string
) => {
  await ensureLeadIsNotAlreadyLinked(sellerLeadId, sellerProjectId);

  const { error } = await supabaseAdmin
    .from("seller_projects")
    .update({
      seller_lead_id: sellerLeadId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sellerProjectId);
  if (error) throw error;

  const { data: sp } = await supabaseAdmin
    .from("seller_projects")
    .select("client_project_id")
    .eq("id", sellerProjectId)
    .single();
  if (sp) {
    await emitClientProjectEvent({
      clientProjectId: sp.client_project_id,
      sellerProjectId,
      eventName: "seller_project.lead_attached",
      eventCategory: "project",
      actorType: "admin",
      actorId: adminProfileId,
      payload: { seller_lead_id: sellerLeadId },
    });
  }
};

export const detachLeadFromSellerProject = async (
  sellerProjectId: string,
  adminProfileId?: string
) => {
  const { data: sp } = await supabaseAdmin
    .from("seller_projects")
    .select("client_project_id, seller_lead_id")
    .eq("id", sellerProjectId)
    .single();
  if (!sp) throw new Error("Projet vendeur introuvable");

  const { error } = await supabaseAdmin
    .from("seller_projects")
    .update({
      seller_lead_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sellerProjectId);
  if (error) throw error;

  await emitClientProjectEvent({
    clientProjectId: sp.client_project_id,
    sellerProjectId,
    eventName: "seller_project.lead_detached",
    eventCategory: "project",
    actorType: "admin",
    actorId: adminProfileId,
    payload: { seller_lead_id: sp.seller_lead_id },
  });
};

export const attachPropertyToSellerProject = async (
  clientProjectId: string,
  propertyId: string,
  options: { isPrimary?: boolean; adminProfileId?: string }
) => {
  const { data: existing } = await supabaseAdmin
    .from("project_properties")
    .select("id")
    .eq("client_project_id", clientProjectId)
    .eq("property_id", propertyId)
    .is("unlinked_at", null)
    .maybeSingle();
  if (existing) return;

  const isPrimary = options.isPrimary ?? false;
  if (isPrimary) {
    await supabaseAdmin
      .from("project_properties")
      .update({ is_primary: false })
      .eq("client_project_id", clientProjectId);
  }

  const { data: sp } = await supabaseAdmin
    .from("seller_projects")
    .select("id")
    .eq("client_project_id", clientProjectId)
    .maybeSingle();

  const { error } = await supabaseAdmin.from("project_properties").insert({
    client_project_id: clientProjectId,
    property_id: propertyId,
    relationship_type: "seller_subject_property",
    is_primary: isPrimary,
    linked_by_admin_profile_id: options.adminProfileId ?? null,
  });
  if (error) throw error;

  await emitClientProjectEvent({
    clientProjectId,
    sellerProjectId: sp?.id,
    eventName: "project_property.linked",
    eventCategory: "project",
    actorType: "admin",
    actorId: options.adminProfileId,
    payload: { property_id: propertyId },
  });
};

export const detachPropertyFromSellerProject = async (
  clientProjectId: string,
  projectPropertyId: string,
  adminProfileId?: string
) => {
  const { data: pp } = await supabaseAdmin
    .from("project_properties")
    .select("id, property_id")
    .eq("id", projectPropertyId)
    .eq("client_project_id", clientProjectId)
    .is("unlinked_at", null)
    .maybeSingle();
  if (!pp) throw new Error("Rattachement bien introuvable");

  const { error } = await supabaseAdmin
    .from("project_properties")
    .update({
      unlinked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectPropertyId);
  if (error) throw error;

  const { data: sp } = await supabaseAdmin
    .from("seller_projects")
    .select("id")
    .eq("client_project_id", clientProjectId)
    .maybeSingle();

  await emitClientProjectEvent({
    clientProjectId,
    sellerProjectId: sp?.id,
    eventName: "project_property.unlinked",
    eventCategory: "project",
    actorType: "admin",
    actorId: adminProfileId,
    payload: { property_id: pp.property_id },
  });
};

export const setPrimaryProperty = async (
  clientProjectId: string,
  projectPropertyId: string
) => {
  await supabaseAdmin
    .from("project_properties")
    .update({ is_primary: false })
    .eq("client_project_id", clientProjectId);

  const { error } = await supabaseAdmin
    .from("project_properties")
    .update({ is_primary: true })
    .eq("id", projectPropertyId)
    .eq("client_project_id", clientProjectId);
  if (error) throw error;
};

export const assignAdvisorToSellerProject = async (
  sellerProjectId: string,
  adminProfileId: string,
  options?: { assignedByAdminId?: string; reason?: string }
) => {
  const { data: current } = await supabaseAdmin
    .from("seller_projects")
    .select("assigned_admin_profile_id")
    .eq("id", sellerProjectId)
    .single();
  if (!current) throw new Error("Projet vendeur introuvable");

  if (current.assigned_admin_profile_id) {
    await supabaseAdmin
      .from("seller_project_advisor_history")
      .update({
        unassigned_at: new Date().toISOString(),
      })
      .eq("seller_project_id", sellerProjectId)
      .eq("admin_profile_id", current.assigned_admin_profile_id)
      .is("unassigned_at", null);
  }

  await createAdvisorHistoryAssignment({
    sellerProjectId,
    adminProfileId,
    assignedByAdminId: options?.assignedByAdminId,
    reason: options?.reason ?? null,
  });

  const { error } = await supabaseAdmin
    .from("seller_projects")
    .update({
      assigned_admin_profile_id: adminProfileId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sellerProjectId);
  if (error) throw error;

  const { data: sp } = await supabaseAdmin
    .from("seller_projects")
    .select("client_project_id")
    .eq("id", sellerProjectId)
    .single();
  if (sp) {
    await emitClientProjectEvent({
      clientProjectId: sp.client_project_id,
      sellerProjectId,
      eventName: "advisor.assigned",
      eventCategory: "advisor",
      actorType: "admin",
      actorId: options?.assignedByAdminId,
      payload: { admin_profile_id: adminProfileId },
    });
  }
};

// =====================================================================
// Manual milestone updates (cf. migration 037)
// =====================================================================
//
// The 4 milestones (mandate, offer, preliminary_sale, deed) can be
// set / cleared manually by an admin (clients.edit permission) to
// back-fill the historical state of projects that pre-date the
// MyNotary integration. The MyNotary inbound flow still writes
// `mandate_signed_at` automatically when it matches a project with
// confidence >= 0.7 — this manual flow simply lets an admin override
// or back-fill values.
//
// The function only updates fields it actually receives in `input`,
// so the same endpoint can be used to set a single field without
// nuking the others. Each transition from null → set fires a domain
// event so the timeline + the audit log capture the change.

export type SellerProjectMilestonesInput = {
  // ISO-8601 date strings (`YYYY-MM-DD`) or null to clear. The service
  // normalizes them to `${date}T12:00:00Z` before persisting so the
  // value displays the same in every timezone.
  mandateSignedAt?: string | null;
  offerReceivedAt?: string | null;
  offerBuyerLeadId?: string | null;
  offerBuyerName?: string | null;
  preliminarySaleSignedAt?: string | null;
  deedSignedAt?: string | null;
};

const DATE_INPUT_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const normalizeMilestoneDate = (value: string | null | undefined): string | null => {
  if (value === null || value === undefined || value === "") return null;
  if (DATETIME_RE.test(value)) return value;
  if (DATE_INPUT_RE.test(value)) return `${value}T12:00:00.000Z`;
  throw new Error(`Date invalide: ${value}`);
};

export const updateSellerProjectMilestones = async (
  sellerProjectId: string,
  input: SellerProjectMilestonesInput,
  options?: { adminProfileId?: string }
): Promise<SellerProjectMilestones> => {
  if (!UUID_RE.test(sellerProjectId)) {
    throw new Error("Identifiant de projet vendeur invalide.");
  }

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if ("mandateSignedAt" in input) {
    const normalized = normalizeMilestoneDate(input.mandateSignedAt);
    update.mandate_signed_at = normalized;
    // Keep the legacy `mandate_status` enum in sync so any existing
    // code that filters on it (e.g. the seller-projects MCP tool list
    // view) doesn't get out of date.
    update.mandate_status = normalized ? "signed" : "none";
  }

  if ("offerReceivedAt" in input) {
    update.offer_received_at = normalizeMilestoneDate(input.offerReceivedAt);
  }
  if ("offerBuyerLeadId" in input) {
    if (input.offerBuyerLeadId && !UUID_RE.test(input.offerBuyerLeadId)) {
      throw new Error("Identifiant de buyer_lead invalide.");
    }
    update.offer_buyer_lead_id = input.offerBuyerLeadId ?? null;
  }
  if ("offerBuyerName" in input) {
    const trimmed = (input.offerBuyerName ?? "").trim();
    update.offer_buyer_name = trimmed.length > 0 ? trimmed : null;
  }
  if ("preliminarySaleSignedAt" in input) {
    update.preliminary_sale_signed_at = normalizeMilestoneDate(
      input.preliminarySaleSignedAt
    );
  }
  if ("deedSignedAt" in input) {
    update.deed_signed_at = normalizeMilestoneDate(input.deedSignedAt);
  }

  const { data, error } = await supabaseAdmin
    .from("seller_projects")
    .update(update)
    .eq("id", sellerProjectId)
    .select(
      "id, client_project_id, mandate_status, mandate_signed_at, offer_received_at, offer_buyer_lead_id, offer_buyer_name, preliminary_sale_signed_at, deed_signed_at"
    )
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? "Projet vendeur introuvable.");
  }

  // One domain event per field changed (null → set, set → null, or
  // value changed) so the copilot + admin timeline can reflect the
  // manual back-fill.
  type MilestoneEvent =
    | "seller_project.mandate_signed_set"
    | "seller_project.offer_received_set"
    | "seller_project.preliminary_sale_signed_set"
    | "seller_project.deed_signed_set";
  const milestoneEvents: Array<{ name: MilestoneEvent; field: string; value: unknown }> = [];
  if ("mandateSignedAt" in input) {
    milestoneEvents.push({
      name: "seller_project.mandate_signed_set",
      field: "mandate_signed_at",
      value: data.mandate_signed_at,
    });
  }
  if ("offerReceivedAt" in input || "offerBuyerLeadId" in input || "offerBuyerName" in input) {
    milestoneEvents.push({
      name: "seller_project.offer_received_set",
      field: "offer_received_at",
      value: {
        offer_received_at: data.offer_received_at,
        offer_buyer_lead_id: data.offer_buyer_lead_id,
        offer_buyer_name: data.offer_buyer_name,
      },
    });
  }
  if ("preliminarySaleSignedAt" in input) {
    milestoneEvents.push({
      name: "seller_project.preliminary_sale_signed_set",
      field: "preliminary_sale_signed_at",
      value: data.preliminary_sale_signed_at,
    });
  }
  if ("deedSignedAt" in input) {
    milestoneEvents.push({
      name: "seller_project.deed_signed_set",
      field: "deed_signed_at",
      value: data.deed_signed_at,
    });
  }
  for (const ev of milestoneEvents) {
    try {
      await emitClientProjectEvent({
        clientProjectId: data.client_project_id,
        sellerProjectId: data.id,
        eventName: ev.name,
        eventCategory: "project",
        actorType: "admin",
        actorId: options?.adminProfileId,
        payload: { [ev.field]: ev.value },
      });
    } catch {
      // Audit failures must never break the user-facing update.
    }
  }

  let offerBuyerLeadSnapshot: SellerProjectMilestones["offerBuyerLead"] = null;
  if (data.offer_buyer_lead_id) {
    const { data: buyer } = await supabaseAdmin
      .from("buyer_leads")
      .select("id, full_name, email")
      .eq("id", data.offer_buyer_lead_id)
      .maybeSingle();
    if (buyer) {
      offerBuyerLeadSnapshot = {
        id: buyer.id,
        fullName: buyer.full_name ?? null,
        email: buyer.email ?? "",
      };
    }
  }

  return {
    mandateSignedAt: data.mandate_signed_at,
    offerReceivedAt: data.offer_received_at,
    offerBuyerLeadId: data.offer_buyer_lead_id,
    offerBuyerName: data.offer_buyer_name,
    preliminarySaleSignedAt: data.preliminary_sale_signed_at,
    deedSignedAt: data.deed_signed_at,
    offerBuyerLead: offerBuyerLeadSnapshot,
  };
};

// Small autocomplete helper used by the offer rattachement form.
// Searches buyer_leads on full_name OR email (case-insensitive).
export type BuyerLeadAutocompleteRow = {
  id: string;
  fullName: string | null;
  email: string;
  phone: string | null;
};

export const searchBuyerLeadsForOffer = async (
  query: string,
  limit = 10
): Promise<BuyerLeadAutocompleteRow[]> => {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const safeLimit = Math.min(Math.max(limit, 1), 25);
  const escaped = trimmed.replace(/[%_]/g, (m) => `\\${m}`);
  const { data, error } = await supabaseAdmin
    .from("buyer_leads")
    .select("id, full_name, email, phone")
    .or(`full_name.ilike.%${escaped}%,email.ilike.%${escaped}%`)
    .order("updated_at", { ascending: false })
    .limit(safeLimit);
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    fullName: row.full_name ?? null,
    email: row.email ?? "",
    phone: row.phone ?? null,
  }));
};
