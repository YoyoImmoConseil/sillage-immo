/**
 * Centralized Next.js cache tags used by unstable_cache + revalidateTag.
 *
 * Rules:
 * - Keep the set of tags small and meaningful ; any misaligned tag means
 *   stale data for visitors.
 * - Always revalidate ALL tags touched by a write. When in doubt,
 *   revalidate the coarse tag (listings:public / team:public) rather than
 *   leaving stale data.
 */

/** Catalogue list + property types for sale/rental. */
export const CACHE_TAG_LISTINGS_PUBLIC = "listings:public";

/** Public team members (shown on home + property cards). */
export const CACHE_TAG_TEAM_PUBLIC = "team:public";

/** Granular tag for a specific listing by internal property_listings.id. */
export const cacheTagListingById = (listingId: string) => `listing:id:${listingId}`;

/** Granular tag for a specific listing by its public slug. */
export const cacheTagListingBySlug = (slug: string) => `listing:slug:${slug}`;

/**
 * Granular tag for the /[postalCode]/[propertyId] route, keyed on the
 * SweepBright source_ref + postal_code pair.
 */
export const cacheTagListingByExternalRef = (
  postalCode: string,
  sourceRef: string
) => `listing:external:${postalCode.trim()}:${sourceRef.trim()}`;
