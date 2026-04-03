import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { parseAdminProfileMetadata } from "@/services/admin/admin-profile-metadata";
import {
  getClientByAuthUserId,
  type ClientProfileRow,
} from "./client-profile.service";
import { getClientProjectsByClientId, getClientProjectById } from "./client-project.service";
import { getSellerMetadataSections } from "@/services/sellers/seller-metadata";
import { getLatestValuationForSellerProject } from "@/services/valuation/valuation-record.service";

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
  primaryPropertyAddress: string | null;
  advisorName: string | null;
  latestValuationPrice: number | null;
  latestValuationSyncedAt: string | null;
  hasAppointmentLink: boolean;
};

const formatLeadAddress = (lead: {
  property_address?: string | null;
  postal_code?: string | null;
  city?: string | null;
}) => {
  const line1 = lead.property_address?.trim() ?? "";
  const line2 = [lead.postal_code?.trim(), lead.city?.trim()].filter(Boolean).join(" ").trim();
  return [line1, line2].filter(Boolean).join(", ") || null;
};

const resolveLeadValuation = (lead: { estimated_price: number | null; metadata: unknown }) => {
  if (typeof lead.estimated_price === "number") return lead.estimated_price;
  const sections = getSellerMetadataSections(lead.metadata);
  const normalized = sections.valuation?.normalized;
  if (!normalized || typeof normalized !== "object") return null;

  const candidate =
    "valuationPrice" in normalized && typeof normalized.valuationPrice === "number"
      ? normalized.valuationPrice
      : "valuationPriceLow" in normalized && typeof normalized.valuationPriceLow === "number"
        ? normalized.valuationPriceLow
        : "valuationPriceHigh" in normalized && typeof normalized.valuationPriceHigh === "number"
          ? normalized.valuationPriceHigh
          : null;

  return candidate;
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
  bookingUrl: string | null;
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
  const projects = await getClientProjectsByClientId(clientProfileId, {
    projectTypes: ["seller"],
  });
  const sellerLeadIds = projects
    .map((project) => project.sellerProject?.sellerLeadId)
    .filter((value): value is string => Boolean(value));
  const advisorIds = projects
    .map((project) => project.sellerProject?.assignedAdminProfileId)
    .filter((value): value is string => Boolean(value));
  const sellerProjectIds = projects
    .map((project) => project.sellerProject?.id)
    .filter((value): value is string => Boolean(value));
  const projectIds = projects.map((project) => project.id);

  const [{ data: leads }, { data: advisors }, { data: projectProperties }, { data: valuationRows }] =
    await Promise.all([
      sellerLeadIds.length > 0
        ? supabaseAdmin
            .from("seller_leads")
            .select("id, estimated_price, property_address, postal_code, city, metadata")
            .in("id", sellerLeadIds)
        : Promise.resolve({
            data: [] as Array<{
              id: string;
              estimated_price: number | null;
              property_address: string | null;
              postal_code: string | null;
              city: string | null;
              metadata: unknown;
            }>,
          }),
      advisorIds.length > 0
        ? supabaseAdmin.from("admin_profiles").select("id, first_name, last_name, full_name, email, metadata").in("id", advisorIds)
        : Promise.resolve({
            data: [] as Array<{
              id: string;
              first_name: string | null;
              last_name: string | null;
              full_name: string | null;
              email: string;
              metadata: unknown;
            }>,
          }),
      projectIds.length > 0
        ? supabaseAdmin
            .from("project_properties")
            .select("client_project_id, property_id, is_primary")
            .in("client_project_id", projectIds)
            .is("unlinked_at", null)
        : Promise.resolve({ data: [] as Array<{ client_project_id: string; property_id: string; is_primary: boolean }> }),
      sellerProjectIds.length > 0
        ? supabaseAdmin
            .from("valuations")
            .select("seller_project_id, seller_lead_id, estimated_price, valuation_low, valuation_high, provider, valuated_at")
            .in("seller_project_id", sellerProjectIds)
            .order("valuated_at", { ascending: false })
        : Promise.resolve({
            data: [] as Array<{
              seller_project_id: string | null;
              seller_lead_id: string | null;
              estimated_price: number | null;
              valuation_low: number | null;
              valuation_high: number | null;
              provider: string | null;
              valuated_at: string;
            }>,
          }),
    ]);

  const propertyLinks = (projectProperties ?? []) as Array<{
    client_project_id: string;
    property_id: string;
    is_primary: boolean;
  }>;
  const propertyIds = Array.from(new Set(propertyLinks.map((link) => link.property_id)));
  const propertyRows =
    propertyIds.length > 0
      ? (
          await supabaseAdmin
            .from("properties")
            .select("id, formatted_address, appointment_service_url")
            .in("id", propertyIds)
        ).data ?? []
      : [];

  const leadById = new Map(
    (
      (leads ?? []) as Array<{
        id: string;
        estimated_price: number | null;
        property_address: string | null;
        postal_code: string | null;
        city: string | null;
        metadata: unknown;
      }>
    ).map((lead) => [lead.id, lead])
  );
  const advisorById = new Map(
    (
      (advisors ?? []) as Array<{
        id: string;
        first_name: string | null;
        last_name: string | null;
        full_name: string | null;
        email: string;
        metadata: unknown;
      }>
    ).map((advisor) => [advisor.id, advisor])
  );
  const propertyById = new Map(
    (
      propertyRows as Array<{
        id: string;
        formatted_address: string | null;
        appointment_service_url: string | null;
      }>
    ).map((property) => [property.id, property])
  );
  const primaryPropertyByProjectId = new Map<string, { formattedAddress: string | null; appointmentServiceUrl: string | null }>();
  const latestValuationBySellerProjectId = new Map<
    string,
    {
      estimated_price: number | null;
      valuation_low: number | null;
      valuation_high: number | null;
      provider: string | null;
      valuated_at: string;
    }
  >();

  for (const valuation of
    (valuationRows ?? []) as Array<{
      seller_project_id: string | null;
      seller_lead_id: string | null;
      estimated_price: number | null;
      valuation_low: number | null;
      valuation_high: number | null;
      provider: string | null;
      valuated_at: string;
    }>) {
    if (!valuation.seller_project_id || latestValuationBySellerProjectId.has(valuation.seller_project_id)) {
      continue;
    }
    latestValuationBySellerProjectId.set(valuation.seller_project_id, valuation);
  }

  for (const link of propertyLinks) {
    const property = propertyById.get(link.property_id);
    if (!property) continue;
    const current = primaryPropertyByProjectId.get(link.client_project_id);
    if (!current || link.is_primary) {
      primaryPropertyByProjectId.set(link.client_project_id, {
        formattedAddress: property.formatted_address,
        appointmentServiceUrl: property.appointment_service_url,
      });
    }
  }

  return projects.map((project) => ({
    advisorName: (() => {
      const advisorId = project.sellerProject?.assignedAdminProfileId;
      if (!advisorId) return null;
      const advisor = advisorById.get(advisorId);
      if (!advisor) return null;
      const fallbackName =
        [advisor.first_name, advisor.last_name].filter(Boolean).join(" ").trim() || advisor.email;
      return advisor.full_name ?? fallbackName;
    })(),
    hasAppointmentLink: (() => {
      const advisorId = project.sellerProject?.assignedAdminProfileId;
      const advisor = advisorId ? advisorById.get(advisorId) : null;
      const advisorMetadata = advisor ? parseAdminProfileMetadata(advisor.metadata) : null;
      return Boolean(advisorMetadata?.bookingUrl || primaryPropertyByProjectId.get(project.id)?.appointmentServiceUrl);
    })(),
    id: project.id,
    title: project.title,
    createdAt: project.createdAt,
    projectStatus: project.sellerProject?.projectStatus ?? null,
    mandateStatus: project.sellerProject?.mandateStatus ?? null,
    propertyCount: project.propertyCount,
    primaryPropertyAddress: (() => {
      const linkedAddress = primaryPropertyByProjectId.get(project.id)?.formattedAddress ?? null;
      if (linkedAddress) return linkedAddress;
      const sellerLeadId = project.sellerProject?.sellerLeadId;
      if (!sellerLeadId) return null;
      const lead = leadById.get(sellerLeadId);
      return lead ? formatLeadAddress(lead) : null;
    })(),
    latestValuationPrice: (() => {
      const sellerProjectId = project.sellerProject?.id;
      if (sellerProjectId) {
        const valuation = latestValuationBySellerProjectId.get(sellerProjectId);
        if (valuation) {
          return valuation.estimated_price ?? valuation.valuation_low ?? valuation.valuation_high ?? null;
        }
      }
      const sellerLeadId = project.sellerProject?.sellerLeadId;
      if (!sellerLeadId) return null;
      const lead = leadById.get(sellerLeadId);
      return lead ? resolveLeadValuation(lead) : null;
    })(),
    latestValuationSyncedAt: (() => {
      const sellerProjectId = project.sellerProject?.id;
      if (sellerProjectId) {
        const valuation = latestValuationBySellerProjectId.get(sellerProjectId);
        if (valuation) return valuation.valuated_at;
      }
      const sellerLeadId = project.sellerProject?.sellerLeadId;
      if (!sellerLeadId) return null;
      const lead = leadById.get(sellerLeadId);
      return lead ? getSellerMetadataSections(lead.metadata).valuation?.synced_at ?? null : null;
    })(),
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
  const latestValuation = await getLatestValuationForSellerProject({
    sellerProjectId: sellerProject?.id ?? null,
    sellerLeadId: sellerProject?.seller_lead_id ?? null,
  });
  if (latestValuation) {
    valuation = {
      estimatedPrice: latestValuation.estimated_price,
      valuationLow: latestValuation.valuation_low,
      valuationHigh: latestValuation.valuation_high,
      provider: latestValuation.provider,
      syncedAt: latestValuation.valuated_at,
    };
  } else if (sellerProject?.seller_lead_id) {
    const { data: lead } = await supabaseAdmin
      .from("seller_leads")
      .select("estimated_price, metadata")
      .eq("id", sellerProject.seller_lead_id)
      .maybeSingle();

    if (lead) {
      const sections = getSellerMetadataSections(lead.metadata);
      valuation = {
        estimatedPrice: resolveLeadValuation(lead),
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
        bookingUrl: metadata.bookingUrl,
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
