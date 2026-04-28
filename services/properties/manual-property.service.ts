import "server-only";
import crypto from "node:crypto";
import type { AppLocale } from "@/lib/i18n/config";
import { mergeLocalizedText } from "@/lib/i18n/localized-content";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidatePublicListings } from "@/lib/cache/revalidate";
import {
  isAdminAvailabilityStatus,
  isPublicAvailabilityStatus,
  type AdminAvailabilityStatus,
} from "@/lib/properties/canonical-types";
import type { Database } from "@/types/db/supabase";
import type { PropertyBusinessType } from "@/types/domain/properties";

type PropertyRow = Database["public"]["Tables"]["properties"]["Row"];
type PropertyListingRow = Database["public"]["Tables"]["property_listings"]["Row"];

export type AdminPropertyListItem = {
  id: string;
  listingId: string;
  source: string;
  title: string | null;
  city: string | null;
  propertyType: string | null;
  businessType: string;
  publicationStatus: string;
  isPublished: boolean;
  priceAmount: number | null;
  updatedAt: string;
};

export type AdminPropertyDetail = {
  property: PropertyRow;
  listing: PropertyListingRow | null;
};

const toSlug = (value: string) => {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
};

const createSourceRef = () => `manual-${crypto.randomUUID()}`;

const buildCanonicalPath = (title: string, businessType: PropertyBusinessType) => {
  const slug = toSlug(`${businessType}-${title}-${crypto.randomBytes(3).toString("hex")}`);
  return {
    slug,
    canonicalPath: `/biens/${slug}`,
  };
};

export const listAdminProperties = async (input: {
  search?: string;
  source?: string;
  businessType?: PropertyBusinessType;
}) => {
  let query = supabaseAdmin
    .from("property_listings")
    .select("id, property_id, business_type, publication_status, is_published, title, city, property_type, price_amount, updated_at")
    .order("updated_at", { ascending: false })
    .limit(150);

  if (input.search?.trim()) {
    const term = input.search.trim();
    query = query.or(`title.ilike.%${term}%,city.ilike.%${term}%,property_type.ilike.%${term}%`);
  }
  if (input.businessType?.trim()) {
    query = query.eq("business_type", input.businessType);
  }

  const { data: listingsData, error: listingsError } = await query;
  if (listingsError) {
    throw new Error(listingsError.message);
  }

  const listings = (listingsData ?? []) as Array<
    Pick<
      PropertyListingRow,
      | "id"
      | "property_id"
      | "business_type"
      | "publication_status"
      | "is_published"
      | "title"
      | "city"
      | "property_type"
      | "price_amount"
      | "updated_at"
    >
  >;
  const propertyIds = listings.map((item) => item.property_id);

  const { data: propertiesData, error: propertiesError } = propertyIds.length
    ? await supabaseAdmin.from("properties").select("id, source").in("id", propertyIds)
    : { data: [], error: null };

  if (propertiesError) {
    throw new Error(propertiesError.message);
  }

  const sourceByPropertyId = new Map(
    ((propertiesData ?? []) as Array<Pick<PropertyRow, "id" | "source">>).map((item) => [item.id, item.source])
  );

  return listings
    .map((listing) => ({
      id: listing.property_id,
      listingId: listing.id,
      source: sourceByPropertyId.get(listing.property_id) ?? "unknown",
      title: listing.title,
      city: listing.city,
      propertyType: listing.property_type,
      businessType: listing.business_type,
      publicationStatus: listing.publication_status,
      isPublished: listing.is_published,
      priceAmount: listing.price_amount,
      updatedAt: listing.updated_at,
    }))
    .filter((item) => {
      if (!input.source?.trim()) return true;
      return item.source === input.source.trim();
    }) satisfies AdminPropertyListItem[];
};

export const getPropertyDetailById = async (propertyId: string): Promise<AdminPropertyDetail | null> => {
  const [{ data: propertyData, error: propertyError }, { data: listingData, error: listingError }] =
    await Promise.all([
      supabaseAdmin.from("properties").select("*").eq("id", propertyId).maybeSingle(),
      supabaseAdmin.from("property_listings").select("*").eq("property_id", propertyId).maybeSingle(),
    ]);

  if (propertyError) throw new Error(propertyError.message);
  if (listingError) throw new Error(listingError.message);
  if (!propertyData) return null;

  return {
    property: propertyData as PropertyRow,
    listing: (listingData as PropertyListingRow | null) ?? null,
  };
};

export const getAdminPropertyDetail = getPropertyDetailById;

export const createManualProperty = async (input: {
  title: string;
  description?: string;
  titleTranslations?: Partial<Record<AppLocale, string | null | undefined>>;
  descriptionTranslations?: Partial<Record<AppLocale, string | null | undefined>>;
  propertyType?: string;
  city?: string;
  postalCode?: string;
  businessType: PropertyBusinessType;
  priceAmount?: number;
  livingArea?: number;
  rooms?: number;
  bedrooms?: number;
  floor?: number;
  hasTerrace?: boolean | null;
  hasElevator?: boolean | null;
  coverImageUrl?: string;
  availabilityStatus?: AdminAvailabilityStatus;
}) => {
  const now = new Date().toISOString();
  const sourceRef = createSourceRef();
  const propertyMetadata = mergeLocalizedText(
    mergeLocalizedText({}, "title", input.titleTranslations),
    "description",
    input.descriptionTranslations
  );
  const listingMetadata = mergeLocalizedText({}, "title", input.titleTranslations);

  const requestedStatus = input.availabilityStatus;
  const availabilityStatus: AdminAvailabilityStatus =
    requestedStatus && isAdminAvailabilityStatus(requestedStatus) ? requestedStatus : "available";
  const isPublic = isPublicAvailabilityStatus(availabilityStatus);

  const { data: propertyData, error: propertyError } = await supabaseAdmin
    .from("properties")
    .insert({
      source: "manual",
      source_ref: sourceRef,
      kind: input.businessType,
      negotiation: input.businessType === "rental" ? "let" : "sale",
      title: input.title.trim(),
      description: input.description?.trim() || null,
      property_type: input.propertyType?.trim() || null,
      city: input.city?.trim() || null,
      postal_code: input.postalCode?.trim() || null,
      living_area: input.livingArea ?? null,
      rooms: input.rooms ?? null,
      bedrooms: input.bedrooms ?? null,
      floor: input.floor ?? null,
      has_terrace: input.hasTerrace ?? null,
      has_elevator: input.hasElevator ?? null,
      availability_status: availabilityStatus,
      raw_payload: {},
      metadata: propertyMetadata,
      updated_at: now,
      last_synced_at: now,
    })
    .select("*")
    .single();

  if (propertyError || !propertyData) {
    throw new Error(propertyError?.message ?? "Impossible de creer le bien.");
  }
  const property = propertyData as PropertyRow;

  const slugPayload = buildCanonicalPath(input.title, input.businessType);
  const { data: listingData, error: listingError } = await supabaseAdmin
    .from("property_listings")
    .insert({
      property_id: property.id,
      business_type: input.businessType,
      publication_status: isPublic ? "active" : "inactive",
      is_published: isPublic,
      slug: slugPayload.slug,
      canonical_path: slugPayload.canonicalPath,
      title: input.title.trim(),
      city: input.city?.trim() || null,
      postal_code: input.postalCode?.trim() || null,
      property_type: input.propertyType?.trim() || null,
      cover_image_url: input.coverImageUrl?.trim() || null,
      rooms: input.rooms ?? null,
      bedrooms: input.bedrooms ?? null,
      living_area: input.livingArea ?? null,
      floor: input.floor ?? null,
      has_terrace: input.hasTerrace ?? null,
      has_elevator: input.hasElevator ?? null,
      price_amount: input.priceAmount ?? null,
      published_at: isPublic ? now : null,
      updated_at: now,
      listing_metadata: listingMetadata,
    })
    .select("*")
    .single();

  if (listingError || !listingData) {
    throw new Error(listingError?.message ?? "Impossible de creer l'annonce du bien.");
  }

  const listing = listingData as PropertyListingRow;
  revalidatePublicListings({
    listingId: listing.id,
    slug: listing.slug,
    sourceRef: property.source_ref,
    postalCode: property.postal_code,
  });

  return {
    property,
    listing,
  };
};

export const updateManualProperty = async (input: {
  propertyId: string;
  title: string;
  description?: string;
  titleTranslations?: Partial<Record<AppLocale, string | null | undefined>>;
  descriptionTranslations?: Partial<Record<AppLocale, string | null | undefined>>;
  propertyType?: string;
  city?: string;
  postalCode?: string;
  businessType: PropertyBusinessType;
  priceAmount?: number;
  livingArea?: number;
  rooms?: number;
  bedrooms?: number;
  floor?: number;
  hasTerrace?: boolean | null;
  hasElevator?: boolean | null;
  coverImageUrl?: string;
}) => {
  const detail = await getAdminPropertyDetail(input.propertyId);
  if (!detail) {
    throw new Error("Bien introuvable.");
  }
  if (detail.property.source !== "manual") {
    throw new Error("Seuls les biens manuels sont modifiables localement.");
  }

  const now = new Date().toISOString();
  const propertyMetadata = mergeLocalizedText(
    mergeLocalizedText(detail.property.metadata, "title", input.titleTranslations),
    "description",
    input.descriptionTranslations
  );
  const listingMetadata = mergeLocalizedText(detail.listing?.listing_metadata ?? {}, "title", input.titleTranslations);

  const { error: propertyError } = await supabaseAdmin
    .from("properties")
    .update({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      property_type: input.propertyType?.trim() || null,
      city: input.city?.trim() || null,
      postal_code: input.postalCode?.trim() || null,
      living_area: input.livingArea ?? null,
      rooms: input.rooms ?? null,
      bedrooms: input.bedrooms ?? null,
      floor: input.floor ?? null,
      has_terrace: input.hasTerrace ?? null,
      has_elevator: input.hasElevator ?? null,
      metadata: propertyMetadata,
      updated_at: now,
      last_synced_at: now,
    })
    .eq("id", input.propertyId);

  if (propertyError) {
    throw new Error(propertyError.message);
  }

  // Note: publication is no longer driven by this endpoint. The status panel
  // (PATCH /api/admin/properties/[id]/status) is the single source of truth
  // for `is_published` / `publication_status` (derived from
  // `properties.availability_status`).
  const { error: listingError } = await supabaseAdmin
    .from("property_listings")
    .update({
      business_type: input.businessType,
      title: input.title.trim(),
      city: input.city?.trim() || null,
      postal_code: input.postalCode?.trim() || null,
      property_type: input.propertyType?.trim() || null,
      cover_image_url: input.coverImageUrl?.trim() || null,
      rooms: input.rooms ?? null,
      bedrooms: input.bedrooms ?? null,
      living_area: input.livingArea ?? null,
      floor: input.floor ?? null,
      has_terrace: input.hasTerrace ?? null,
      has_elevator: input.hasElevator ?? null,
      price_amount: input.priceAmount ?? null,
      listing_metadata: listingMetadata,
      updated_at: now,
    })
    .eq("property_id", input.propertyId);

  if (listingError) {
    throw new Error(listingError.message);
  }

  revalidatePublicListings({
    listingId: detail.listing?.id ?? null,
    slug: detail.listing?.slug ?? null,
    sourceRef: detail.property.source_ref,
    postalCode: detail.property.postal_code,
  });
};
