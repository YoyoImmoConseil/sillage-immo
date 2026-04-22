import "server-only";
import { serverEnv } from "@/lib/env/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sweepBrightClient } from "./sweepbright-client.service";
import { cacheSweepBrightMedia } from "./sweepbright-media-cache.service";
import type { SweepBrightEstateData } from "@/types/api/sweepbright";
import type { Database } from "@/types/db/supabase";
import { recomputeMatchesForProperty } from "@/services/buyers/buyer-matching.service";
import { processBuyerAlertsForNewMatches } from "@/services/buyers/buyer-alert.service";

type WebhookDeliveryRow = Database["public"]["Tables"]["crm_webhook_deliveries"]["Row"];
type PropertyRow = Database["public"]["Tables"]["properties"]["Row"];
type PropertyListingRow = Database["public"]["Tables"]["property_listings"]["Row"];
type PropertyMediaRow = Database["public"]["Tables"]["property_media"]["Row"];

const SWEEPBRIGHT_SOURCE = "sweepbright";
const ESTATE_FETCH_WINDOW_MS = 55 * 60 * 1000;

const buildPublicListingUrl = (canonicalPath: string) => {
  const baseUrl = serverEnv.PUBLIC_SITE_URL.trim().replace(/\/$/, "");
  if (!baseUrl) {
    throw new Error("PUBLIC_SITE_URL is not configured.");
  }
  return `${baseUrl}${canonicalPath}`;
};

const isDeliveryExpired = (createdAt: string) => {
  const createdAtMs = new Date(createdAt).getTime();
  if (!Number.isFinite(createdAtMs)) return false;
  return Date.now() - createdAtMs > ESTATE_FETCH_WINDOW_MS;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
};

const asNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const asBoolean = (value: unknown): boolean | null => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1 ? true : value === 0 ? false : null;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "oui"].includes(normalized)) return true;
    if (["false", "0", "no", "non"].includes(normalized)) return false;
  }
  return null;
};

const hasAnyAmenity = (estate: SweepBrightEstateData, tokens: string[]) => {
  const amenities = Array.isArray(estate.amenities)
    ? estate.amenities.filter((value): value is string => typeof value === "string")
    : [];
  const normalized = amenities.map((value) => value.trim().toLowerCase());
  return tokens.some((token) => normalized.some((item) => item.includes(token)));
};

const inferFloor = (estate: SweepBrightEstateData) => {
  const record = estate as Record<string, unknown>;
  const fromLocation = asNumber(estate.location?.floor);
  if (typeof fromLocation === "number") return Math.trunc(fromLocation);
  const fromRoot = asNumber(record.floor);
  if (typeof fromRoot === "number") return Math.trunc(fromRoot);
  return null;
};

const inferHasTerrace = (estate: SweepBrightEstateData) => {
  const record = estate as Record<string, unknown>;
  if (hasAnyAmenity(estate, ["terrace", "balcon", "balcony"])) return true;
  const fromTerrace = asBoolean(record.terrace);
  if (fromTerrace !== null) return fromTerrace;
  const fromHasTerrace = asBoolean(record.has_terrace);
  if (fromHasTerrace !== null) return fromHasTerrace;
  return null;
};

const inferHasElevator = (estate: SweepBrightEstateData) => {
  const record = estate as Record<string, unknown>;
  if (hasAnyAmenity(estate, ["elevator", "ascenseur", "lift"])) return true;
  const fromElevator = asBoolean(record.elevator);
  if (fromElevator !== null) return fromElevator;
  const fromLift = asBoolean(record.lift);
  if (fromLift !== null) return fromLift;
  const building = asRecord(record.building);
  const fromBuilding = asBoolean(building?.elevator ?? building?.lift);
  if (fromBuilding !== null) return fromBuilding;
  return null;
};

const localizedText = (value: unknown) => {
  if (typeof value === "string") return value.trim() || null;
  const record = asRecord(value);
  if (!record) return null;
  const candidates = [record.fr, record.en, record.nl];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  return null;
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

const inferBusinessType = (estate: SweepBrightEstateData): "sale" | "rental" => {
  return estate.negotiation === "let" ? "rental" : "sale";
};

const inferKind = (estate: SweepBrightEstateData): "sale" | "rental" | "project" | "unit" => {
  if (estate.is_project) return "project";
  if (estate.project_id) return "unit";
  return inferBusinessType(estate);
};

const computePriceAmount = (estate: SweepBrightEstateData) => {
  const businessType = inferBusinessType(estate);
  if (businessType === "rental") {
    return typeof estate.price_base_rent?.amount === "number"
      ? estate.price_base_rent.amount
      : typeof estate.price?.amount === "number"
        ? estate.price.amount
        : null;
  }

  return typeof estate.price?.amount === "number" ? estate.price.amount : null;
};

const computeRoomCount = (estate: SweepBrightEstateData) => {
  const bedrooms = typeof estate.bedrooms === "number" ? estate.bedrooms : 0;
  const livingRooms = typeof estate.living_rooms === "number" ? estate.living_rooms : 0;
  const total = bedrooms + livingRooms;
  return total > 0 ? total : null;
};

const buildPropertyTitle = (estate: SweepBrightEstateData) => {
  return (
    localizedText(estate.description_title) ??
    estate.location?.formatted?.trim() ??
    [estate.type, estate.location?.city].filter(Boolean).join(" ").trim() ??
    null
  );
};

const buildListingSlug = (estate: SweepBrightEstateData, businessType: "sale" | "rental") => {
  const base = [
    businessType,
    estate.location?.city ?? "",
    localizedText(estate.description_title) ?? estate.type ?? "bien",
    estate.id.slice(0, 8),
  ]
    .filter(Boolean)
    .join("-");

  return toSlug(base) || `${businessType}-${estate.id.slice(0, 8)}`;
};

const buildSweepBrightCanonicalPath = (estate: SweepBrightEstateData) => {
  const postalCode = estate.location?.postal_code?.trim().replace(/\s+/g, "") || "property";
  return `/${encodeURIComponent(postalCode)}/${encodeURIComponent(estate.id)}`;
};

const mapEstateToPropertyInsert = (estate: SweepBrightEstateData) => {
  const liveableArea = estate.sizes?.liveable_area?.size;
  const plotArea = estate.sizes?.plot_area?.size;
  const floor = inferFloor(estate);
  const hasTerrace = inferHasTerrace(estate);
  const hasElevator = inferHasElevator(estate);

  return {
    source: SWEEPBRIGHT_SOURCE,
    source_ref: estate.id,
    company_id: estate.office?.id ?? null,
    project_id: estate.project_id ?? null,
    is_project: estate.is_project ?? false,
    kind: inferKind(estate),
    negotiation: estate.negotiation ?? null,
    title: buildPropertyTitle(estate),
    description: localizedText(estate.description),
    property_type: estate.type ?? null,
    sub_type: estate.sub_type ?? null,
    availability_status: estate.status ?? null,
    general_condition: estate.general_condition ?? null,
    street: estate.location?.street ?? null,
    street_number: estate.location?.number ?? null,
    postal_code: estate.location?.postal_code ?? null,
    city: estate.location?.city ?? null,
    country: estate.location?.country ?? null,
    formatted_address: estate.location?.formatted ?? null,
    latitude: estate.location?.geo?.latitude ?? null,
    longitude: estate.location?.geo?.longitude ?? null,
    living_area: typeof liveableArea === "number" ? liveableArea : null,
    plot_area: typeof plotArea === "number" ? plotArea : null,
    bedrooms: typeof estate.bedrooms === "number" ? estate.bedrooms : null,
    bathrooms: typeof estate.bathrooms === "number" ? estate.bathrooms : null,
    rooms: computeRoomCount(estate),
    floor,
    has_terrace: hasTerrace,
    has_elevator: hasElevator,
    virtual_tour_url: estate.virtual_tour_url ?? null,
    video_url: estate.video_url ?? null,
    appointment_service_url: estate.appointment_service_url ?? null,
    negotiator: asRecord(estate.negotiator) ?? {},
    legal: asRecord(estate.legal) ?? {},
    raw_payload: estate as unknown as Record<string, unknown>,
    metadata: {
      office: estate.office ?? null,
    } as Record<string, unknown>,
    updated_at: new Date().toISOString(),
    last_synced_at: new Date().toISOString(),
  } satisfies Database["public"]["Tables"]["properties"]["Insert"];
};

const mapEstateToMediaInserts = (propertyId: string, estate: SweepBrightEstateData) => {
  const build = (
    kind: "image" | "plan" | "document",
    items: SweepBrightEstateData["images"]
  ) => {
    return (items ?? []).flatMap((item) => {
      if (!item?.id) return [];
      return [
        {
          property_id: propertyId,
          remote_media_id: item.id,
          kind,
          ordinal: typeof item.ordinal === "number" ? item.ordinal : 0,
          title: item.filename ?? null,
          description: item.description ?? null,
          content_type: item.content_type ?? null,
          remote_url: item.url ?? null,
          cached_url: null,
          expires_at: item.url_expires_on ?? null,
          metadata: {},
          updated_at: new Date().toISOString(),
        } satisfies Database["public"]["Tables"]["property_media"]["Insert"],
      ];
    });
  };

  return [
    ...build("image", estate.images),
    ...build("plan", estate.plans),
    ...build("document", estate.documents),
  ];
};

const getPreferredMediaUrl = (media: Pick<PropertyMediaRow, "kind" | "cached_url" | "remote_url" | "ordinal">[]) => {
  const cover = media
    .filter((item) => item.kind === "image")
    .sort((left, right) => left.ordinal - right.ordinal)[0];
  return cover?.cached_url ?? cover?.remote_url ?? null;
};

const cachePropertyMediaAssets = async (input: { propertyId: string; listingId: string }) => {
  const { data: mediaData, error: mediaError } = await supabaseAdmin
    .from("property_media")
    .select("*")
    .eq("property_id", input.propertyId)
    .order("ordinal", { ascending: true });

  if (mediaError) {
    throw new Error(mediaError.message);
  }

  const mediaRows = (mediaData ?? []) as PropertyMediaRow[];
  for (const media of mediaRows) {
    if (media.kind === "video") continue;
    if (!media.remote_url) continue;
    if (media.cached_url) continue;

    try {
      await cacheSweepBrightMedia({
        id: media.id,
        propertyId: media.property_id,
        kind: media.kind,
        remoteMediaId: media.remote_media_id,
        remoteUrl: media.remote_url,
        contentType: media.content_type,
        title: media.title,
      });
    } catch {
      // keep remote URL as fallback if cache fails
    }
  }

  const { data: refreshedMediaData, error: refreshedMediaError } = await supabaseAdmin
    .from("property_media")
    .select("*")
    .eq("property_id", input.propertyId)
    .order("ordinal", { ascending: true });

  if (refreshedMediaError) {
    throw new Error(refreshedMediaError.message);
  }

  const refreshedMedia = (refreshedMediaData ?? []) as PropertyMediaRow[];
  const preferredCoverImageUrl = getPreferredMediaUrl(refreshedMedia);

  if (preferredCoverImageUrl) {
    const { error: listingUpdateError } = await supabaseAdmin
      .from("property_listings")
      .update({
        cover_image_url: preferredCoverImageUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.listingId);

    if (listingUpdateError) {
      throw new Error(listingUpdateError.message);
    }
  }

  return { preferredCoverImageUrl };
};

const upsertPropertyProjection = async (estate: SweepBrightEstateData) => {
  const propertyPayload = mapEstateToPropertyInsert(estate);
  const { data: propertyData, error: propertyError } = await supabaseAdmin
    .from("properties")
    .upsert(propertyPayload, { onConflict: "source,source_ref" })
    .select("*")
    .single();

  if (propertyError || !propertyData) {
    throw new Error(propertyError?.message ?? "Unable to upsert property projection.");
  }

  const property = propertyData as PropertyRow;
  const businessType = inferBusinessType(estate);
  const slug = buildListingSlug(estate, businessType);
  const canonicalPath = buildSweepBrightCanonicalPath(estate);
  const coverImageUrl =
    estate.images?.find((item) => typeof item?.url === "string" && item.url)?.url ?? null;

  const { data: listingData, error: listingError } = await supabaseAdmin
    .from("property_listings")
    .upsert(
      {
        property_id: property.id,
        business_type: businessType,
        publication_status: "active",
        is_published: true,
        slug,
        canonical_path: canonicalPath,
        title: property.title,
        city: property.city,
        postal_code: property.postal_code,
        property_type: property.property_type,
        cover_image_url: coverImageUrl,
        rooms: property.rooms,
        bedrooms: property.bedrooms,
        living_area: property.living_area,
        floor: property.floor,
        has_terrace: property.has_terrace,
        has_elevator: property.has_elevator,
        price_amount: computePriceAmount(estate),
        price_currency:
          estate.price?.currency ?? estate.price_base_rent?.currency ?? "EUR",
        published_at: new Date().toISOString(),
        unpublished_at: null,
        listing_metadata: {
          source_ref: estate.id,
          negotiation: estate.negotiation ?? null,
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "property_id,business_type" }
    )
    .select("*")
    .single();

  if (listingError || !listingData) {
    throw new Error(listingError?.message ?? "Unable to upsert property listing projection.");
  }

  const { error: deleteMediaError } = await supabaseAdmin
    .from("property_media")
    .delete()
    .eq("property_id", property.id);

  if (deleteMediaError) {
    throw new Error(deleteMediaError.message);
  }

  const mediaPayload = mapEstateToMediaInserts(property.id, estate);
  if (mediaPayload.length > 0) {
    const { error: mediaError } = await supabaseAdmin.from("property_media").insert(mediaPayload);
    if (mediaError) {
      throw new Error(mediaError.message);
    }
  }

  if (estate.is_project && Array.isArray(estate.properties)) {
    for (const unit of estate.properties) {
      if (unit && typeof unit === "object" && typeof unit.id === "string") {
        await upsertPropertyProjection({
          ...unit,
          project_id: estate.id,
        });
      }
    }
  }

  return {
    property,
    listing: listingData as PropertyListingRow,
  };
};

const markEstateDeleted = async (estateId: string) => {
  const now = new Date().toISOString();

  const { data: properties, error: propertiesError } = await supabaseAdmin
    .from("properties")
    .select("id")
    .eq("source", SWEEPBRIGHT_SOURCE)
    .or(`source_ref.eq.${estateId},project_id.eq.${estateId}`);

  if (propertiesError) {
    throw new Error(propertiesError.message);
  }

  const propertyIds = (properties ?? []).map((row) => row.id);
  if (propertyIds.length === 0) {
    return;
  }

  const { error: listingError } = await supabaseAdmin
    .from("property_listings")
    .update({
      publication_status: "deleted",
      is_published: false,
      unpublished_at: now,
      updated_at: now,
    })
    .in("property_id", propertyIds);

  if (listingError) {
    throw new Error(listingError.message);
  }

  const { error: propertyError } = await supabaseAdmin
    .from("properties")
    .update({
      availability_status: "deleted",
      last_synced_at: now,
      updated_at: now,
    })
    .in("id", propertyIds);

  if (propertyError) {
    throw new Error(propertyError.message);
  }
};

const updateDeliveryStatus = async (
  deliveryId: string,
  values: Database["public"]["Tables"]["crm_webhook_deliveries"]["Update"]
) => {
  const { error } = await supabaseAdmin
    .from("crm_webhook_deliveries")
    .update(values)
    .eq("id", deliveryId);

  if (error) {
    throw new Error(error.message);
  }
};

export const processSweepBrightDelivery = async (deliveryId: string) => {
  const { data, error } = await supabaseAdmin
    .from("crm_webhook_deliveries")
    .select("*")
    .eq("id", deliveryId)
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message ?? "SweepBright delivery not found.");
  }

  const delivery = data as WebhookDeliveryRow;
  if (delivery.status === "processed" || delivery.status === "ignored") {
    return { skipped: true as const };
  }

  await updateDeliveryStatus(delivery.id, {
    status: "processing",
    attempts: (delivery.attempts ?? 0) + 1,
  });

  try {
    const payload = delivery.payload as {
      estate_id?: unknown;
      event?: unknown;
    };
    const estateId = typeof payload.estate_id === "string" ? payload.estate_id : null;
    const event = typeof payload.event === "string" ? payload.event : null;

    if (!estateId || !event) {
      throw new Error("Invalid SweepBright delivery payload.");
    }

    if (event !== "estate-deleted" && isDeliveryExpired(delivery.created_at)) {
      await updateDeliveryStatus(delivery.id, {
        status: "ignored",
        last_error: "Delivery expired before SweepBright estate fetch could be completed.",
        processed_at: new Date().toISOString(),
      });
      return { skipped: true as const, expired: true as const };
    }

    if (event === "estate-deleted") {
      await markEstateDeleted(estateId);
      await updateDeliveryStatus(delivery.id, {
        status: "processed",
        processed_at: new Date().toISOString(),
        last_error: null,
      });
      return { skipped: false as const, deleted: true as const };
    }

    const estate = await sweepBrightClient.getEstate(estateId);
    const projection = await upsertPropertyProjection(estate);
    await sweepBrightClient.setEstateUrl(
      estateId,
      buildPublicListingUrl(projection.listing.canonical_path)
    );
    const mediaResult = await cachePropertyMediaAssets({
      propertyId: projection.property.id,
      listingId: projection.listing.id,
    });

    try {
      const matchResult = await recomputeMatchesForProperty(projection.property.id);
      if (matchResult.newMatches.length > 0) {
        await processBuyerAlertsForNewMatches(matchResult.newMatches);
      }
    } catch (matchError) {
      console.error(
        "[sweepbright-sync] buyer alert recompute failed",
        matchError
      );
    }

    await updateDeliveryStatus(delivery.id, {
      status: "processed",
      processed_at: new Date().toISOString(),
      last_error: null,
    });

    return {
      skipped: false as const,
      deleted: false as const,
      propertyId: projection.property.id,
      listingId: projection.listing.id,
      canonicalPath: projection.listing.canonical_path,
      coverImageUrl: mediaResult.preferredCoverImageUrl,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message.slice(0, 500) : "SweepBright sync failed.";
    await updateDeliveryStatus(delivery.id, {
      status: "failed",
      last_error: message,
    });
    throw error;
  }
};

export const processPendingSweepBrightDeliveries = async (limit = 10) => {
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(Math.trunc(limit), 1), 100) : 10;
  const { data, error } = await supabaseAdmin
    .from("crm_webhook_deliveries")
    .select("*")
    .in("status", ["received", "failed"])
    .eq("provider", SWEEPBRIGHT_SOURCE)
    .order("created_at", { ascending: true })
    .limit(safeLimit);

  if (error) {
    throw new Error(error.message);
  }

  const deliveries = (data ?? []) as WebhookDeliveryRow[];
  let processed = 0;
  let failed = 0;

  for (const row of deliveries) {
    try {
      await processSweepBrightDelivery(row.id);
      processed += 1;
    } catch {
      failed += 1;
    }
  }

  return {
    scanned: deliveries.length,
    processed,
    failed,
  };
};

export const getSweepBrightDeliveryStats = async () => {
  const countByStatus = async (
    status: Database["public"]["Tables"]["crm_webhook_deliveries"]["Row"]["status"]
  ) => {
    const { count, error } = await supabaseAdmin
      .from("crm_webhook_deliveries")
      .select("id", { count: "exact", head: true })
      .eq("provider", SWEEPBRIGHT_SOURCE)
      .eq("status", status);

    if (error) {
      throw new Error(error.message);
    }

    return count ?? 0;
  };

  const [received, processing, processed, failed, ignored] = await Promise.all([
    countByStatus("received"),
    countByStatus("processing"),
    countByStatus("processed"),
    countByStatus("failed"),
    countByStatus("ignored"),
  ]);

  return { received, processing, processed, failed, ignored };
};

export const listRecentSweepBrightDeliveries = async (limit = 20) => {
  const { data, error } = await supabaseAdmin
    .from("crm_webhook_deliveries")
    .select("*")
    .eq("provider", SWEEPBRIGHT_SOURCE)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as WebhookDeliveryRow[];
};
