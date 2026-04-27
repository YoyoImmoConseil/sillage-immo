import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { AppLocale } from "@/lib/i18n/config";
import { formatCurrency } from "@/lib/i18n/format";
import { resolveLocalizedText } from "@/lib/i18n/localized-content";
import type { Database } from "@/types/db/supabase";
import type {
  PropertyBusinessType,
  PropertyListingSnapshot,
  PublicPropertyListingSummary,
} from "@/types/domain/properties";
import { buildPropertyDerivedFields } from "./property-presentation";
import {
  CACHE_TAG_LISTINGS_PUBLIC,
  cacheTagListingByExternalRef,
  cacheTagListingById,
  cacheTagListingBySlug,
} from "@/lib/cache/tags";
import { isPublicAvailabilityStatus } from "@/lib/properties/canonical-types";

type ListingRow = Database["public"]["Tables"]["property_listings"]["Row"];
type PropertyRow = Database["public"]["Tables"]["properties"]["Row"];
type MediaRow = Database["public"]["Tables"]["property_media"]["Row"];

const SWEEPBRIGHT_SOURCE = "sweepbright";

export const DEFAULT_LISTINGS_PAGE_SIZE = 24;

const isMissingRelationError = (message: string) => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("could not find the table") ||
    normalized.includes("relation") ||
    normalized.includes("schema cache")
  );
};

const mapPropertySnapshot = (
  property: PropertyRow,
  media: MediaRow[],
  priceAmount: number | null,
  locale: AppLocale
) => {
  const derived = buildPropertyDerivedFields(property, priceAmount);
  return {
    id: property.id,
    source: property.source,
    sourceRef: property.source_ref,
    companyId: property.company_id,
    projectId: property.project_id,
    isProject: property.is_project,
    kind: property.kind,
    negotiation: property.negotiation,
    title: resolveLocalizedText({
      locale,
      field: "title",
      fallback: property.title,
      sources: [property.metadata, property.raw_payload],
    }),
    description: resolveLocalizedText({
      locale,
      field: "description",
      fallback: property.description,
      sources: [property.metadata, property.raw_payload],
    }),
    propertyType: property.property_type,
    subType: property.sub_type,
    availabilityStatus: property.availability_status,
    generalCondition: property.general_condition,
    address: {
      street: property.street,
      streetNumber: property.street_number,
      city: property.city,
      postalCode: property.postal_code,
      country: property.country,
      formattedAddress: property.formatted_address,
      latitude: property.latitude,
      longitude: property.longitude,
    },
    surfaces: {
      ...derived.surfaces,
    },
    rooms: derived.rooms,
    amenities: derived.amenities,
    sale: derived.sale,
    energy: derived.energy,
    condo: derived.condo,
    media: media.map((item) => ({
      id: item.id,
      propertyId: item.property_id,
      kind: item.kind,
      ordinal: item.ordinal,
      title: item.title,
      description: item.description,
      contentType: item.content_type,
      remoteUrl: item.remote_url,
      cachedUrl: item.cached_url,
      expiresAt: item.expires_at,
    })),
    virtualTourUrl: property.virtual_tour_url,
    videoUrl: property.video_url,
    appointmentServiceUrl: property.appointment_service_url,
    negotiator: property.negotiator,
    legal: property.legal,
    createdAt: property.created_at,
    updatedAt: property.updated_at,
    lastSyncedAt: property.last_synced_at,
  } satisfies PropertyListingSnapshot["property"];
};

const mapListingSnapshot = (
  listing: ListingRow,
  property: PropertyRow,
  media: MediaRow[],
  locale: AppLocale
): PropertyListingSnapshot => {
  const derived = buildPropertyDerivedFields(property, listing.price_amount);
  return {
    id: listing.id,
    propertyId: listing.property_id,
    businessType: listing.business_type,
    publicationStatus: listing.publication_status,
    isPublished: listing.is_published,
    slug: listing.slug,
    canonicalPath: listing.canonical_path,
    title: resolveLocalizedText({
      locale,
      field: "title",
      fallback: listing.title ?? property.title,
      sources: [listing.listing_metadata, property.metadata, property.raw_payload],
    }),
    city: listing.city,
    postalCode: listing.postal_code,
    propertyType: listing.property_type,
    coverImageUrl: listing.cover_image_url,
    roomCount: derived.rooms.roomCount,
    bedrooms: listing.bedrooms,
    livingArea: listing.living_area,
    loiCarrezArea: derived.surfaces.loiCarrezArea,
    annualCharges: derived.condo.annualCharges,
    lotCount: derived.condo.lotCount,
    floor: listing.floor,
    hasTerrace: listing.has_terrace,
    hasElevator: listing.has_elevator,
    priceAmount: listing.price_amount,
    priceCurrency: listing.price_currency,
    publishedAt: listing.published_at,
    unpublishedAt: listing.unpublished_at,
    property: mapPropertySnapshot(property, media, listing.price_amount, locale),
  };
};

/**
 * Fetch every property + its media referenced by a batch of listings in
 * exactly two round-trips instead of one per listing, and return a lookup
 * map keyed by property id.
 */
const fetchPropertiesAndMediaForListings = async (
  listings: ListingRow[]
): Promise<{
  propertiesById: Map<string, PropertyRow>;
  mediaByPropertyId: Map<string, MediaRow[]>;
}> => {
  const uniquePropertyIds = Array.from(
    new Set(listings.map((listing) => listing.property_id).filter(Boolean))
  );

  if (uniquePropertyIds.length === 0) {
    return {
      propertiesById: new Map(),
      mediaByPropertyId: new Map(),
    };
  }

  const [propertiesResult, mediaResult] = await Promise.all([
    supabaseAdmin
      .from("properties")
      .select("*")
      .in("id", uniquePropertyIds),
    supabaseAdmin
      .from("property_media")
      .select("*")
      .in("property_id", uniquePropertyIds)
      .order("ordinal", { ascending: true }),
  ]);

  if (propertiesResult.error) {
    throw new Error(propertiesResult.error.message);
  }
  if (mediaResult.error) {
    throw new Error(mediaResult.error.message);
  }

  const propertiesById = new Map<string, PropertyRow>();
  for (const row of (propertiesResult.data ?? []) as PropertyRow[]) {
    propertiesById.set(row.id, row);
  }

  const mediaByPropertyId = new Map<string, MediaRow[]>();
  for (const row of (mediaResult.data ?? []) as MediaRow[]) {
    const bucket = mediaByPropertyId.get(row.property_id);
    if (bucket) {
      bucket.push(row);
    } else {
      mediaByPropertyId.set(row.property_id, [row]);
    }
  }

  return { propertiesById, mediaByPropertyId };
};

const hydrateListingsBatch = async (
  listings: ListingRow[],
  locale: AppLocale
): Promise<PropertyListingSnapshot[]> => {
  if (listings.length === 0) return [];

  const { propertiesById, mediaByPropertyId } =
    await fetchPropertiesAndMediaForListings(listings);

  const snapshots: PropertyListingSnapshot[] = [];
  for (const listing of listings) {
    const property = propertiesById.get(listing.property_id);
    if (!property) continue;
    // Defensive filter: even if a listing somehow ends up published in DB while
    // its underlying property carries a non-public availability_status (legacy
    // rows, manual override, race condition), drop it from the public surface.
    // The ingestion pipeline is the authoritative gate; this is the second line
    // of defence for `listPublicPropertyListings` and `getPublicPropertyListingBySlug`.
    if (!isPublicAvailabilityStatus(property.availability_status)) continue;
    const media = mediaByPropertyId.get(listing.property_id) ?? [];
    snapshots.push(mapListingSnapshot(listing, property, media, locale));
  }
  return snapshots;
};

const hydrateListingSnapshot = async (
  listing: ListingRow,
  locale: AppLocale
): Promise<PropertyListingSnapshot | null> => {
  const [snapshot] = await hydrateListingsBatch([listing], locale);
  return snapshot ?? null;
};

const hydrateListingSnapshotWithProperty = (
  listing: ListingRow,
  property: PropertyRow,
  media: MediaRow[],
  locale: AppLocale
): PropertyListingSnapshot => {
  return mapListingSnapshot(listing, property, media, locale);
};

const normalizePostalCode = (value: string) => value.trim().replace(/\s+/g, "");

export const formatListingPrice = (input: {
  amount: number | null;
  currency: string;
  locale?: AppLocale;
}) => {
  if (typeof input.amount !== "number") {
    return input.locale === "en"
      ? "Price on request"
      : input.locale === "es"
        ? "Precio a consultar"
        : input.locale === "ru"
          ? "Цена по запросу"
          : "Prix sur demande";
  }
  return formatCurrency(input.amount, input.locale ?? "fr", input.currency || "EUR");
};

export const toPublicPropertyListingSummary = (
  listing: PropertyListingSnapshot
): PublicPropertyListingSummary => ({
  id: listing.id,
  canonicalPath: listing.canonicalPath,
  title: listing.title,
  city: listing.city,
  postalCode: listing.postalCode,
  coverImageUrl: listing.coverImageUrl,
  propertyType: listing.propertyType,
  availabilityStatus: listing.property.availabilityStatus,
  priceAmount: listing.priceAmount,
  priceCurrency: listing.priceCurrency,
  bedrooms: listing.bedrooms,
  livingArea: listing.livingArea,
  loiCarrezArea: listing.loiCarrezArea,
  roomCount: listing.roomCount,
  annualCharges: listing.annualCharges,
  lotCount: listing.lotCount,
  sale: listing.property.sale,
  energy: listing.property.energy,
});

type ListPublicPropertyListingsInput = {
  locale?: AppLocale;
  businessType: PropertyBusinessType;
  city?: string;
  propertyType?: string;
  minPrice?: number;
  maxPrice?: number;
  minRooms?: number;
  maxRooms?: number;
  minSurface?: number;
  maxSurface?: number;
  minFloor?: number;
  maxFloor?: number;
  terrace?: boolean;
  elevator?: boolean;
  page?: number;
  pageSize?: number;
};

const listPublicPropertyListingsUncached = async (
  input: ListPublicPropertyListingsInput
): Promise<PropertyListingSnapshot[]> => {
  const locale = input.locale ?? "fr";
  const pageSize = Math.min(
    Math.max(input.pageSize ?? DEFAULT_LISTINGS_PAGE_SIZE, 1),
    100
  );
  const page = Math.max(input.page ?? 1, 1);
  const rangeStart = (page - 1) * pageSize;
  const rangeEnd = rangeStart + pageSize - 1;

  let query = supabaseAdmin
    .from("property_listings")
    .select("*")
    .eq("business_type", input.businessType)
    .eq("is_published", true)
    .eq("publication_status", "active")
    .order("updated_at", { ascending: false })
    .range(rangeStart, rangeEnd);

  if (input.city?.trim()) {
    query = query.ilike("city", `%${input.city.trim()}%`);
  }
  if (input.propertyType?.trim()) {
    query = query.eq("property_type", input.propertyType.trim());
  }
  if (typeof input.minPrice === "number") {
    query = query.gte("price_amount", input.minPrice);
  }
  if (typeof input.maxPrice === "number") {
    query = query.lte("price_amount", input.maxPrice);
  }
  if (typeof input.minRooms === "number") {
    query = query.gte("rooms", input.minRooms);
  }
  if (typeof input.maxRooms === "number") {
    query = query.lte("rooms", input.maxRooms);
  }
  if (typeof input.minSurface === "number") {
    query = query.gte("living_area", input.minSurface);
  }
  if (typeof input.maxSurface === "number") {
    query = query.lte("living_area", input.maxSurface);
  }
  if (typeof input.minFloor === "number") {
    query = query.gte("floor", input.minFloor);
  }
  if (typeof input.maxFloor === "number") {
    query = query.lte("floor", input.maxFloor);
  }
  if (typeof input.terrace === "boolean") {
    query = query.eq("has_terrace", input.terrace);
  }
  if (typeof input.elevator === "boolean") {
    query = query.eq("has_elevator", input.elevator);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingRelationError(error.message)) {
      return [];
    }
    throw new Error(error.message);
  }

  // Hydrate the whole page in exactly 2 round-trips (property + media)
  // instead of 2 round-trips per listing (N+1 pattern).
  return hydrateListingsBatch((data ?? []) as ListingRow[], locale);
};

/**
 * Next.js Data Cache wrapper. Invalidated via revalidateTag("listings:public")
 * from the SweepBright webhook and admin mutations.
 */
export const listPublicPropertyListings = unstable_cache(
  listPublicPropertyListingsUncached,
  ["listPublicPropertyListings"],
  {
    tags: [CACHE_TAG_LISTINGS_PUBLIC],
    revalidate: 300,
  }
);

const getPublicPropertyListingBySlugUncached = async (
  slug: string,
  locale: AppLocale = "fr"
) => {
  const { data: listingData, error: listingError } = await supabaseAdmin
    .from("property_listings")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .eq("publication_status", "active")
    .maybeSingle();

  if (listingError) {
    if (isMissingRelationError(listingError.message)) {
      return null;
    }
    throw new Error(listingError.message);
  }
  if (!listingData) return null;

  // hydrateListingSnapshot wraps hydrateListingsBatch which carries the
  // defensive availability_status filter; if the underlying property is no
  // longer commercialized publicly, the snapshot will be dropped here.
  return hydrateListingSnapshot(listingData as ListingRow, locale);
};

/**
 * React.cache deduplicates generateMetadata + page within a single HTTP
 * request. unstable_cache persists across requests and is invalidated via
 * revalidateTag on CACHE_TAG_LISTINGS_PUBLIC (any listing changed) or on
 * cacheTagListingBySlug(slug) (this listing changed).
 */
export const getPublicPropertyListingBySlug = cache(
  async (slug: string, locale: AppLocale = "fr") => {
    const cached = unstable_cache(
      getPublicPropertyListingBySlugUncached,
      ["getPublicPropertyListingBySlug"],
      {
        tags: [CACHE_TAG_LISTINGS_PUBLIC, cacheTagListingBySlug(slug)],
        revalidate: 600,
      }
    );
    return cached(slug, locale);
  }
);

const getPublicPropertyListingByExternalIdUncached = async (input: {
  postalCode: string;
  propertyId: string;
  locale?: AppLocale;
}) => {
  const locale = input.locale ?? "fr";
  const normalizedPostalCode = normalizePostalCode(input.postalCode);
  const externalId = input.propertyId.trim();
  if (!normalizedPostalCode || !externalId) {
    return null;
  }

  const { data: propertyData, error: propertyError } = await supabaseAdmin
    .from("properties")
    .select("*")
    .eq("source", SWEEPBRIGHT_SOURCE)
    .eq("source_ref", externalId)
    .eq("postal_code", normalizedPostalCode)
    .maybeSingle();

  if (propertyError) {
    if (isMissingRelationError(propertyError.message)) {
      return null;
    }
    throw new Error(propertyError.message);
  }
  if (!propertyData) return null;
  const property = propertyData as PropertyRow;
  // Defensive: don't expose properties whose SweepBright status is not in the
  // public whitelist (e.g. `prospect`, `deleted`, `withdrawn`, `null`).
  if (!isPublicAvailabilityStatus(property.availability_status)) return null;

  const [listingResult, mediaResult] = await Promise.all([
    supabaseAdmin
      .from("property_listings")
      .select("*")
      .eq("property_id", property.id)
      .eq("is_published", true)
      .eq("publication_status", "active")
      .maybeSingle(),
    supabaseAdmin
      .from("property_media")
      .select("*")
      .eq("property_id", property.id)
      .order("ordinal", { ascending: true }),
  ]);

  if (listingResult.error) {
    if (isMissingRelationError(listingResult.error.message)) {
      return null;
    }
    throw new Error(listingResult.error.message);
  }
  if (!listingResult.data) return null;
  if (mediaResult.error) {
    throw new Error(mediaResult.error.message);
  }

  return hydrateListingSnapshotWithProperty(
    listingResult.data as ListingRow,
    property,
    (mediaResult.data ?? []) as MediaRow[],
    locale
  );
};

/**
 * Cached per request (React.cache) + across requests (unstable_cache) with
 * tags tied to the external SweepBright reference (postalCode + sourceRef).
 */
export const getPublicPropertyListingByExternalId = cache(
  async (input: {
    postalCode: string;
    propertyId: string;
    locale?: AppLocale;
  }) => {
    const cached = unstable_cache(
      getPublicPropertyListingByExternalIdUncached,
      ["getPublicPropertyListingByExternalId"],
      {
        tags: [
          CACHE_TAG_LISTINGS_PUBLIC,
          cacheTagListingByExternalRef(input.postalCode, input.propertyId),
        ],
        revalidate: 600,
      }
    );
    return cached(input);
  }
);

const listPropertyTypesForBusinessTypeUncached = async (
  businessType: PropertyBusinessType
) => {
  const { data, error } = await supabaseAdmin
    .from("property_listings")
    .select("property_type")
    .eq("business_type", businessType)
    .eq("is_published", true)
    .eq("publication_status", "active")
    .neq("property_type", null);

  if (error) {
    if (isMissingRelationError(error.message)) {
      return [];
    }
    throw new Error(error.message);
  }

  return Array.from(
    new Set(
      (data ?? [])
        .map((row) => row.property_type)
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    )
  ).sort((left, right) => left.localeCompare(right, "fr"));
};

export const listPropertyTypesForBusinessType = unstable_cache(
  listPropertyTypesForBusinessTypeUncached,
  ["listPropertyTypesForBusinessType"],
  {
    tags: [CACHE_TAG_LISTINGS_PUBLIC],
    revalidate: 300,
  }
);
