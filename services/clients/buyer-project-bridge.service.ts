import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

export type BuyerProjectBridgeStatus = "search_profile_ready" | "project_shell_only";

type BuyerProjectLike = {
  id: string;
  title: string | null;
  status: string;
  createdAt: string;
};

type BuyerBridgeData = {
  searchProfile: {
    id: string;
    status: string;
    businessType: string | null;
    locationText: string | null;
    cities: string[];
    propertyTypes: string[];
    budgetMin: number | null;
    budgetMax: number | null;
    roomsMin: number | null;
    livingAreaMin: number | null;
  } | null;
  buyerLead: {
    id: string;
    status: string;
    timeline: string | null;
    financingStatus: string | null;
    preferredContactChannel: string | null;
  } | null;
};

export type BuyerPortalProjectSummary = {
  bridgeStatus: BuyerProjectBridgeStatus;
  summary: string;
  nextAction: string;
  locationLabel: string | null;
  budgetLabel: string | null;
  searchStatus: string | null;
};

export type BuyerPortalProjectPlaceholderDetail = {
  title: string | null;
  status: string;
  createdAt: string;
  bridgeStatus: BuyerProjectBridgeStatus;
  message: string;
  locationLabel: string | null;
  budgetLabel: string | null;
  searchStatus: string | null;
  businessType: string | null;
  propertyTypes: string[];
  cities: string[];
  roomsMin: number | null;
  livingAreaMin: number | null;
  leadStatus: string | null;
  financingStatus: string | null;
  preferredContactChannel: string | null;
};

const formatBudgetLabel = (min: number | null, max: number | null) => {
  if (typeof min === "number" && typeof max === "number") {
    return `${min.toLocaleString("fr-FR")} - ${max.toLocaleString("fr-FR")} EUR`;
  }
  if (typeof min === "number") {
    return `A partir de ${min.toLocaleString("fr-FR")} EUR`;
  }
  if (typeof max === "number") {
    return `Jusqu'a ${max.toLocaleString("fr-FR")} EUR`;
  }
  return null;
};

const buildSummaryText = (project: BuyerProjectLike, bridge: BuyerBridgeData) => {
  if (bridge.searchProfile?.locationText) return bridge.searchProfile.locationText;
  if (bridge.searchProfile?.cities.length) return bridge.searchProfile.cities.join(", ");
  return project.title ?? "Projet acquereur en qualification";
};

const buildNextAction = (bridge: BuyerBridgeData) => {
  if (bridge.searchProfile) {
    return "Ouvrir le projet pour revoir vos criteres et suivre votre recherche";
  }
  return "Ouvrir le projet pour completer votre recherche";
};

const buildBuyerBridgeMap = async (projectIds: string[]) => {
  if (projectIds.length === 0) return new Map<string, BuyerBridgeData>();

  const { data: buyerProjects, error: buyerProjectsError } = await supabaseAdmin
    .from("buyer_projects")
    .select("client_project_id, buyer_lead_id, active_search_profile_id")
    .in("client_project_id", projectIds);
  if (buyerProjectsError) throw buyerProjectsError;

  const buyerProjectRows = (buyerProjects ?? []) as Array<{
    client_project_id: string;
    buyer_lead_id: string | null;
    active_search_profile_id: string | null;
  }>;

  const searchProfileIds = buyerProjectRows
    .map((project) => project.active_search_profile_id)
    .filter((value): value is string => Boolean(value));
  const buyerLeadIds = buyerProjectRows
    .map((project) => project.buyer_lead_id)
    .filter((value): value is string => Boolean(value));

  const [{ data: searchProfiles, error: searchProfilesError }, { data: buyerLeads, error: buyerLeadsError }] =
    await Promise.all([
      searchProfileIds.length > 0
        ? supabaseAdmin
            .from("buyer_search_profiles")
            .select(
              "id, buyer_lead_id, status, business_type, location_text, cities, property_types, budget_min, budget_max, rooms_min, living_area_min"
            )
            .in("id", searchProfileIds)
        : Promise.resolve({ data: [], error: null }),
      buyerLeadIds.length > 0
        ? supabaseAdmin
            .from("buyer_leads")
            .select("id, status, timeline, financing_status, preferred_contact_channel")
            .in("id", buyerLeadIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
  if (searchProfilesError) throw searchProfilesError;
  if (buyerLeadsError) throw buyerLeadsError;

  const searchProfileById = new Map(
    (
      (searchProfiles ?? []) as Array<{
        id: string;
        buyer_lead_id: string;
        status: string;
        business_type: string | null;
        location_text: string | null;
        cities: string[];
        property_types: string[];
        budget_min: number | null;
        budget_max: number | null;
        rooms_min: number | null;
        living_area_min: number | null;
      }>
    ).map((profile) => [
      profile.id,
      {
        id: profile.id,
        status: profile.status,
        businessType: profile.business_type,
        locationText: profile.location_text,
        cities: profile.cities,
        propertyTypes: profile.property_types,
        budgetMin: profile.budget_min,
        budgetMax: profile.budget_max,
        roomsMin: profile.rooms_min,
        livingAreaMin: profile.living_area_min,
      },
    ])
  );

  const buyerLeadById = new Map(
    (
      (buyerLeads ?? []) as Array<{
        id: string;
        status: string;
        timeline: string | null;
        financing_status: string | null;
        preferred_contact_channel: string | null;
      }>
    ).map((lead) => [
      lead.id,
      {
        id: lead.id,
        status: lead.status,
        timeline: lead.timeline,
        financingStatus: lead.financing_status,
        preferredContactChannel: lead.preferred_contact_channel,
      },
    ])
  );

  return new Map(
    buyerProjectRows.map((project) => [
      project.client_project_id,
      {
        searchProfile: project.active_search_profile_id
          ? searchProfileById.get(project.active_search_profile_id) ?? null
          : null,
        buyerLead: project.buyer_lead_id ? buyerLeadById.get(project.buyer_lead_id) ?? null : null,
      },
    ])
  );
};

export const listBuyerPortalProjectBridge = async (projectIds: string[]) => {
  return buildBuyerBridgeMap(projectIds);
};

export const buildBuyerPortalProjectSummary = (
  project: BuyerProjectLike,
  bridge: BuyerBridgeData | null
): BuyerPortalProjectSummary => {
  const resolvedBridge = bridge ?? { searchProfile: null, buyerLead: null };
  return {
    bridgeStatus: resolvedBridge.searchProfile ? "search_profile_ready" : "project_shell_only",
    summary: buildSummaryText(project, resolvedBridge),
    nextAction: buildNextAction(resolvedBridge),
    locationLabel:
      resolvedBridge.searchProfile?.locationText ??
      (resolvedBridge.searchProfile?.cities.length
        ? resolvedBridge.searchProfile.cities.join(", ")
        : null),
    budgetLabel: resolvedBridge.searchProfile
      ? formatBudgetLabel(
          resolvedBridge.searchProfile.budgetMin,
          resolvedBridge.searchProfile.budgetMax
        )
      : null,
    searchStatus: resolvedBridge.searchProfile?.status ?? null,
  };
};

export const buildBuyerPortalProjectPlaceholderDetail = (
  project: BuyerProjectLike,
  bridge: BuyerBridgeData | null
): BuyerPortalProjectPlaceholderDetail => {
  const resolvedBridge = bridge ?? { searchProfile: null, buyerLead: null };
  const summary = buildBuyerPortalProjectSummary(project, resolvedBridge);
  return {
    title: project.title,
    status: project.status,
    createdAt: project.createdAt,
    bridgeStatus: summary.bridgeStatus,
    message: resolvedBridge.searchProfile
      ? "Votre recherche acquereur est deja rattachee a ce projet client."
      : "Ce projet acquereur existe deja dans votre espace, mais certains criteres restent a completer.",
    locationLabel: summary.locationLabel,
    budgetLabel: summary.budgetLabel,
    searchStatus: summary.searchStatus,
    businessType: resolvedBridge.searchProfile?.businessType ?? null,
    propertyTypes: resolvedBridge.searchProfile?.propertyTypes ?? [],
    cities: resolvedBridge.searchProfile?.cities ?? [],
    roomsMin: resolvedBridge.searchProfile?.roomsMin ?? null,
    livingAreaMin: resolvedBridge.searchProfile?.livingAreaMin ?? null,
    leadStatus: resolvedBridge.buyerLead?.status ?? null,
    financingStatus: resolvedBridge.buyerLead?.financingStatus ?? null,
    preferredContactChannel: resolvedBridge.buyerLead?.preferredContactChannel ?? null,
  };
};
