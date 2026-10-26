import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Database } from "@/types/db/supabase";
import { isPublicAvailabilityStatus } from "@/lib/properties/canonical-types";
import { ALERT_SCORE_THRESHOLD, buildMatchScore, isMatchRetained } from "@/lib/buyers/match-scoring";

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

// Borne explicite (PostgREST plafonne déjà à 1000 lignes par défaut) :
// le matching travaille sur le stock publié, pas sur un historique illimité.
const MATCHING_SCAN_LIMIT = 1000;

const listActiveListings = async () => {
  const { data, error } = await supabaseAdmin
    .from("property_listings")
    .select("*")
    .eq("is_published", true)
    .eq("publication_status", "active")
    .limit(MATCHING_SCAN_LIMIT);

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
  /** Correspondances créées par ce recalcul (paire profil × annonce inconnue avant). */
  newMatches: RecomputeNewMatch[];
  /**
   * Correspondances à alerter : score ≥ ALERT_SCORE_THRESHOLD et jamais
   * notifiées, qu'elles soient nouvelles ou qu'un recalcul vienne de les
   * faire passer le seuil (décision du 26/10/2026).
   */
  alertCandidates: RecomputeNewMatch[];
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

type MatchUpsertRow = {
  buyer_lead_id: string;
  buyer_search_profile_id: string;
  property_id: string;
  property_listing_id: string;
  score: number;
  status: string;
  blockers: never[];
  matched_criteria: Record<string, unknown>;
  computed_at: string;
  updated_at: string;
};

const matchPairKey = (profileId: string, listingId: string) =>
  `${profileId}:${listingId}`;

// Upsert en UNE requête (onConflict sur la contrainte UNIQUE
// (buyer_search_profile_id, property_listing_id)) au lieu d'un
// select + insert/update par match. Les colonnes absentes du payload
// (notes, created_at) sont préservées sur les lignes existantes.
const batchUpsertMatches = async (input: {
  rows: MatchUpsertRow[];
  existingPairs: Set<string>;
}): Promise<{ newMatches: RecomputeNewMatch[]; alertCandidates: RecomputeNewMatch[] }> => {
  if (input.rows.length === 0) return { newMatches: [], alertCandidates: [] };

  const { data, error } = await supabaseAdmin
    .from("buyer_property_matches")
    .upsert(input.rows, { onConflict: "buyer_search_profile_id,property_listing_id" })
    .select("id, buyer_lead_id, buyer_search_profile_id, property_id, property_listing_id, score, notified_at");
  if (error) throw new Error(error.message);

  const rows = (data ?? []).map((row) => ({
    match: {
      matchId: row.id,
      buyerLeadId: row.buyer_lead_id,
      buyerSearchProfileId: row.buyer_search_profile_id,
      propertyId: row.property_id,
      propertyListingId: row.property_listing_id,
      score: row.score,
    },
    isNew: !input.existingPairs.has(matchPairKey(row.buyer_search_profile_id, row.property_listing_id)),
    notifiedAt: row.notified_at,
  }));

  return {
    newMatches: rows.filter((row) => row.isNew).map((row) => row.match),
    alertCandidates: rows
      .filter((row) => !row.notifiedAt && row.match.score >= ALERT_SCORE_THRESHOLD)
      .map((row) => row.match),
  };
};

export const recomputeMatchesForBuyerLead = async (
  buyerLeadId: string
): Promise<RecomputeMatchesResult> => {
  const profiles = await getAllActiveProfilesForLead(buyerLeadId);
  if (profiles.length === 0) {
    return { newMatches: [], alertCandidates: [], totalMatches: 0 };
  }

  const listings = await listActiveListings();
  const now = new Date().toISOString();
  const newMatches: RecomputeNewMatch[] = [];
  const alertCandidates: RecomputeNewMatch[] = [];
  let totalMatches = 0;

  for (const profile of profiles) {
    const evaluated = listings
      .map((listing) => ({ listing, evaluation: buildMatchScore(profile, listing) }))
      .filter(({ evaluation }) => isMatchRetained(evaluation))
      .sort((left, right) => right.evaluation.score - left.evaluation.score)
      .slice(0, 50);

    // 3 requêtes par profil (lecture existant, suppression obsolètes,
    // upsert batch) au lieu de 2-3 requêtes PAR match.
    const { data: existingRows, error: existingError } = await supabaseAdmin
      .from("buyer_property_matches")
      .select("id, property_listing_id")
      .eq("buyer_search_profile_id", profile.id);
    if (existingError) throw new Error(existingError.message);

    const keepListingIds = new Set(evaluated.map(({ listing }) => listing.id));
    const obsoleteIds = (existingRows ?? [])
      .filter((row) => !keepListingIds.has(row.property_listing_id))
      .map((row) => row.id);
    if (obsoleteIds.length > 0) {
      const { error } = await supabaseAdmin
        .from("buyer_property_matches")
        .delete()
        .in("id", obsoleteIds);
      if (error) throw new Error(error.message);
    }

    const existingPairs = new Set(
      (existingRows ?? []).map((row) => matchPairKey(profile.id, row.property_listing_id))
    );
    const created = await batchUpsertMatches({
      rows: evaluated.map(({ listing, evaluation }) => ({
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
      })),
      existingPairs,
    });

    newMatches.push(...created.newMatches);
    alertCandidates.push(...created.alertCandidates);
    totalMatches += evaluated.length;
  }

  return { newMatches, alertCandidates, totalMatches };
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
    return { newMatches: [], alertCandidates: [], totalMatches: 0 };
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
    return { newMatches: [], alertCandidates: [], totalMatches: 0 };
  }

  const listing = listingData as PropertyListingRow;

  const { data: profilesData, error: profilesError } = await supabaseAdmin
    .from("buyer_search_profiles")
    .select("*")
    .eq("status", "active")
    .limit(MATCHING_SCAN_LIMIT);
  if (profilesError) {
    throw new Error(profilesError.message);
  }
  const profiles = (profilesData ?? []) as BuyerSearchProfileRow[];

  const matching = profiles
    .map((profile) => ({ profile, evaluation: buildMatchScore(profile, listing) }))
    .filter(({ evaluation }) => isMatchRetained(evaluation))
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
  const existingPairs = new Set(
    (existingRows ?? []).map((row) =>
      matchPairKey(row.buyer_search_profile_id, listing.id)
    )
  );

  // Un seul upsert batch (jusqu'à 200 lignes) au lieu de 2-3 requêtes
  // par profil correspondant.
  const upserted = await batchUpsertMatches({
    rows: matching.map(({ profile, evaluation }) => ({
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
    })),
    existingPairs,
  });

  return { ...upserted, totalMatches: matching.length };
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
