import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Database } from "@/types/db/supabase";

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

const getBuyerLeadAndProfile = async (buyerLeadId: string) => {
  const [{ data: leadData, error: leadError }, { data: profileData, error: profileError }] =
    await Promise.all([
      supabaseAdmin.from("buyer_leads").select("*").eq("id", buyerLeadId).maybeSingle(),
      supabaseAdmin.from("buyer_search_profiles").select("*").eq("buyer_lead_id", buyerLeadId).maybeSingle(),
    ]);

  if (leadError) throw new Error(leadError.message);
  if (profileError) throw new Error(profileError.message);
  if (!leadData || !profileData) return null;

  return {
    lead: leadData as BuyerLeadRow,
    profile: profileData as BuyerSearchProfileRow,
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

  return (data ?? []) as PropertyListingRow[];
};

export const recomputeMatchesForBuyerLead = async (buyerLeadId: string) => {
  const buyer = await getBuyerLeadAndProfile(buyerLeadId);
  if (!buyer) return [];

  const listings = await listActiveListings();
  const now = new Date().toISOString();

  const matches = listings
    .map((listing) => ({
      listing,
      evaluation: buildMatchScore(buyer.profile, listing),
    }))
    .filter(({ evaluation }) => evaluation.blockers.length === 0 && evaluation.score > 0)
    .sort((left, right) => right.evaluation.score - left.evaluation.score)
    .slice(0, 50);

  await supabaseAdmin.from("buyer_property_matches").delete().eq("buyer_lead_id", buyerLeadId);

  if (matches.length > 0) {
    const { error } = await supabaseAdmin.from("buyer_property_matches").insert(
      matches.map(({ listing, evaluation }) => ({
        buyer_lead_id: buyerLeadId,
        buyer_search_profile_id: buyer.profile.id,
        property_id: listing.property_id,
        property_listing_id: listing.id,
        score: evaluation.score,
        status: "suggested",
        blockers: [],
        matched_criteria: evaluation.matchedCriteria,
        computed_at: now,
        updated_at: now,
      }))
    );

    if (error) {
      throw new Error(error.message);
    }
  }

  return listMatchesForBuyerLead(buyerLeadId);
};

export const recomputeMatchesForProperty = async (propertyId: string) => {
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
  if (!listingData) return [];

  const { data: profilesData, error: profilesError } = await supabaseAdmin
    .from("buyer_search_profiles")
    .select("*")
    .eq("status", "active");

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const listing = listingData as PropertyListingRow;
  const profiles = (profilesData ?? []) as BuyerSearchProfileRow[];

  const matches = profiles
    .map((profile) => ({
      profile,
      evaluation: buildMatchScore(profile, listing),
    }))
    .filter(({ evaluation }) => evaluation.blockers.length === 0 && evaluation.score > 0)
    .sort((left, right) => right.evaluation.score - left.evaluation.score)
    .slice(0, 50);

  await supabaseAdmin.from("buyer_property_matches").delete().eq("property_id", propertyId);

  if (matches.length > 0) {
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin.from("buyer_property_matches").insert(
      matches.map(({ profile, evaluation }) => ({
        buyer_lead_id: profile.buyer_lead_id,
        buyer_search_profile_id: profile.id,
        property_id: listing.property_id,
        property_listing_id: listing.id,
        score: evaluation.score,
        status: "suggested",
        blockers: [],
        matched_criteria: evaluation.matchedCriteria,
        computed_at: now,
        updated_at: now,
      }))
    );

    if (error) {
      throw new Error(error.message);
    }
  }

  return listMatchesForProperty(propertyId);
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
