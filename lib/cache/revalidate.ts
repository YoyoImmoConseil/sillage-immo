import "server-only";
import { revalidateTag } from "next/cache";
import {
  CACHE_TAG_LISTINGS_PUBLIC,
  CACHE_TAG_TEAM_PUBLIC,
  cacheTagListingByExternalRef,
  cacheTagListingById,
  cacheTagListingBySlug,
} from "./tags";

/**
 * Invalidate all cached reads that can be affected by a listing mutation.
 * Safe to call after any SweepBright webhook or manual admin mutation
 * touching properties / property_listings / property_media.
 *
 * Pass as many hints as you have: each hint invalidates a narrow tag.
 * Always includes the coarse CACHE_TAG_LISTINGS_PUBLIC tag.
 */
// Next 16 revalidateTag requiert un deuxieme argument ("max" ou CacheLife).
// "max" = purge definitive => on force une relecture au prochain hit.
const REVALIDATE_PROFILE = "max" as const;

export const revalidatePublicListings = (hints?: {
  listingId?: string | null;
  slug?: string | null;
  sourceRef?: string | null;
  postalCode?: string | null;
}) => {
  revalidateTag(CACHE_TAG_LISTINGS_PUBLIC, REVALIDATE_PROFILE);

  if (hints?.listingId) {
    revalidateTag(cacheTagListingById(hints.listingId), REVALIDATE_PROFILE);
  }
  if (hints?.slug) {
    revalidateTag(cacheTagListingBySlug(hints.slug), REVALIDATE_PROFILE);
  }
  if (hints?.sourceRef && hints?.postalCode) {
    revalidateTag(
      cacheTagListingByExternalRef(hints.postalCode, hints.sourceRef),
      REVALIDATE_PROFILE
    );
  }
};

export const revalidatePublicTeam = () => {
  revalidateTag(CACHE_TAG_TEAM_PUBLIC, REVALIDATE_PROFILE);
};
