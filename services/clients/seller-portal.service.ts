import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { parseAdminProfileMetadata } from "@/services/admin/admin-profile-metadata";
import {
  getClientByAuthUserId,
  type ClientProfileRow,
} from "./client-profile.service";
import { getClientProjectsByClientId, getClientProjectById } from "./client-project.service";
import { getSellerMetadataSections } from "@/services/sellers/seller-metadata";

export type SellerPortalClient = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  lastLoginAt: string | null;
};

export type SellerPortalProjectSummary = {
  id: string;
  title: string | null;
  createdAt: string;
  projectStatus: string | null;
  mandateStatus: string | null;
  propertyCount: number;
};

export type SellerPortalValuationSummary = {
  estimatedPrice: number | null;
  valuationLow: number | null;
  valuationHigh: number | null;
  provider: string | null;
  syncedAt: string | null;
};

export type SellerPortalAdvisorSummary = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  email: string;
  phone: string | null;
};

export type SellerPortalPropertySummary = {
  id: string;
  formattedAddress: string | null;
  propertyType: string | null;
  livingArea: number | null;
  appointmentServiceUrl: string | null;
  isPrimary: boolean;
};

export type SellerPortalEventSummary = {
  id: string;
  createdAt: string;
  eventName: string;
  eventCategory: string;
};

export type SellerPortalProjectDetail = {
  client: SellerPortalClient;
  project: SellerPortalProjectSummary;
  valuation: SellerPortalValuationSummary | null;
  advisor: SellerPortalAdvisorSummary | null;
  properties: SellerPortalPropertySummary[];
  events: SellerPortalEventSummary[];
};

const toClient = (client: ClientProfileRow): SellerPortalClient => ({
  id: client.id,
  email: client.email,
  firstName: client.first_name,
  lastName: client.last_name,
  fullName: client.full_name,
  lastLoginAt: client.last_login_at,
});

export const getSellerPortalClientByAuthUserId = async (authUserId: string) => {
  return getClientByAuthUserId(authUserId);
};

export const listSellerPortalProjects = async (
  clientProfileId: string
): Promise<SellerPortalProjectSummary[]> => {
  const projects = await getClientProjectsByClientId(clientProfileId);

  return projects.map((project) => ({
    id: project.id,
    title: project.title,
    createdAt: project.createdAt,
    projectStatus: project.sellerProject?.projectStatus ?? null,
    mandateStatus: project.sellerProject?.mandateStatus ?? null,
    propertyCount: project.propertyCount,
  }));
};

export const getSellerPortalProjectDetail = async (input: {
  authUserId: string;
  projectId: string;
}): Promise<SellerPortalProjectDetail | null> => {
  const client = await getClientByAuthUserId(input.authUserId);
  if (!client) return null;

  const project = await getClientProjectById(input.projectId);
  if (!project || project.client_profile_id !== client.id || project.project_type !== "seller") {
    return null;
  }

  const projectSummaries = await listSellerPortalProjects(client.id);
  const projectSummary = projectSummaries.find((item) => item.id === input.projectId);
  if (!projectSummary) return null;

  const { data: sellerProject } = await supabaseAdmin
    .from("seller_projects")
    .select("id, seller_lead_id, assigned_admin_profile_id")
    .eq("client_project_id", input.projectId)
    .maybeSingle();

  let valuation: SellerPortalValuationSummary | null = null;
  if (sellerProject?.seller_lead_id) {
    const { data: lead } = await supabaseAdmin
      .from("seller_leads")
      .select("estimated_price, metadata")
      .eq("id", sellerProject.seller_lead_id)
      .maybeSingle();

    if (lead) {
      const sections = getSellerMetadataSections(lead.metadata);
      valuation = {
        estimatedPrice: lead.estimated_price,
        valuationLow: sections.propertyDetails?.valuation_low ?? null,
        valuationHigh: sections.propertyDetails?.valuation_high ?? null,
        provider: sections.valuation?.provider ?? null,
        syncedAt: sections.valuation?.synced_at ?? null,
      };
    }
  }

  let advisor: SellerPortalAdvisorSummary | null = null;
  if (sellerProject?.assigned_admin_profile_id) {
    const { data: adminProfile } = await supabaseAdmin
      .from("admin_profiles")
      .select("id, first_name, last_name, full_name, email, metadata")
      .eq("id", sellerProject.assigned_admin_profile_id)
      .maybeSingle();

    if (adminProfile) {
      const metadata = parseAdminProfileMetadata(adminProfile.metadata);
      advisor = {
        id: adminProfile.id,
        firstName: adminProfile.first_name,
        lastName: adminProfile.last_name,
        fullName: adminProfile.full_name,
        email: adminProfile.email,
        phone: metadata.phone,
      };
    }
  }

  const { data: projectProperties } = await supabaseAdmin
    .from("project_properties")
    .select("property_id, is_primary")
    .eq("client_project_id", input.projectId)
    .is("unlinked_at", null);

  const propertyIds = (projectProperties ?? []).map((item) => item.property_id);
  let properties: SellerPortalPropertySummary[] = [];
  if (propertyIds.length > 0) {
    const { data: propertyRows } = await supabaseAdmin
      .from("properties")
      .select("id, formatted_address, property_type, living_area, appointment_service_url")
      .in("id", propertyIds);

    const propertyById = new Map((propertyRows ?? []).map((row) => [row.id, row]));
    properties = (projectProperties ?? []).map((link) => {
      const property = propertyById.get(link.property_id);
      return {
        id: link.property_id,
        formattedAddress: property?.formatted_address ?? null,
        propertyType: property?.property_type ?? null,
        livingArea: property?.living_area ?? null,
        appointmentServiceUrl: property?.appointment_service_url ?? null,
        isPrimary: link.is_primary,
      };
    });
  }

  const { data: eventRows } = await supabaseAdmin
    .from("client_project_events")
    .select("id, created_at, event_name, event_category")
    .eq("client_project_id", input.projectId)
    .eq("visible_to_client", true)
    .order("created_at", { ascending: false })
    .limit(10);

  return {
    client: toClient(client),
    project: projectSummary,
    valuation,
    advisor,
    properties,
    events: (eventRows ?? []).map((event) => ({
      id: event.id,
      createdAt: event.created_at,
      eventName: event.event_name,
      eventCategory: event.event_category,
    })),
  };
};
