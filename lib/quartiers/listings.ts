import "server-only";
import type { PublicPropertyListingSummary } from "@/types/domain/properties";
import type { AppLocale } from "@/lib/i18n/config";
import {
  listPublicPropertyListings,
  toPublicPropertyListingSummary,
} from "@/services/properties/property-listing.service";
import type { Quartier } from "./data";

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Biens Sillage rattachés au quartier par les mots de leur titre. */
export const listQuartierListings = async (
  quartier: Quartier,
  locale: AppLocale,
  limit = 6
): Promise<PublicPropertyListingSummary[]> => {
  try {
    const [sale, rental] = await Promise.all([
      listPublicPropertyListings({ locale, businessType: "sale", pageSize: 100 }),
      listPublicPropertyListings({ locale, businessType: "rental", pageSize: 100 }),
    ]);
    const hints = quartier.titleHints.map(normalize);
    return [...sale, ...rental]
      .map(toPublicPropertyListingSummary)
      .filter((listing) => {
        const title = normalize(listing.title ?? "");
        return title.length > 0 && hints.some((hint) => title.includes(hint));
      })
      .slice(0, limit);
  } catch (error) {
    console.error("[quartiers] listings unavailable", error);
    return [];
  }
};
