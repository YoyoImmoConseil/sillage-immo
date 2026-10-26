import "server-only";

import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendBuyerAlertEmail, sendBuyerPriceDropEmail } from "@/lib/email/buyer-alert";
import type { AppLocale } from "@/lib/i18n/config";
import { localizePath } from "@/lib/i18n/routing";
import type { RecomputeNewMatch } from "./buyer-matching.service";
import { ALERT_SCORE_THRESHOLD, isLeadEligibleForAlerts } from "@/lib/buyers/match-scoring";
import type { Database } from "@/types/db/supabase";

type BuyerLeadRow = Database["public"]["Tables"]["buyer_leads"]["Row"];
type BuyerSearchProfileRow = Database["public"]["Tables"]["buyer_search_profiles"]["Row"];
type PropertyListingRow = Database["public"]["Tables"]["property_listings"]["Row"];
type ClientProjectRow = Database["public"]["Tables"]["client_projects"]["Row"];


const getAlertSecret = () => {
  const secret = process.env.BUYER_ALERT_HMAC_SECRET?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("Missing server env var: BUYER_ALERT_HMAC_SECRET");
  }
  return "dev-only-buyer-alert-secret";
};

const getPublicBaseUrl = () => (process.env.PUBLIC_SITE_URL ?? "").replace(/\/$/, "");

export const signUnsubscribeToken = (clientProjectId: string) => {
  const secret = getAlertSecret();
  return crypto.createHmac("sha256", secret).update(clientProjectId).digest("hex");
};

export const verifyUnsubscribeToken = (clientProjectId: string, token: string) => {
  try {
    const expected = signUnsubscribeToken(clientProjectId);
    const expectedBuf = Buffer.from(expected, "hex");
    const providedBuf = Buffer.from(token, "hex");
    if (expectedBuf.length !== providedBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, providedBuf);
  } catch {
    return false;
  }
};

const buildUnsubscribeUrl = (clientProjectId: string, locale: AppLocale) => {
  const base = getPublicBaseUrl();
  const token = signUnsubscribeToken(clientProjectId);
  const params = new URLSearchParams({ projectId: clientProjectId, token });
  if (locale) params.set("locale", locale);
  return `${base}/api/buyer-searches/unsubscribe?${params.toString()}`;
};

const buildSearchUrl = (clientProjectId: string, locale: AppLocale) => {
  const base = getPublicBaseUrl();
  const path = localizePath(`/espace-client/recherches/${clientProjectId}`, locale);
  return `${base}${path}`;
};

const resolveLocale = (value: string | null | undefined): AppLocale => {
  const allowed: AppLocale[] = ["fr", "en", "es", "ru"];
  if (value && (allowed as string[]).includes(value)) return value as AppLocale;
  return "fr";
};

const buildSearchLabel = (
  profile: BuyerSearchProfileRow,
  project: ClientProjectRow | null
) => {
  if (project?.title) return project.title;
  const parts: string[] = [];
  if (profile.business_type === "rental") parts.push("Location");
  else parts.push("Achat");
  if ((profile.cities ?? []).length > 0) parts.push((profile.cities ?? []).join(", "));
  else if (profile.location_text) parts.push(profile.location_text);
  return parts.join(" · ");
};

const splitFirstName = (fullName: string | null) => {
  if (!fullName) return null;
  const trimmed = fullName.trim();
  if (!trimmed) return null;
  return trimmed.split(/\s+/)[0] ?? null;
};

/**
 * Envoie l'alerte « nouveaux biens pour votre recherche » pour des
 * correspondances jamais notifiées dont le score atteint le seuil (les
 * `alertCandidates` d'un recalcul). Garde-fous : recherche active, adresse
 * présente, et consentement (adresse vérifiée, ou contact venu des formulaires
 * du site / saisi par l'équipe — voir `isLeadEligibleForAlerts`).
 * `notified_at` est posé après envoi : une correspondance n'est alertée qu'une fois.
 */
export const processBuyerAlerts = async (
  candidates: RecomputeNewMatch[]
): Promise<{ notifiedCount: number; skippedCount: number }> => {
  const eligible = candidates.filter((match) => match.score >= ALERT_SCORE_THRESHOLD);
  if (eligible.length === 0) {
    return { notifiedCount: 0, skippedCount: 0 };
  }

  const profileIds = Array.from(new Set(eligible.map((match) => match.buyerSearchProfileId)));
  const { data: profilesData, error: profilesError } = await supabaseAdmin
    .from("buyer_search_profiles")
    .select("*")
    .in("id", profileIds);
  if (profilesError) throw new Error(profilesError.message);
  const profilesById = new Map<string, BuyerSearchProfileRow>(
    ((profilesData ?? []) as BuyerSearchProfileRow[]).map((row) => [row.id, row])
  );

  const clientProjectIds = Array.from(
    new Set(
      ((profilesData ?? []) as BuyerSearchProfileRow[])
        .map((row) => row.client_project_id)
        .filter((value): value is string => Boolean(value))
    )
  );
  let projectsById = new Map<string, ClientProjectRow>();
  if (clientProjectIds.length > 0) {
    const { data: projectsData, error: projectsError } = await supabaseAdmin
      .from("client_projects")
      .select("*")
      .in("id", clientProjectIds);
    if (projectsError) throw new Error(projectsError.message);
    projectsById = new Map(
      ((projectsData ?? []) as ClientProjectRow[]).map((row) => [row.id, row])
    );
  }

  const buyerLeadIds = Array.from(new Set(eligible.map((match) => match.buyerLeadId)));
  const { data: leadsData, error: leadsError } = await supabaseAdmin
    .from("buyer_leads")
    .select("*")
    .in("id", buyerLeadIds);
  if (leadsError) throw new Error(leadsError.message);
  const leadsById = new Map<string, BuyerLeadRow>(
    ((leadsData ?? []) as BuyerLeadRow[]).map((row) => [row.id, row])
  );

  const listingIds = Array.from(new Set(eligible.map((match) => match.propertyListingId)));
  const { data: listingsData, error: listingsError } = await supabaseAdmin
    .from("property_listings")
    .select("*")
    .in("id", listingIds);
  if (listingsError) throw new Error(listingsError.message);
  const listingsById = new Map<string, PropertyListingRow>(
    ((listingsData ?? []) as PropertyListingRow[]).map((row) => [row.id, row])
  );

  // Photo principale : la copie Supabase de la première image du carrousel
  // (URL stable, un mail s'ouvre des jours plus tard) ; à défaut la couverture
  // de l'annonce.
  const propertyIds = Array.from(new Set(((listingsData ?? []) as PropertyListingRow[]).map((row) => row.property_id)));
  const coverByPropertyId = new Map<string, string>();
  if (propertyIds.length > 0) {
    const { data: mediaData, error: mediaError } = await supabaseAdmin
      .from("property_media")
      .select("property_id, kind, ordinal, cached_url, remote_url")
      .in("property_id", propertyIds)
      .eq("kind", "image")
      .order("ordinal", { ascending: true });
    if (mediaError) throw new Error(mediaError.message);
    for (const row of mediaData ?? []) {
      if (coverByPropertyId.has(row.property_id)) continue;
      const url = row.cached_url ?? row.remote_url;
      if (url) coverByPropertyId.set(row.property_id, url);
    }
  }

  const byProfile = new Map<string, RecomputeNewMatch[]>();
  for (const match of eligible) {
    const bucket = byProfile.get(match.buyerSearchProfileId);
    if (bucket) bucket.push(match);
    else byProfile.set(match.buyerSearchProfileId, [match]);
  }

  let notifiedCount = 0;
  let skippedCount = 0;
  const nowIso = new Date().toISOString();

  for (const [profileId, matches] of byProfile.entries()) {
    const profile = profilesById.get(profileId);
    if (!profile || profile.status !== "active") {
      skippedCount += matches.length;
      continue;
    }

    const lead = leadsById.get(profile.buyer_lead_id);
    if (!lead || !isLeadEligibleForAlerts(lead)) {
      skippedCount += matches.length;
      continue;
    }

    const project = profile.client_project_id
      ? (projectsById.get(profile.client_project_id) ?? null)
      : null;
    const clientProjectId = profile.client_project_id ?? project?.id;
    if (!clientProjectId) {
      skippedCount += matches.length;
      continue;
    }

    const locale = resolveLocale(null);

    const alertMatches = matches
      .map((match) => {
        const listing = listingsById.get(match.propertyListingId);
        if (!listing) return null;
        return {
          title: listing.title,
          city: listing.city,
          propertyType: listing.property_type,
          priceAmount: listing.price_amount,
          canonicalPath: listing.canonical_path,
          coverImageUrl: coverByPropertyId.get(listing.property_id) ?? listing.cover_image_url ?? null,
        };
      })
      .filter((value): value is NonNullable<typeof value> => Boolean(value));

    if (alertMatches.length === 0) {
      skippedCount += matches.length;
      continue;
    }

    try {
      const result = await sendBuyerAlertEmail({
        to: lead.email,
        locale,
        firstName: splitFirstName(lead.full_name),
        matches: alertMatches,
        searchLabel: buildSearchLabel(profile, project),
        searchUrl: buildSearchUrl(clientProjectId, locale),
        unsubscribeUrl: buildUnsubscribeUrl(clientProjectId, locale),
      });

      if ("sent" in result && result.sent) {
        // Le prix mémorisé est celui de l'annonce au moment de l'envoi : une
        // baisse ultérieure déclenchera le mail « Nouveau prix ».
        for (const match of matches) {
          const listing = listingsById.get(match.propertyListingId);
          await supabaseAdmin
            .from("buyer_property_matches")
            .update({
              notified_at: nowIso,
              notified_price_amount: listing?.price_amount ?? null,
              updated_at: nowIso,
            })
            .eq("id", match.matchId);
        }
        notifiedCount += matches.length;
      } else {
        skippedCount += matches.length;
      }
    } catch (error) {
      console.error("[buyer-alert] send failed", error);
      skippedCount += matches.length;
    }
  }

  return { notifiedCount, skippedCount };
};

/**
 * Baisse de prix : mail « Nouveau prix » aux acquéreurs qui avaient déjà reçu
 * ce bien (notified_at posé) à un prix supérieur au prix actif, une seule fois
 * par baisse (notified_price_amount mis à jour après envoi). Les
 * correspondances encore en base sont celles que le recalcul vient de retenir
 * (score ≥ seuil) : un acquéreur sorti de la cible n'est pas prévenu.
 */
export const processPriceDropAlerts = async (input: {
  propertyListingId: string;
  previousPrice: number;
  currentPrice: number;
}): Promise<{ notifiedCount: number; skippedCount: number }> => {
  if (!(input.currentPrice < input.previousPrice)) return { notifiedCount: 0, skippedCount: 0 };

  const { data: listingData, error: listingError } = await supabaseAdmin
    .from("property_listings")
    .select("*")
    .eq("id", input.propertyListingId)
    .maybeSingle();
  if (listingError) throw new Error(listingError.message);
  const listing = (listingData as PropertyListingRow | null) ?? null;
  if (!listing || typeof listing.price_amount !== "number") return { notifiedCount: 0, skippedCount: 0 };

  const { data: matchesData, error: matchesError } = await supabaseAdmin
    .from("buyer_property_matches")
    .select("id, buyer_lead_id, buyer_search_profile_id, notified_at, notified_price_amount")
    .eq("property_listing_id", listing.id)
    .not("notified_at", "is", null);
  if (matchesError) throw new Error(matchesError.message);
  const due = (matchesData ?? []).filter((row) => {
    // Avant la migration 060 le prix mémorisé peut manquer : on prend alors
    // l'ancien prix transmis par la synchro comme référence.
    const reference = typeof row.notified_price_amount === "number" ? row.notified_price_amount : input.previousPrice;
    return listing.price_amount !== null && listing.price_amount < reference;
  });
  if (due.length === 0) return { notifiedCount: 0, skippedCount: 0 };

  const profileIds = Array.from(new Set(due.map((row) => row.buyer_search_profile_id)));
  const { data: profilesData, error: profilesError } = await supabaseAdmin
    .from("buyer_search_profiles")
    .select("*")
    .in("id", profileIds);
  if (profilesError) throw new Error(profilesError.message);
  const profilesById = new Map(((profilesData ?? []) as BuyerSearchProfileRow[]).map((row) => [row.id, row]));

  const projectIds = Array.from(
    new Set(
      ((profilesData ?? []) as BuyerSearchProfileRow[])
        .map((row) => row.client_project_id)
        .filter((value): value is string => Boolean(value))
    )
  );
  let projectsById = new Map<string, ClientProjectRow>();
  if (projectIds.length > 0) {
    const { data: projectsData, error: projectsError } = await supabaseAdmin
      .from("client_projects")
      .select("*")
      .in("id", projectIds);
    if (projectsError) throw new Error(projectsError.message);
    projectsById = new Map(((projectsData ?? []) as ClientProjectRow[]).map((row) => [row.id, row]));
  }

  const leadIds = Array.from(new Set(due.map((row) => row.buyer_lead_id)));
  const { data: leadsData, error: leadsError } = await supabaseAdmin
    .from("buyer_leads")
    .select("*")
    .in("id", leadIds);
  if (leadsError) throw new Error(leadsError.message);
  const leadsById = new Map(((leadsData ?? []) as BuyerLeadRow[]).map((row) => [row.id, row]));

  const { data: mediaData } = await supabaseAdmin
    .from("property_media")
    .select("cached_url, remote_url")
    .eq("property_id", listing.property_id)
    .eq("kind", "image")
    .order("ordinal", { ascending: true })
    .limit(1);
  const coverImageUrl = mediaData?.[0]?.cached_url ?? mediaData?.[0]?.remote_url ?? listing.cover_image_url ?? null;

  let notifiedCount = 0;
  let skippedCount = 0;
  const nowIso = new Date().toISOString();
  for (const row of due) {
    const profile = profilesById.get(row.buyer_search_profile_id);
    const lead = leadsById.get(row.buyer_lead_id);
    if (!profile || profile.status !== "active" || !lead || !isLeadEligibleForAlerts(lead)) {
      skippedCount += 1;
      continue;
    }
    const project = profile.client_project_id ? (projectsById.get(profile.client_project_id) ?? null) : null;
    const clientProjectId = profile.client_project_id ?? project?.id;
    if (!clientProjectId) {
      skippedCount += 1;
      continue;
    }
    const locale = resolveLocale(null);
    const previousPriceAmount =
      typeof row.notified_price_amount === "number" ? row.notified_price_amount : input.previousPrice;
    try {
      const result = await sendBuyerPriceDropEmail({
        to: lead.email,
        locale,
        firstName: splitFirstName(lead.full_name),
        match: {
          title: listing.title,
          city: listing.city,
          propertyType: listing.property_type,
          priceAmount: listing.price_amount,
          canonicalPath: listing.canonical_path,
          coverImageUrl,
          previousPriceAmount,
        },
        searchLabel: buildSearchLabel(profile, project),
        searchUrl: buildSearchUrl(clientProjectId, locale),
        unsubscribeUrl: buildUnsubscribeUrl(clientProjectId, locale),
      });
      if ("sent" in result && result.sent) {
        await supabaseAdmin
          .from("buyer_property_matches")
          .update({ notified_price_amount: listing.price_amount, price_notified_at: nowIso, updated_at: nowIso })
          .eq("id", row.id);
        notifiedCount += 1;
      } else {
        skippedCount += 1;
      }
    } catch (error) {
      console.error("[buyer-alert] price drop send failed", error);
      skippedCount += 1;
    }
  }

  return { notifiedCount, skippedCount };
};

export const pauseBuyerSearchByUnsubscribe = async (clientProjectId: string) => {
  const nowIso = new Date().toISOString();
  const { error: profileError } = await supabaseAdmin
    .from("buyer_search_profiles")
    .update({ status: "paused", updated_at: nowIso })
    .eq("client_project_id", clientProjectId);
  if (profileError) throw new Error(profileError.message);
  return true;
};
