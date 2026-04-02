import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { parseAdminProfileMetadata } from "@/services/admin/admin-profile-metadata";
import { createInvitation } from "./client-project-invitation.service";
import {
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

export type SellerProjectDetail = {
  id: string;
  clientProjectId: string;
  sellerLeadId: string | null;
  assignedAdminProfileId: string | null;
  entryChannel: string;
  projectStatus: string;
  mandateStatus: string;
  createdAt: string;
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

  const parts = (lead.full_name ?? "").trim().split(/\s+/);
  const firstName = parts[0] ?? null;
  const lastName = parts.slice(1).join(" ") || null;

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
  if (spErr) throw spErr;

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
};

export const getSellerProjectDetail = async (
  clientProjectId: string,
  sellerProjectId?: string
): Promise<SellerProjectDetail | null> => {
  let sp: SellerProjectDetailRow | null;

  if (sellerProjectId) {
    const { data, error } = await supabaseAdmin
      .from("seller_projects")
      .select("id, seller_lead_id, assigned_admin_profile_id, entry_channel, project_status, mandate_status, created_at")
      .eq("id", sellerProjectId)
      .eq("client_project_id", clientProjectId)
      .maybeSingle();
    if (error || !data) return null;
    sp = data as SellerProjectDetailRow;
  } else {
    const { data, error } = await supabaseAdmin
      .from("seller_projects")
      .select("id, seller_lead_id, assigned_admin_profile_id, entry_channel, project_status, mandate_status, created_at")
      .eq("client_project_id", clientProjectId)
      .maybeSingle();
    if (error || !data) return null;
    sp = data as SellerProjectDetailRow;
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

  return {
    id: sp.id,
    clientProjectId,
    sellerLeadId: sp.seller_lead_id,
    assignedAdminProfileId: sp.assigned_admin_profile_id,
    entryChannel: sp.entry_channel,
    projectStatus: sp.project_status,
    mandateStatus: sp.mandate_status,
    createdAt: sp.created_at,
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
