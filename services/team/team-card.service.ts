import "server-only";
import { cache } from "react";

import type { AppLocale } from "@/lib/i18n/config";
import { normalizeCardSlug, normalizePhoneE164 } from "@/lib/team/card";
import { listPublicTeamMembers, type PublicTeamMember } from "@/services/home/team.service";
import {
  listPublicPropertyListings,
  toPublicPropertyListingSummary,
} from "@/services/properties/property-listing.service";
import type { PropertyListingSnapshot, PublicPropertyListingSummary } from "@/types/domain/properties";

/** Nombre de biens affichés sur une carte. */
export const TEAM_CARD_LISTINGS_LIMIT = 3;

export type TeamCardMember = PublicTeamMember & {
  slug: string;
  /** Téléphone au format E.164 (null si absent ou inexploitable). */
  phoneE164: string | null;
  /** WhatsApp : numéro dédié sinon le mobile ; null si aucun des deux. */
  whatsappE164: string | null;
};

export type TeamCard = {
  member: TeamCardMember;
  listings: PublicPropertyListingSummary[];
  /** Vrai quand aucun bien n'est porté par le collaborateur : on montre ceux de l'agence. */
  listingsAreFallback: boolean;
};

const toCardMember = (member: PublicTeamMember): TeamCardMember | null => {
  const slug = normalizeCardSlug(member.cardSlug);
  if (!slug) return null;
  const phoneE164 = normalizePhoneE164(member.phone);
  const whatsappE164 = normalizePhoneE164(member.whatsappPhone) ?? phoneE164;
  return { ...member, slug, phoneE164, whatsappE164 };
};

/**
 * Collaborateurs qui ont une carte active : profil actif avec un rôle, visible
 * sur le site, carte non désactivée, prénom exploitable. Même cache que la
 * section équipe (tag team:public, invalidé par l'admin).
 */
export const listTeamCardMembers = cache(async (locale: AppLocale = "fr"): Promise<TeamCardMember[]> => {
  const members = await listPublicTeamMembers(locale);
  const seen = new Set<string>();
  const cards: TeamCardMember[] = [];
  for (const member of members) {
    if (!member.cardEnabled) continue;
    const card = toCardMember(member);
    if (!card || seen.has(card.slug)) continue; // premier arrivé (ordre des rôles) en cas de doublon de prénom
    seen.add(card.slug);
    cards.push(card);
  }
  return cards;
});

export const getTeamCardMemberBySlug = cache(
  async (slug: string, locale: AppLocale = "fr"): Promise<TeamCardMember | null> => {
    const normalized = normalizeCardSlug(slug);
    if (!normalized) return null;
    const members = await listTeamCardMembers(locale);
    return members.find((member) => member.slug === normalized) ?? null;
  }
);

const negotiatorEmail = (listing: PropertyListingSnapshot): string | null => {
  const email = listing.property.negotiator?.email;
  return typeof email === "string" && email.trim() ? email.trim().toLowerCase() : null;
};

/** Plus récent d'abord : date de publication de l'annonce, sinon mise à jour du bien. */
const listingTime = (listing: PropertyListingSnapshot) =>
  Date.parse(listing.publishedAt ?? listing.property.updatedAt) || 0;
const byMostRecent = (left: PropertyListingSnapshot, right: PropertyListingSnapshot) =>
  listingTime(right) - listingTime(left);

/**
 * Derniers biens publiés portés par le collaborateur (négociateur SweepBright
 * rapproché par e-mail), vente et location confondues ; à défaut, les derniers
 * biens de l'agence. Les listes sont déjà en cache (listings:public).
 */
export const listTeamCardListings = cache(
  async (
    email: string,
    locale: AppLocale = "fr"
  ): Promise<{ listings: PublicPropertyListingSummary[]; isFallback: boolean }> => {
    const [sale, rental] = await Promise.all([
      listPublicPropertyListings({ businessType: "sale", pageSize: 100, locale }),
      listPublicPropertyListings({ businessType: "rental", pageSize: 100, locale }),
    ]);
    const all = [...sale, ...rental].sort(byMostRecent);
    const target = email.trim().toLowerCase();
    const own = all.filter((listing) => negotiatorEmail(listing) === target);
    const picked = own.length > 0 ? own : all;
    return {
      listings: picked.slice(0, TEAM_CARD_LISTINGS_LIMIT).map(toPublicPropertyListingSummary),
      isFallback: own.length === 0,
    };
  }
);

export const getTeamCardBySlug = cache(async (slug: string, locale: AppLocale = "fr"): Promise<TeamCard | null> => {
  const member = await getTeamCardMemberBySlug(slug, locale);
  if (!member) return null;
  let listings: PublicPropertyListingSummary[] = [];
  let listingsAreFallback = false;
  try {
    const result = await listTeamCardListings(member.email, locale);
    listings = result.listings;
    listingsAreFallback = result.isFallback;
  } catch (error) {
    console.error("[team-card] listings unavailable", error);
  }
  return { member, listings, listingsAreFallback };
});
