import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Database } from "@/types/db/supabase";
import type {
  PropertyBusinessType,
  PropertyListingSnapshot,
  PublicPropertyListingSummary,
} from "@/types/domain/properties";
import { buildPropertyDerivedFields } from "./property-presentation";

type ListingRow = Database["public"]["Tables"]["property_listings"]["Row"];
type PropertyRow = Database["public"]["Tables"]["properties"]["Row"];
type MediaRow = Database["public"]["Tables"]["property_media"]["Row"];

const SWEEPBRIGHT_SOURCE = "sweepbright";

const isMissingRelationError = (message: string) => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("could not find the table") ||
    normalized.includes("relation") ||
    normalized.includes("schema cache")
  );
};

const mapPropertySnapshot = (property: PropertyRow, media: MediaRow[], priceAmount: number | null) => {
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
    title: property.title,
    description: property.description,
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
  media: MediaRow[]
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
    title: listing.title,
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
    property: mapPropertySnapshot(property, media, listing.price_amount),
  };
};

const hydrateListingSnapshot = async (listing: ListingRow) => {
  const { data: propertyData, error: propertyError } = await supabaseAdmin
    .from("properties")
    .select("*")
    .eq("id", listing.property_id)
    .maybeSingle();

  if (propertyError) {
    throw new Error(propertyError.message);
  }
  if (!propertyData) return null;

  const { data: mediaData, error: mediaError } = await supabaseAdmin
    .from("property_media")
    .select("*")
    .eq("property_id", listing.property_id)
    .order("ordinal", { ascending: true });

  if (mediaError) {
    throw new Error(mediaError.message);
  }

  return mapListingSnapshot(listing, propertyData as PropertyRow, (mediaData ?? []) as MediaRow[]);
};

const normalizePostalCode = (value: string) => value.trim().replace(/\s+/g, "");

export const formatListingPrice = (input: { amount: number | null; currency: string }) => {
  if (typeof input.amount !== "number") return "Prix sur demande";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: input.currency || "EUR",
    maximumFractionDigits: 0,
  }).format(input.amount);
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

export const listPublicPropertyListings = async (input: {
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
}) => {
  let query = supabaseAdmin
    .from("property_listings")
    .select("*")
    .eq("business_type", input.businessType)
    .eq("is_published", true)
    .eq("publication_status", "active")
    .order("updated_at", { ascending: false });

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
      return [] as ListingRow[];
    }
    throw new Error(error.message);
  }

  const snapshots = await Promise.all(
    ((data ?? []) as ListingRow[]).map(async (listing) => hydrateListingSnapshot(listing))
  );

  return snapshots.filter((listing): listing is PropertyListingSnapshot => Boolean(listing));
};

export const getPublicPropertyListingBySlug = async (slug: string) => {
  const { data: listingData, error: listingError } = await supabaseAdmin
    .from("property_listings")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (listingError) {
    if (isMissingRelationError(listingError.message)) {
      return null;
    }
    throw new Error(listingError.message);
  }
  if (!listingData) return null;

  return hydrateListingSnapshot(listingData as ListingRow);
};

export const getPublicPropertyListingByExternalId = async (input: {
  postalCode: string;
  propertyId: string;
}) => {
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

  const { data: listingData, error: listingError } = await supabaseAdmin
    .from("property_listings")
    .select("*")
    .eq("property_id", property.id)
    .eq("is_published", true)
    .maybeSingle();

  if (listingError) {
    if (isMissingRelationError(listingError.message)) {
      return null;
    }
    throw new Error(listingError.message);
  }
  if (!listingData) return null;

  return hydrateListingSnapshot(listingData as ListingRow);
};

export const listPropertyTypesForBusinessType = async (businessType: PropertyBusinessType) => {
  const { data, error } = await supabaseAdmin
    .from("property_listings")
    .select("property_type")
    .eq("business_type", businessType)
    .eq("is_published", true)
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
