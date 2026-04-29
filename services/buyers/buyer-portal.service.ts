import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Database } from "@/types/db/supabase";
import type { PropertyBusinessType } from "@/types/domain/properties";
import type { BuyerSearchProfileSnapshot } from "@/types/domain/buyers";
import { recomputeMatchesForBuyerLead } from "./buyer-matching.service";
import { processBuyerAlertsForNewMatches } from "./buyer-alert.service";

type ClientProjectRow = Database["public"]["Tables"]["client_projects"]["Row"];
type BuyerProjectRow = Database["public"]["Tables"]["buyer_projects"]["Row"];
type BuyerSearchProfileRow = Database["public"]["Tables"]["buyer_search_profiles"]["Row"];
type BuyerLeadRow = Database["public"]["Tables"]["buyer_leads"]["Row"];
type BuyerPropertyMatchRow = Database["public"]["Tables"]["buyer_property_matches"]["Row"];
type PropertyListingRow = Database["public"]["Tables"]["property_listings"]["Row"];

export type BuyerSearchMatchListItem = {
  id: string;
  score: number;
  status: string;
  computedAt: string;
  firstSeenAt: string;
  readAt: string | null;
  notifiedAt: string | null;
  listingId: string;
  propertyId: string;
  title: string | null;
  city: string | null;
  propertyType: string | null;
  priceAmount: number | null;
  canonicalPath: string;
  isNew: boolean;
};

export type ClientBuyerSearchDetail = {
  clientProjectId: string;
  clientProjectTitle: string | null;
  clientProjectStatus: string;
  createdAt: string;
  searchProfile: BuyerSearchProfileSnapshot;
  searchProfileUpdatedAt: string;
  buyerLeadId: string | null;
  buyerLead: {
    id: string;
    email: string;
    phone: string | null;
    fullName: string;
    emailVerifiedAt: string | null;
  } | null;
  matches: BuyerSearchMatchListItem[];
  unreadCount: number;
  totalMatches: number;
};

const toSearchProfileSnapshot = (row: BuyerSearchProfileRow): BuyerSearchProfileSnapshot => ({
  id: row.id,
  buyerLeadId: row.buyer_lead_id,
  businessType: row.business_type as PropertyBusinessType,
  status: row.status,
  locationText: row.location_text,
  cities: row.cities ?? [],
  propertyTypes: row.property_types ?? [],
  budgetMin: row.budget_min,
  budgetMax: row.budget_max,
  roomsMin: row.rooms_min,
  roomsMax: row.rooms_max,
  bedroomsMin: row.bedrooms_min,
  livingAreaMin: row.living_area_min,
  livingAreaMax: row.living_area_max,
  floorMin: row.floor_min,
  floorMax: row.floor_max,
  requiresTerrace: row.requires_terrace,
  requiresElevator: row.requires_elevator,
  criteria: row.criteria ?? {},
});

const loadBuyerProjectRowByClientProjectId = async (
  clientProjectId: string
): Promise<BuyerProjectRow | null> => {
  const { data, error } = await supabaseAdmin
    .from("buyer_projects")
    .select("*")
    .eq("client_project_id", clientProjectId)
    .maybeSingle();
  if (error) throw error;
  return (data as BuyerProjectRow | null) ?? null;
};

export const getClientBuyerSearchDetail = async (input: {
  clientProfileId: string;
  clientProjectId: string;
}): Promise<ClientBuyerSearchDetail | null> => {
  // client_projects + buyer_projects can be resolved in parallel: both
  // filter on the same client_project_id and do not depend on each other.
  const [projectResult, buyerProjectResult] = await Promise.all([
    supabaseAdmin
      .from("client_projects")
      .select(
        "id, client_profile_id, project_type, title, status, created_at"
      )
      .eq("id", input.clientProjectId)
      .eq("client_profile_id", input.clientProfileId)
      .eq("project_type", "buyer")
      .maybeSingle(),
    supabaseAdmin
      .from("buyer_projects")
      .select("*")
      .eq("client_project_id", input.clientProjectId)
      .maybeSingle(),
  ]);
  if (projectResult.error) throw projectResult.error;
  if (buyerProjectResult.error) throw buyerProjectResult.error;

  const project = projectResult.data as Pick<
    ClientProjectRow,
    "id" | "client_profile_id" | "project_type" | "title" | "status" | "created_at"
  > | null;
  if (!project) return null;
  const buyerProject = (buyerProjectResult.data as BuyerProjectRow | null) ?? null;

  let searchProfileRow: BuyerSearchProfileRow | null = null;
  if (buyerProject?.active_search_profile_id) {
    const { data, error } = await supabaseAdmin
      .from("buyer_search_profiles")
      .select("*")
      .eq("id", buyerProject.active_search_profile_id)
      .maybeSingle();
    if (error) throw error;
    searchProfileRow = (data as BuyerSearchProfileRow | null) ?? null;
  }

  if (!searchProfileRow) {
    const { data, error } = await supabaseAdmin
      .from("buyer_search_profiles")
      .select("*")
      .eq("client_project_id", project.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    searchProfileRow = (data as BuyerSearchProfileRow | null) ?? null;
  }

  if (!searchProfileRow) {
    return null;
  }

  const buyerLeadId = buyerProject?.buyer_lead_id ?? searchProfileRow.buyer_lead_id;

  // buyer_lead, matches + their listings can all run in parallel once the
  // search profile id is known. Matches then drives a final listings IN(...)
  // lookup only when matches are present.
  const [buyerLeadResult, matchesResult] = await Promise.all([
    buyerLeadId
      ? supabaseAdmin
          .from("buyer_leads")
          .select("id, email, phone, full_name, email_verified_at")
          .eq("id", buyerLeadId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null } as {
          data: Pick<
            BuyerLeadRow,
            "id" | "email" | "phone" | "full_name" | "email_verified_at"
          > | null;
          error: null;
        }),
    supabaseAdmin
      .from("buyer_property_matches")
      .select(
        "id, score, status, computed_at, first_seen_at, created_at, read_at, notified_at, property_listing_id"
      )
      .eq("buyer_search_profile_id", searchProfileRow.id)
      .order("score", { ascending: false })
      .limit(100),
  ]);
  if (buyerLeadResult.error) throw buyerLeadResult.error;
  if (matchesResult.error) throw matchesResult.error;

  const buyerLeadRow = buyerLeadResult.data as Pick<
    BuyerLeadRow,
    "id" | "email" | "phone" | "full_name" | "email_verified_at"
  > | null;

  const matchRows = (matchesResult.data ?? []) as Array<
    Pick<
      BuyerPropertyMatchRow,
      | "id"
      | "score"
      | "status"
      | "computed_at"
      | "first_seen_at"
      | "created_at"
      | "read_at"
      | "notified_at"
      | "property_listing_id"
    >
  >;

  const listingIds = matchRows.map((row) => row.property_listing_id);
  let listingById = new Map<
    string,
    Pick<
      PropertyListingRow,
      "id" | "property_id" | "title" | "city" | "property_type" | "price_amount" | "canonical_path"
    >
  >();
  if (listingIds.length > 0) {
    const { data, error } = await supabaseAdmin
      .from("property_listings")
      .select("id, property_id, title, city, property_type, price_amount, canonical_path")
      .in("id", listingIds);
    if (error) throw error;
    listingById = new Map(
      (
        (data ?? []) as Array<
          Pick<
            PropertyListingRow,
            "id" | "property_id" | "title" | "city" | "property_type" | "price_amount" | "canonical_path"
          >
        >
      ).map((row) => [row.id, row])
    );
  }

  const matches: BuyerSearchMatchListItem[] = matchRows.flatMap((row) => {
    const listing = listingById.get(row.property_listing_id);
    if (!listing) return [];
    return [
      {
        id: row.id,
        score: row.score,
        status: row.status,
        computedAt: row.computed_at,
        firstSeenAt: row.first_seen_at ?? row.created_at,
        readAt: row.read_at,
        notifiedAt: row.notified_at,
        listingId: listing.id,
        propertyId: listing.property_id,
        title: listing.title,
        city: listing.city,
        propertyType: listing.property_type,
        priceAmount: listing.price_amount,
        canonicalPath: listing.canonical_path,
        isNew: !row.read_at,
      },
    ];
  });

  const unreadCount = matches.filter((item) => item.isNew).length;

  return {
    clientProjectId: project.id,
    clientProjectTitle: project.title,
    clientProjectStatus: project.status,
    createdAt: project.created_at,
    searchProfile: toSearchProfileSnapshot(searchProfileRow),
    searchProfileUpdatedAt: searchProfileRow.updated_at,
    buyerLeadId,
    buyerLead: buyerLeadRow
      ? {
          id: buyerLeadRow.id,
          email: buyerLeadRow.email,
          phone: buyerLeadRow.phone,
          fullName: buyerLeadRow.full_name,
          emailVerifiedAt: buyerLeadRow.email_verified_at,
        }
      : null,
    matches,
    unreadCount,
    totalMatches: matches.length,
  };
};

// Postgres error code 42703 == undefined_column. We return it as a soft
// signal whenever the prod DB is missing a column the code expects (e.g.
// a migration not yet applied). The caller can then degrade gracefully
// instead of bubbling a 500 to the user.
const PG_UNDEFINED_COLUMN = "42703";
const isUndefinedColumnError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; message?: unknown };
  if (candidate.code === PG_UNDEFINED_COLUMN) return true;
  if (typeof candidate.message === "string" && /column .*does not exist/i.test(candidate.message)) {
    return true;
  }
  return false;
};

export const countUnreadMatchesByClientProjectIds = async (
  clientProjectIds: string[]
): Promise<Record<string, number>> => {
  if (clientProjectIds.length === 0) return {};

  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from("buyer_search_profiles")
    .select("id, client_project_id")
    .in("client_project_id", clientProjectIds);
  if (profilesError) {
    if (isUndefinedColumnError(profilesError)) {
      // eslint-disable-next-line no-console
      console.warn(
        "[buyer-portal] countUnreadMatchesByClientProjectIds: column missing on buyer_search_profiles, degrading to zero unread counts. Apply migration 20260510_020_buyer_funnel_lot1.sql.",
        { code: profilesError.code, message: profilesError.message }
      );
      return {};
    }
    throw profilesError;
  }

  const rows = (profiles ?? []) as Array<{ id: string; client_project_id: string | null }>;
  if (rows.length === 0) return {};

  const profileIdToProject = new Map<string, string>();
  for (const row of rows) {
    if (row.client_project_id) {
      profileIdToProject.set(row.id, row.client_project_id);
    }
  }

  const profileIds = [...profileIdToProject.keys()];
  if (profileIds.length === 0) return {};

  const { data: matches, error: matchesError } = await supabaseAdmin
    .from("buyer_property_matches")
    .select("buyer_search_profile_id, read_at")
    .in("buyer_search_profile_id", profileIds)
    .is("read_at", null);
  if (matchesError) {
    if (isUndefinedColumnError(matchesError)) {
      // Production DBs that are still on migration 019 don't have the
      // read_at / notified_at / first_seen_at columns from migration 020.
      // Falling back to zero unread keeps the client hub usable; the badge
      // will light up automatically once the migration is applied.
      // eslint-disable-next-line no-console
      console.warn(
        "[buyer-portal] countUnreadMatchesByClientProjectIds: read_at column missing on buyer_property_matches, degrading to zero unread counts. Apply migration 20260510_020_buyer_funnel_lot1.sql to restore unread badges.",
        { code: matchesError.code, message: matchesError.message }
      );
      return {};
    }
    throw matchesError;
  }

  const result: Record<string, number> = {};
  for (const row of (matches ?? []) as Array<{ buyer_search_profile_id: string }>) {
    const projectId = profileIdToProject.get(row.buyer_search_profile_id);
    if (!projectId) continue;
    result[projectId] = (result[projectId] ?? 0) + 1;
  }
  return result;
};

export type UpdateBuyerSearchInput = {
  clientProfileId: string;
  clientProjectId: string;
  patch: Partial<{
    locationText: string | null;
    cities: string[];
    propertyTypes: string[];
    businessType: PropertyBusinessType;
    budgetMin: number | null;
    budgetMax: number | null;
    roomsMin: number | null;
    roomsMax: number | null;
    bedroomsMin: number | null;
    livingAreaMin: number | null;
    livingAreaMax: number | null;
    floorMin: number | null;
    floorMax: number | null;
    requiresTerrace: boolean | null;
    requiresElevator: boolean | null;
    status: "active" | "paused" | "closed";
    zonePolygon: Array<[number, number]> | null;
  }>;
};

const fetchSearchProfileForOwner = async (input: {
  clientProfileId: string;
  clientProjectId: string;
}): Promise<BuyerSearchProfileRow | null> => {
  const { data: project, error: projectError } = await supabaseAdmin
    .from("client_projects")
    .select("id, client_profile_id, project_type")
    .eq("id", input.clientProjectId)
    .maybeSingle();
  if (projectError) throw projectError;
  if (!project || project.client_profile_id !== input.clientProfileId || project.project_type !== "buyer") {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from("buyer_search_profiles")
    .select("*")
    .eq("client_project_id", input.clientProjectId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as BuyerSearchProfileRow | null) ?? null;
};

export const updateBuyerSearch = async (
  input: UpdateBuyerSearchInput
): Promise<BuyerSearchProfileSnapshot | null> => {
  const profile = await fetchSearchProfileForOwner({
    clientProfileId: input.clientProfileId,
    clientProjectId: input.clientProjectId,
  });
  if (!profile) return null;

  const updates: Database["public"]["Tables"]["buyer_search_profiles"]["Update"] = {
    updated_at: new Date().toISOString(),
  };
  if (input.patch.locationText !== undefined) updates.location_text = input.patch.locationText;
  if (input.patch.cities !== undefined) updates.cities = input.patch.cities;
  if (input.patch.propertyTypes !== undefined) updates.property_types = input.patch.propertyTypes;
  if (input.patch.businessType !== undefined) updates.business_type = input.patch.businessType;
  if (input.patch.budgetMin !== undefined) updates.budget_min = input.patch.budgetMin;
  if (input.patch.budgetMax !== undefined) updates.budget_max = input.patch.budgetMax;
  if (input.patch.roomsMin !== undefined) updates.rooms_min = input.patch.roomsMin;
  if (input.patch.roomsMax !== undefined) updates.rooms_max = input.patch.roomsMax;
  if (input.patch.bedroomsMin !== undefined) updates.bedrooms_min = input.patch.bedroomsMin;
  if (input.patch.livingAreaMin !== undefined) updates.living_area_min = input.patch.livingAreaMin;
  if (input.patch.livingAreaMax !== undefined) updates.living_area_max = input.patch.livingAreaMax;
  if (input.patch.floorMin !== undefined) updates.floor_min = input.patch.floorMin;
  if (input.patch.floorMax !== undefined) updates.floor_max = input.patch.floorMax;
  if (input.patch.requiresTerrace !== undefined) updates.requires_terrace = input.patch.requiresTerrace;
  if (input.patch.requiresElevator !== undefined) updates.requires_elevator = input.patch.requiresElevator;
  if (input.patch.status !== undefined) updates.status = input.patch.status;
  if (input.patch.zonePolygon !== undefined) {
    const existingCriteria =
      (profile.criteria as Record<string, unknown> | null) ?? {};
    const nextCriteria: Record<string, unknown> = { ...existingCriteria };
    if (input.patch.zonePolygon && input.patch.zonePolygon.length >= 3) {
      nextCriteria.zonePolygon = input.patch.zonePolygon;
    } else {
      delete nextCriteria.zonePolygon;
    }
    updates.criteria = nextCriteria;
  }

  const { data, error } = await supabaseAdmin
    .from("buyer_search_profiles")
    .update(updates)
    .eq("id", profile.id)
    .select("*")
    .single();
  if (error) throw error;
  const updatedRow = data as BuyerSearchProfileRow;

  const shouldRecompute =
    input.patch.status === undefined || input.patch.status === "active";
  if (shouldRecompute && updatedRow.status === "active") {
    try {
      const result = await recomputeMatchesForBuyerLead(updatedRow.buyer_lead_id);
      if (result.newMatches.length > 0) {
        await processBuyerAlertsForNewMatches(result.newMatches);
      }
    } catch (error) {
      console.error("[buyer-portal] criteria recompute failed", error);
    }
  }

  return toSearchProfileSnapshot(updatedRow);
};

export const setBuyerSearchStatus = async (input: {
  clientProfileId: string;
  clientProjectId: string;
  status: "active" | "paused" | "closed";
}) => {
  return updateBuyerSearch({
    clientProfileId: input.clientProfileId,
    clientProjectId: input.clientProjectId,
    patch: { status: input.status },
  });
};

export const archiveBuyerSearch = async (input: {
  clientProfileId: string;
  clientProjectId: string;
}) => {
  const profile = await fetchSearchProfileForOwner(input);
  if (!profile) return false;

  const nowIso = new Date().toISOString();
  const { error: profileError } = await supabaseAdmin
    .from("buyer_search_profiles")
    .update({ status: "closed", updated_at: nowIso })
    .eq("id", profile.id);
  if (profileError) throw profileError;

  const { error: projectError } = await supabaseAdmin
    .from("client_projects")
    .update({ status: "archived", updated_at: nowIso })
    .eq("id", input.clientProjectId)
    .eq("client_profile_id", input.clientProfileId);
  if (projectError) throw projectError;

  return true;
};

export const markBuyerSearchMatchesRead = async (input: {
  clientProfileId: string;
  clientProjectId: string;
}): Promise<number> => {
  const profile = await fetchSearchProfileForOwner(input);
  if (!profile) return 0;

  const nowIso = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("buyer_property_matches")
    .update({ read_at: nowIso, updated_at: nowIso })
    .eq("buyer_search_profile_id", profile.id)
    .is("read_at", null)
    .select("id");
  if (error) throw error;
  return (data ?? []).length;
};
