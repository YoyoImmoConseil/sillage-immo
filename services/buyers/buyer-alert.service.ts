import "server-only";

import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendBuyerAlertEmail } from "@/lib/email/buyer-alert";
import type { AppLocale } from "@/lib/i18n/config";
import { localizePath } from "@/lib/i18n/routing";
import type { RecomputeNewMatch } from "./buyer-matching.service";
import type { Database } from "@/types/db/supabase";

type BuyerLeadRow = Database["public"]["Tables"]["buyer_leads"]["Row"];
type BuyerSearchProfileRow = Database["public"]["Tables"]["buyer_search_profiles"]["Row"];
type PropertyListingRow = Database["public"]["Tables"]["property_listings"]["Row"];
type ClientProjectRow = Database["public"]["Tables"]["client_projects"]["Row"];

const ALERT_SCORE_THRESHOLD = 60;

const getAlertSecret = () =>
  process.env.BUYER_ALERT_HMAC_SECRET ?? process.env.ADMIN_API_KEY ?? "sillage-default-alert-secret";

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

export const processBuyerAlertsForNewMatches = async (
  newMatches: RecomputeNewMatch[]
): Promise<{ notifiedCount: number; skippedCount: number }> => {
  const eligible = newMatches.filter((match) => match.score >= ALERT_SCORE_THRESHOLD);
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
    if (!lead || !lead.email) {
      skippedCount += matches.length;
      continue;
    }
    if (!lead.email_verified_at) {
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
        const matchIds = matches.map((match) => match.matchId);
        if (matchIds.length > 0) {
          await supabaseAdmin
            .from("buyer_property_matches")
            .update({ notified_at: nowIso, updated_at: nowIso })
            .in("id", matchIds);
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

export const pauseBuyerSearchByUnsubscribe = async (clientProjectId: string) => {
  const nowIso = new Date().toISOString();
  const { error: profileError } = await supabaseAdmin
    .from("buyer_search_profiles")
    .update({ status: "paused", updated_at: nowIso })
    .eq("client_project_id", clientProjectId);
  if (profileError) throw new Error(profileError.message);
  return true;
};
