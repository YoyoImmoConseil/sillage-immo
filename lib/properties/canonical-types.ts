import type { PropertyBusinessType } from "@/types/domain/properties";

/**
 * Whitelist of SweepBright `availability_status` values that are allowed to
 * be exposed publicly (sale / rental catalogues, public detail pages, buyer
 * alerts).
 *
 * - `available`  → fully open for transaction
 * - `agreement`  → "Sous Compromis" (offer accepted, kept visible with a badge)
 * - `option`     → "Sous Offre" (under option, kept visible with a badge)
 *
 * Any other status (notably `prospect` for in-progress estimations,
 * `deleted`, `withdrawn`, or `null`) MUST stay hidden from the public site.
 *
 * This list is the single source of truth for both the SweepBright ingestion
 * pipeline and the defensive read-side filters; do not duplicate it.
 */
export const PUBLIC_AVAILABILITY_STATUSES = [
  "available",
  "agreement",
  "option",
] as const;

export type PublicAvailabilityStatus = (typeof PUBLIC_AVAILABILITY_STATUSES)[number];

const PUBLIC_AVAILABILITY_STATUS_SET = new Set<string>(PUBLIC_AVAILABILITY_STATUSES);

export const isPublicAvailabilityStatus = (
  value: string | null | undefined
): value is PublicAvailabilityStatus => {
  if (typeof value !== "string") return false;
  return PUBLIC_AVAILABILITY_STATUS_SET.has(value.trim().toLowerCase());
};

/**
 * Statuts dont la page de détail publique reste en ligne : la liste blanche
 * (annonces actives) plus les biens vendus / loués, servis avec un bandeau
 * « Vendu » / « Loué » et un seul appel à l'action (estimation). Les
 * catalogues et la recherche restent limités à `PUBLIC_AVAILABILITY_STATUSES`.
 */
export const DETAIL_PAGE_AVAILABILITY_STATUSES = [
  ...PUBLIC_AVAILABILITY_STATUSES,
  "sold",
  "rented",
] as const;

export type DetailPageAvailabilityStatus = (typeof DETAIL_PAGE_AVAILABILITY_STATUSES)[number];

const DETAIL_PAGE_AVAILABILITY_STATUS_SET = new Set<string>(DETAIL_PAGE_AVAILABILITY_STATUSES);

export const isDetailPageAvailabilityStatus = (
  value: string | null | undefined
): value is DetailPageAvailabilityStatus => {
  if (typeof value !== "string") return false;
  return DETAIL_PAGE_AVAILABILITY_STATUS_SET.has(value.trim().toLowerCase());
};

export const isClosedAvailabilityStatus = (value: string | null | undefined): value is "sold" | "rented" => {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return normalized === "sold" || normalized === "rented";
};

/**
 * La page de détail publique est-elle servie pour ce bien ?
 * - annonce active (statut de la liste blanche) : il faut `is_published` et
 *   `publication_status = active`, comme avant ;
 * - vendu / loué : la synchro SweepBright dépublie l'annonce
 *   (`is_published = false`, `publication_status = inactive`) ; la page reste
 *   servie tant que l'annonce n'est pas `deleted` ;
 * - tout autre statut (prospect, withdrawn, deleted, absent) : 404.
 * Une seule règle, partagée par le site public et le garde-fou de la fiche
 * vitrine (le QR d'une affiche « Vendu » doit mener à une page vivante).
 */
export const isDetailPageServed = (input: {
  availabilityStatus: string | null | undefined;
  isPublished: boolean | null | undefined;
  publicationStatus: string | null | undefined;
}): boolean => {
  if (isPublicAvailabilityStatus(input.availabilityStatus)) {
    return input.isPublished === true && input.publicationStatus === "active";
  }
  if (isClosedAvailabilityStatus(input.availabilityStatus)) {
    return input.publicationStatus !== "deleted";
  }
  return false;
};

/**
 * Full set of `availability_status` values we expose in the admin status
 * dropdown. Includes both the public whitelist and the internal/SweepBright
 * statuses that should NEVER reach the public site (prospect, sold, rented,
 * withdrawn, deleted).
 *
 * Order matters: the dropdown renders entries in this order.
 */
export const ADMIN_AVAILABILITY_STATUSES = [
  "available",
  "agreement",
  "option",
  "prospect",
  "sold",
  "rented",
  "withdrawn",
  "deleted",
] as const;

export type AdminAvailabilityStatus = (typeof ADMIN_AVAILABILITY_STATUSES)[number];

const ADMIN_AVAILABILITY_STATUS_SET = new Set<string>(ADMIN_AVAILABILITY_STATUSES);

export const isAdminAvailabilityStatus = (
  value: string | null | undefined
): value is AdminAvailabilityStatus => {
  if (typeof value !== "string") return false;
  return ADMIN_AVAILABILITY_STATUS_SET.has(value.trim().toLowerCase());
};

/**
 * French admin labels for `availability_status` values. Admin UI is FR-only;
 * public-facing translations live in `app/components/listing-status-banner.tsx`
 * and `app/components/public-listing-detail-page.tsx`.
 */
export const ADMIN_AVAILABILITY_STATUS_LABELS_FR: Record<AdminAvailabilityStatus, string> = {
  available: "Disponible",
  agreement: "Sous compromis",
  option: "Sous offre",
  prospect: "Prospect / Estimation en cours",
  sold: "Vendu",
  rented: "Loué",
  withdrawn: "Retiré",
  deleted: "Supprimé",
};

export const getAdminAvailabilityStatusLabel = (
  value: string | null | undefined
): string => {
  if (typeof value !== "string" || !value.trim()) return "Aucun statut";
  const normalized = value.trim().toLowerCase();
  if (isAdminAvailabilityStatus(normalized)) {
    return ADMIN_AVAILABILITY_STATUS_LABELS_FR[normalized];
  }
  return value;
};

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
