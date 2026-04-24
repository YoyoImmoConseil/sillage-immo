import type { PropertyBusinessType } from "@/types/domain/properties";

/**
 * Canonical list of property types offered to users when they express a
 * search/purchase/rental intent, regardless of what is currently in stock.
 * Slugs match the keys known by `formatPropertyTypeLabel` in `lib/i18n/domain.ts`.
 */
export const CANONICAL_SALE_PROPERTY_TYPES: string[] = [
  "apartment",
  "house",
  "villa",
  "studio",
  "loft",
  "duplex",
  "penthouse",
  "land",
  "building",
  "office",
  "commercial",
  "other",
];

export const CANONICAL_RENTAL_PROPERTY_TYPES: string[] = [
  "apartment",
  "house",
  "villa",
  "studio",
  "loft",
  "duplex",
  "penthouse",
  "office",
  "commercial",
  "other",
];

export const getCanonicalPropertyTypes = (
  businessType: PropertyBusinessType
): string[] =>
  businessType === "rental"
    ? CANONICAL_RENTAL_PROPERTY_TYPES
    : CANONICAL_SALE_PROPERTY_TYPES;

/**
 * Merges the canonical list with any extra property-type slugs discovered in
 * the database, de-duplicated and in canonical order first.
 */
export const mergeWithCanonicalPropertyTypes = (
  businessType: PropertyBusinessType,
  fromDatabase: string[] | null | undefined
): string[] => {
  const canonical = getCanonicalPropertyTypes(businessType);
  const extras = (fromDatabase ?? []).filter(
    (value) => typeof value === "string" && value.trim().length > 0 && !canonical.includes(value)
  );
  return [...canonical, ...extras.sort((a, b) => a.localeCompare(b, "fr"))];
};
