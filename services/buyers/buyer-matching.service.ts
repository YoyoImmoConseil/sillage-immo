import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Database } from "@/types/db/supabase";
import { isPublicAvailabilityStatus } from "@/lib/properties/canonical-types";

type BuyerLeadRow = Database["public"]["Tables"]["buyer_leads"]["Row"];
type BuyerSearchProfileRow = Database["public"]["Tables"]["buyer_search_profiles"]["Row"];
type PropertyListingRow = Database["public"]["Tables"]["property_listings"]["Row"];
type BuyerPropertyMatchRow = Database["public"]["Tables"]["buyer_property_matches"]["Row"];

export type BuyerMatchListItem = {
  id: string;
  score: number;
  status: string;
  computedAt: string;
  listingId: string;
  propertyId: string;
  title: string | null;
  city: string | null;
  propertyType: string | null;
  priceAmount: number | null;
  canonicalPath: string;
};

export type PropertyBuyerMatchListItem = {
  id: string;
  score: number;
  status: string;
  computedAt: string;
  buyerLeadId: string;
  fullName: string;
  email: string;
  statusLabel: string;
};

const normalizeToken = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const buildMatchScore = (profile: BuyerSearchProfileRow, listing: PropertyListingRow) => {
  let score = 0;
  const matchedCriteria: Record<string, unknown> = {};
  const blockers: string[] = [];

  if (profile.business_type !== listing.business_type) {
    blockers.push("business_type");
  } else {
    score += 20;
    matchedCriteria.businessType = true;
  }

  if (profile.property_types.length > 0) {
    const propertyType = normalizeToken(listing.property_type ?? "");
    const allowedTypes = profile.property_types.map(normalizeToken);
    if (!propertyType || !allowedTypes.includes(propertyType)) {
      blockers.push("property_type");
    } else {
      score += 15;
      matchedCriteria.propertyType = listing.property_type;
    }
  }

  if (profile.cities.length > 0) {
    const city = normalizeToken(listing.city ?? "");
    const allowedCities = profile.cities.map(normalizeToken);
    if (!city || !allowedCities.includes(city)) {
      blockers.push("city");
    } else {
      score += 15;
      matchedCriteria.city = listing.city;
    }
  }

  if (typeof profile.budget_max === "number" && typeof listing.price_amount === "number") {
    if (listing.price_amount > profile.budget_max) {
      blockers.push("budget_max");
    } else {
      score += 15;
      matchedCriteria.budgetMax = true;
    }
  }

  if (typeof profile.budget_min === "number" && typeof listing.price_amount === "number") {
    if (listing.price_amount < profile.budget_min) {
      blockers.push("budget_min");
    } else {
      score += 5;
      matchedCriteria.budgetMin = true;
    }
  }

  if (typeof profile.rooms_min === "number") {
    if (typeof listing.rooms !== "number" || listing.rooms < profile.rooms_min) {
      blockers.push("rooms_min");
    } else {
      score += 10;
      matchedCriteria.roomsMin = true;
    }
  }

  if (typeof profile.rooms_max === "number" && typeof listing.rooms === "number") {
    if (listing.rooms > profile.rooms_max) {
      blockers.push("rooms_max");
    }
  }

  if (typeof profile.bedrooms_min === "number") {
    if (typeof listing.bedrooms !== "number" || listing.bedrooms < profile.bedrooms_min) {
      blockers.push("bedrooms_min");
    } else {
      score += 5;
      matchedCriteria.bedroomsMin = true;
    }
  }

  if (typeof profile.living_area_min === "number") {
    if (typeof listing.living_area !== "number" || listing.living_area < profile.living_area_min) {
      blockers.push("living_area_min");
    } else {
      score += 10;
      matchedCriteria.livingAreaMin = true;
    }
  }

  if (typeof profile.living_area_max === "number" && typeof listing.living_area === "number") {
    if (listing.living_area > profile.living_area_max) {
      blockers.push("living_area_max");
    }
  }

  if (typeof profile.floor_min === "number") {
    if (typeof listing.floor !== "number" || listing.floor < profile.floor_min) {
      blockers.push("floor_min");
    } else {
      score += 3;
      matchedCriteria.floorMin = true;
    }
  }

  if (typeof profile.floor_max === "number" && typeof listing.floor === "number") {
    if (listing.floor > profile.floor_max) {
      blockers.push("floor_max");
    }
  }

  if (profile.requires_terrace === true) {
    if (listing.has_terrace !== true) {
      blockers.push("requires_terrace");
    } else {
      score += 6;
      matchedCriteria.requiresTerrace = true;
    }
  }

  if (profile.requires_elevator === true) {
    if (listing.has_elevator !== true) {
      blockers.push("requires_elevator");
    } else {
      score += 6;
      matchedCriteria.requiresElevator = true;
    }
  }

  return {
    score,
    blockers,
    matchedCriteria,
  };
};

const listActiveListings = async () => {
  const { data, error } = await supabaseAdmin
    .from("property_listings")
    .select("*")
    .eq("is_published", true)
    .eq("publication_status", "active");

  if (error) {
    throw new Error(error.message);
  }

  const listings = (data ?? []) as PropertyListingRow[];
  if (listings.length === 0) return listings;

  // Defensive: do not match buyers against properties whose SweepBright status
  // is not publicly commercialized (e.g. `prospect` / estimation in progress).
  // The ingestion pipeline already keeps such listings unpublished, but we
  // guard here as well so a stale row never triggers a buyer alert.
  const propertyIds = Array.from(new Set(listings.map((l) => l.property_id)));
  const { data: propertiesData, error: propertiesError } = await supabaseAdmin
    .from("properties")
    .select("id, availability_status")
    .in("id", propertyIds);

  if (propertiesError) {
    throw new Error(propertiesError.message);
  }

  const allowedPropertyIds = new Set(
    (propertiesData ?? [])
      .filter((p) => isPublicAvailabilityStatus(p.availability_status))
      .map((p) => p.id)
  );

  return listings.filter((l) => allowedPropertyIds.has(l.property_id));
};

export type RecomputeNewMatch = {
  matchId: string;
  buyerLeadId: string;
  buyerSearchProfileId: string;
  propertyId: string;
  propertyListingId: string;
  score: number;
};

export type RecomputeMatchesResult = {
  newMatches: RecomputeNewMatch[];
  totalMatches: number;
};

const getAllActiveProfilesForLead = async (buyerLeadId: string): Promise<BuyerSearchProfileRow[]> => {
  const { data, error } = await supabaseAdmin
    .from("buyer_search_profiles")
    .select("*")
    .eq("buyer_lead_id", buyerLeadId)
    .eq("status", "active");
  if (error) throw new Error(error.message);
  return (data ?? []) as BuyerSearchProfileRow[];
};

const upsertMatchPreservingFlags = async (input: {
  buyerLeadId: string;
  profileId: string;
  propertyId: string;
  propertyListingId: string;
  score: number;
  status: string;
  matchedCriteria: Record<string, unknown>;
  computedAt: string;
}): Promise<"created" | "updated"> => {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("buyer_property_matches")
    .select("id")
    .eq("buyer_search_profile_id", input.profileId)
    .eq("property_listing_id", input.propertyListingId)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);

  if (existing) {
    const { error } = await supabaseAdmin
      .from("buyer_property_matches")
      .update({
        score: input.score,
        status: input.status,
        blockers: [],
        matched_criteria: input.matchedCriteria,
        computed_at: input.computedAt,
        updated_at: input.computedAt,
      })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    return "updated";
  }

  const { error } = await supabaseAdmin
    .from("buyer_property_matches")
    .insert({
      buyer_lead_id: input.buyerLeadId,
      buyer_search_profile_id: input.profileId,
      property_id: input.propertyId,
      property_listing_id: input.propertyListingId,
      score: input.score,
      status: input.status,
      blockers: [],
      matched_criteria: input.matchedCriteria,
      computed_at: input.computedAt,
      updated_at: input.computedAt,
    });
  if (error) throw new Error(error.message);
  return "created";
};

const deleteObsoleteMatchesForProfile = async (input: {
  profileId: string;
  keepListingIds: string[];
}) => {
  if (input.keepListingIds.length === 0) {
    const { error } = await supabaseAdmin
      .from("buyer_property_matches")
      .delete()
      .eq("buyer_search_profile_id", input.profileId);
    if (error) throw new Error(error.message);
    return;
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("buyer_property_matches")
    .select("id, property_listing_id")
    .eq("buyer_search_profile_id", input.profileId);
  if (existingError) throw new Error(existingError.message);

  const toDeleteIds = (existing ?? [])
    .filter((row) => !input.keepListingIds.includes(row.property_listing_id))
    .map((row) => row.id);

  if (toDeleteIds.length === 0) return;
  const { error } = await supabaseAdmin
    .from("buyer_property_matches")
    .delete()
    .in("id", toDeleteIds);
  if (error) throw new Error(error.message);
};

export const recomputeMatchesForBuyerLead = async (
  buyerLeadId: string
): Promise<RecomputeMatchesResult> => {
  const profiles = await getAllActiveProfilesForLead(buyerLeadId);
  if (profiles.length === 0) {
    return { newMatches: [], totalMatches: 0 };
  }

  const listings = await listActiveListings();
  const now = new Date().toISOString();
  const newMatches: RecomputeNewMatch[] = [];
  let totalMatches = 0;

  for (const profile of profiles) {
    const evaluated = listings
      .map((listing) => ({ listing, evaluation: buildMatchScore(profile, listing) }))
      .filter(({ evaluation }) => evaluation.blockers.length === 0 && evaluation.score > 0)
      .sort((left, right) => right.evaluation.score - left.evaluation.score)
      .slice(0, 50);

    await deleteObsoleteMatchesForProfile({
      profileId: profile.id,
      keepListingIds: evaluated.map(({ listing }) => listing.id),
    });

    for (const { listing, evaluation } of evaluated) {
      const status = await upsertMatchPreservingFlags({
        buyerLeadId: profile.buyer_lead_id,
        profileId: profile.id,
        propertyId: listing.property_id,
        propertyListingId: listing.id,
        score: evaluation.score,
        status: "suggested",
        matchedCriteria: evaluation.matchedCriteria,
        computedAt: now,
      });
      totalMatches += 1;
      if (status === "created") {
        const { data: matchRow } = await supabaseAdmin
          .from("buyer_property_matches")
          .select("id")
          .eq("buyer_search_profile_id", profile.id)
          .eq("property_listing_id", listing.id)
          .maybeSingle();
        if (matchRow) {
          newMatches.push({
            matchId: matchRow.id,
            buyerLeadId: profile.buyer_lead_id,
            buyerSearchProfileId: profile.id,
            propertyId: listing.property_id,
            propertyListingId: listing.id,
            score: evaluation.score,
          });
        }
      }
    }
  }

  return { newMatches, totalMatches };
};

export const recomputeMatchesForProperty = async (
  propertyId: string
): Promise<RecomputeMatchesResult> => {
  // Defensive: skip matching for properties not allowed on the public surface
  // (e.g. `prospect` / estimation in progress). Without this guard, an
  // incoming SweepBright webhook on a non-public property could otherwise
  // trigger buyer alerts as a side-effect.
  const { data: propertyData, error: propertyError } = await supabaseAdmin
    .from("properties")
    .select("availability_status")
    .eq("id", propertyId)
    .maybeSingle();
  if (propertyError) {
    throw new Error(propertyError.message);
  }
  if (
    !propertyData ||
    !isPublicAvailabilityStatus(propertyData.availability_status)
  ) {
    return { newMatches: [], totalMatches: 0 };
  }

  const { data: listingData, error: listingError } = await supabaseAdmin
    .from("property_listings")
    .select("*")
    .eq("property_id", propertyId)
    .eq("is_published", true)
    .eq("publication_status", "active")
    .maybeSingle();

  if (listingError) {
    throw new Error(listingError.message);
  }
  if (!listingData) {
    return { newMatches: [], totalMatches: 0 };
  }

  const listing = listingData as PropertyListingRow;

  const { data: profilesData, error: profilesError } = await supabaseAdmin
    .from("buyer_search_profiles")
    .select("*")
    .eq("status", "active");
  if (profilesError) {
    throw new Error(profilesError.message);
  }
  const profiles = (profilesData ?? []) as BuyerSearchProfileRow[];

  const matching = profiles
    .map((profile) => ({ profile, evaluation: buildMatchScore(profile, listing) }))
    .filter(({ evaluation }) => evaluation.blockers.length === 0 && evaluation.score > 0)
    .sort((left, right) => right.evaluation.score - left.evaluation.score)
    .slice(0, 200);

  const matchingProfileIds = new Set(matching.map(({ profile }) => profile.id));
  const { data: existingRows, error: existingError } = await supabaseAdmin
    .from("buyer_property_matches")
    .select("id, buyer_search_profile_id")
    .eq("property_listing_id", listing.id);
  if (existingError) throw new Error(existingError.message);

  const obsoleteIds = (existingRows ?? [])
    .filter((row) => !matchingProfileIds.has(row.buyer_search_profile_id))
    .map((row) => row.id);
  if (obsoleteIds.length > 0) {
    const { error } = await supabaseAdmin
      .from("buyer_property_matches")
      .delete()
      .in("id", obsoleteIds);
    if (error) throw new Error(error.message);
  }

  const now = new Date().toISOString();
  const newMatches: RecomputeNewMatch[] = [];

  for (const { profile, evaluation } of matching) {
    const status = await upsertMatchPreservingFlags({
      buyerLeadId: profile.buyer_lead_id,
      profileId: profile.id,
      propertyId: listing.property_id,
      propertyListingId: listing.id,
      score: evaluation.score,
      status: "suggested",
      matchedCriteria: evaluation.matchedCriteria,
      computedAt: now,
    });

    if (status === "created") {
      const { data: matchRow } = await supabaseAdmin
        .from("buyer_property_matches")
        .select("id")
        .eq("buyer_search_profile_id", profile.id)
        .eq("property_listing_id", listing.id)
        .maybeSingle();
      if (matchRow) {
        newMatches.push({
          matchId: matchRow.id,
          buyerLeadId: profile.buyer_lead_id,
          buyerSearchProfileId: profile.id,
          propertyId: listing.property_id,
          propertyListingId: listing.id,
          score: evaluation.score,
        });
      }
    }
  }

  return { newMatches, totalMatches: matching.length };
};

export const listMatchesForBuyerLead = async (buyerLeadId: string): Promise<BuyerMatchListItem[]> => {
  const { data: matchData, error: matchError } = await supabaseAdmin
    .from("buyer_property_matches")
    .select("*")
    .eq("buyer_lead_id", buyerLeadId)
    .order("score", { ascending: false });

  if (matchError) {
    throw new Error(matchError.message);
  }

  const matches = (matchData ?? []) as BuyerPropertyMatchRow[];
  const listingIds = matches.map((match) => match.property_listing_id);
  const { data: listingData, error: listingError } = listingIds.length
    ? await supabaseAdmin.from("property_listings").select("*").in("id", listingIds)
    : { data: [], error: null };

  if (listingError) {
    throw new Error(listingError.message);
  }

  const listingById = new Map(((listingData ?? []) as PropertyListingRow[]).map((row) => [row.id, row]));

  return matches.flatMap((match) => {
    const listing = listingById.get(match.property_listing_id);
    if (!listing) return [];

    return [
      {
        id: match.id,
        score: match.score,
        status: match.status,
        computedAt: match.computed_at,
        listingId: listing.id,
        propertyId: listing.property_id,
        title: listing.title,
        city: listing.city,
        propertyType: listing.property_type,
        priceAmount: listing.price_amount,
        canonicalPath: listing.canonical_path,
      },
    ];
  });
};

export const listMatchesForProperty = async (propertyId: string): Promise<PropertyBuyerMatchListItem[]> => {
  const { data: matchData, error: matchError } = await supabaseAdmin
    .from("buyer_property_matches")
    .select("*")
    .eq("property_id", propertyId)
    .order("score", { ascending: false });

  if (matchError) {
    throw new Error(matchError.message);
  }

  const matches = (matchData ?? []) as BuyerPropertyMatchRow[];
  const buyerLeadIds = matches.map((match) => match.buyer_lead_id);
  const { data: buyerData, error: buyerError } = buyerLeadIds.length
    ? await supabaseAdmin.from("buyer_leads").select("*").in("id", buyerLeadIds)
    : { data: [], error: null };

  if (buyerError) {
    throw new Error(buyerError.message);
  }

  const buyerById = new Map(((buyerData ?? []) as BuyerLeadRow[]).map((row) => [row.id, row]));

  return matches.flatMap((match) => {
    const buyer = buyerById.get(match.buyer_lead_id);
    if (!buyer) return [];

    return [
      {
        id: match.id,
        score: match.score,
        status: match.status,
        computedAt: match.computed_at,
        buyerLeadId: buyer.id,
        fullName: buyer.full_name,
        email: buyer.email,
        statusLabel: buyer.status,
      },
    ];
  });
};
