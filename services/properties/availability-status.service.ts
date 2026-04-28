import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidatePublicListings } from "@/lib/cache/revalidate";
import {
  isAdminAvailabilityStatus,
  isPublicAvailabilityStatus,
  type AdminAvailabilityStatus,
} from "@/lib/properties/canonical-types";
import type { Database } from "@/types/db/supabase";

type PropertyRow = Database["public"]["Tables"]["properties"]["Row"];
type ListingRow = Database["public"]["Tables"]["property_listings"]["Row"];

export type UpdatePropertyAvailabilityStatusInput = {
  propertyId: string;
  availabilityStatus: AdminAvailabilityStatus;
};

export type UpdatePropertyAvailabilityStatusResult = {
  property: PropertyRow;
  listing: ListingRow | null;
  previousAvailabilityStatus: string | null;
  isPublic: boolean;
};

/**
 * Single source of truth for changing a property's `availability_status` from
 * the admin UI. The status is persisted on `properties.availability_status`,
 * and `property_listings.is_published` / `publication_status` are then
 * deterministically re-derived from the public whitelist (see
 * `isPublicAvailabilityStatus`).
 *
 * For SweepBright-sourced properties, this override is best-effort: the next
 * webhook from SweepBright will overwrite `availability_status` again with
 * whatever value lives in their CRM. The override is therefore "one-shot"
 * until the next sync — which is the trade-off agreed with the product owner.
 */
export const updatePropertyAvailabilityStatus = async (
  input: UpdatePropertyAvailabilityStatusInput
): Promise<UpdatePropertyAvailabilityStatusResult> => {
  if (!isAdminAvailabilityStatus(input.availabilityStatus)) {
    throw new Error("Statut inconnu.");
  }

  const { data: existingProperty, error: existingError } = await supabaseAdmin
    .from("properties")
    .select("*")
    .eq("id", input.propertyId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }
  if (!existingProperty) {
    throw new Error("Bien introuvable.");
  }
  const previous = existingProperty as PropertyRow;

  const now = new Date().toISOString();
  const { data: updatedPropertyData, error: updatePropertyError } = await supabaseAdmin
    .from("properties")
    .update({
      availability_status: input.availabilityStatus,
      updated_at: now,
    })
    .eq("id", input.propertyId)
    .select("*")
    .single();

  if (updatePropertyError || !updatedPropertyData) {
    throw new Error(updatePropertyError?.message ?? "Mise a jour du statut impossible.");
  }
  const property = updatedPropertyData as PropertyRow;

  const isPublic = isPublicAvailabilityStatus(input.availabilityStatus);
  const publicationStatus = isPublic ? "active" : "inactive";

  const { data: listingsData, error: listingsError } = await supabaseAdmin
    .from("property_listings")
    .select("*")
    .eq("property_id", input.propertyId);

  if (listingsError) {
    throw new Error(listingsError.message);
  }

  const listings = (listingsData ?? []) as ListingRow[];
  let primaryListing: ListingRow | null = listings[0] ?? null;

  for (const listing of listings) {
    const wasPublished = listing.is_published === true;
    const willBePublished = isPublic;
    const updatePayload: Database["public"]["Tables"]["property_listings"]["Update"] = {
      is_published: willBePublished,
      publication_status: publicationStatus,
      updated_at: now,
    };
    if (!wasPublished && willBePublished) {
      updatePayload.published_at = now;
      updatePayload.unpublished_at = null;
    }
    if (wasPublished && !willBePublished) {
      updatePayload.unpublished_at = now;
    }

    const { data: updatedListingData, error: updateListingError } = await supabaseAdmin
      .from("property_listings")
      .update(updatePayload)
      .eq("id", listing.id)
      .select("*")
      .single();

    if (updateListingError) {
      throw new Error(updateListingError.message);
    }
    if (updatedListingData && (!primaryListing || primaryListing.id === listing.id)) {
      primaryListing = updatedListingData as ListingRow;
    }
  }

  revalidatePublicListings({
    listingId: primaryListing?.id ?? null,
    slug: primaryListing?.slug ?? null,
    sourceRef: property.source_ref,
    postalCode: property.postal_code,
  });

  return {
    property,
    listing: primaryListing,
    previousAvailabilityStatus: previous.availability_status,
    isPublic,
  };
};
