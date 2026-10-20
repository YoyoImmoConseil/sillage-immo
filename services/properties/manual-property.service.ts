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
import { inferListingTransactionKind } from "@/lib/properties/listing-price";
import {
  formatAdminAvailabilityLabel,
  resolveAdminPropertySection,
  type AdminPropertySection,
} from "@/lib/properties/admin-sections";

type PropertyRow = Database["public"]["Tables"]["properties"]["Row"];
type PropertyListingRow = Database["public"]["Tables"]["property_listings"]["Row"];

export type AdminPropertyListItem = {
  id: string;
  /** Null pour un bien sans annonce (ex. estimation vendeur en cours). */
  listingId: string | null;
  source: string;
  title: string | null;
  city: string | null;
  propertyType: string | null;
  businessType: string;
  publicationStatus: string;
  isPublished: boolean;
  priceAmount: number | null;
  availabilityStatus: string | null;
  availabilityLabel: string;
  section: AdminPropertySection;
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
}): Promise<AdminPropertyListItem[]> => {
  // Un bien par ligne, annonce ou pas : les estimations vendeur n'ont pas
  // d'annonce mais doivent apparaître dans « En préparation ».
  const [{ data: propertiesData, error: propertiesError }, { data: listingsData, error: listingsError }] =
    await Promise.all([
      supabaseAdmin
        .from("properties")
        .select("id, source, title, city, property_type, negotiation, availability_status, updated_at")
        .order("updated_at", { ascending: false })
        .limit(400),
      supabaseAdmin
        .from("property_listings")
        .select("id, property_id, business_type, publication_status, is_published, title, city, property_type, price_amount, updated_at"),
    ]);
  if (propertiesError) throw new Error(propertiesError.message);
  if (listingsError) throw new Error(listingsError.message);

  type ListingPick = Pick<
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
  >;
  const listingByPropertyId = new Map(((listingsData ?? []) as ListingPick[]).map((item) => [item.property_id, item]));

  const term = input.search?.trim().toLowerCase() ?? "";
  const source = input.source?.trim() ?? "";

  return (
    (propertiesData ?? []) as Array<
      Pick<PropertyRow, "id" | "source" | "title" | "city" | "property_type" | "negotiation" | "availability_status" | "updated_at">
    >
  )
    .map((property): AdminPropertyListItem => {
      const listing = listingByPropertyId.get(property.id) ?? null;
      const businessType = listing?.business_type ?? inferListingTransactionKind(property.negotiation);
      const updatedAt =
        listing && listing.updated_at > property.updated_at ? listing.updated_at : property.updated_at;
      return {
        id: property.id,
        listingId: listing?.id ?? null,
        source: property.source,
        title: listing?.title ?? property.title,
        city: listing?.city ?? property.city,
        propertyType: listing?.property_type ?? property.property_type,
        businessType,
        publicationStatus: listing?.publication_status ?? "none",
        isPublished: listing?.is_published ?? false,
        priceAmount: listing?.price_amount ?? null,
        availabilityStatus: property.availability_status,
        availabilityLabel: formatAdminAvailabilityLabel(property.availability_status),
        section: resolveAdminPropertySection(property.availability_status),
        updatedAt,
      };
    })
    .filter((item) => {
      if (source && item.source !== source) return false;
      if (input.businessType && item.businessType !== input.businessType) return false;
      if (term) {
        const haystack = [item.title, item.city, item.propertyType].filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    })
    .sort((left, right) => (left.updatedAt < right.updatedAt ? 1 : left.updatedAt > right.updatedAt ? -1 : 0));
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
