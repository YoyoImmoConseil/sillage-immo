import type { ToolDefinition } from "../types";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Database } from "@/types/db/supabase";

type PropertyRow = Database["public"]["Tables"]["properties"]["Row"];
type ListingRow = Database["public"]["Tables"]["property_listings"]["Row"];

type SearchInput = {
  city?: string;
  propertyType?: string;
  businessType?: "sale" | "rental";
  priceMin?: number;
  priceMax?: number;
  roomsMin?: number;
  roomsMax?: number;
  areaMin?: number;
  hasTerrace?: boolean;
  hasElevator?: boolean;
  isPublished?: boolean;
  kind?: string;
  limit?: number;
  offset?: number;
};

export const propertiesTools: ToolDefinition<unknown, unknown>[] = [
  {
    name: "properties.search",
    description:
      "Recherche multi-criteres sur les biens (listing + propriete). Retourne un resume.",
    version: "1.0.0",
    inputSchema: {
      type: "object",
      properties: {
        city: { type: "string" },
        propertyType: { type: "string" },
        businessType: { type: "string", enum: ["sale", "rental"] },
        priceMin: { type: "number", minimum: 0 },
        priceMax: { type: "number", minimum: 0 },
        roomsMin: { type: "number", minimum: 0 },
        roomsMax: { type: "number", minimum: 0 },
        areaMin: { type: "number", minimum: 0 },
        hasTerrace: { type: "boolean" },
        hasElevator: { type: "boolean" },
        isPublished: { type: "boolean" },
        kind: { type: "string" },
        limit: { type: "number", minimum: 1, maximum: 50 },
        offset: { type: "number", minimum: 0 },
      },
      additionalProperties: false,
    },
    handler: async (input) => {
      const p = (input ?? {}) as SearchInput;
      const limit = Math.min(Math.max(p.limit ?? 20, 1), 50);
      const offset = Math.max(p.offset ?? 0, 0);

      let query = supabaseAdmin
        .from("property_listings")
        .select(
          "id, property_id, business_type, slug, canonical_path, title, city, postal_code, property_type, rooms, bedrooms, living_area, has_terrace, has_elevator, price_amount, price_currency, is_published, publication_status, published_at, unpublished_at, updated_at"
        )
        .order("updated_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (p.businessType) query = query.eq("business_type", p.businessType);
      if (typeof p.isPublished === "boolean") {
        query = query.eq("is_published", p.isPublished);
      }
      if (p.city?.trim()) query = query.ilike("city", `%${p.city.trim()}%`);
      if (p.propertyType?.trim()) query = query.eq("property_type", p.propertyType.trim());
      if (typeof p.priceMin === "number") query = query.gte("price_amount", p.priceMin);
      if (typeof p.priceMax === "number") query = query.lte("price_amount", p.priceMax);
      if (typeof p.roomsMin === "number") query = query.gte("rooms", p.roomsMin);
      if (typeof p.roomsMax === "number") query = query.lte("rooms", p.roomsMax);
      if (typeof p.areaMin === "number") query = query.gte("living_area", p.areaMin);
      if (typeof p.hasTerrace === "boolean") query = query.eq("has_terrace", p.hasTerrace);
      if (typeof p.hasElevator === "boolean") query = query.eq("has_elevator", p.hasElevator);

      const { data: listings, error: listingsError } = await query;
      if (listingsError) throw new Error(listingsError.message);

      const rows = (listings ?? []) as ListingRow[];

      // Optional `kind` filter requires a join to properties.
      let propertyById = new Map<string, PropertyRow>();
      if (rows.length > 0) {
        const propertyIds = Array.from(new Set(rows.map((row) => row.property_id)));
        let propsQuery = supabaseAdmin
          .from("properties")
          .select("id, kind, availability_status, source, source_ref")
          .in("id", propertyIds);
        if (p.kind?.trim()) {
          const trimmedKind = p.kind.trim();
          const KNOWN_KINDS = ["sale", "rental", "project", "unit"] as const;
          if (
            (KNOWN_KINDS as readonly string[]).includes(trimmedKind)
          ) {
            propsQuery = propsQuery.eq(
              "kind",
              trimmedKind as (typeof KNOWN_KINDS)[number]
            );
          }
        }
        const { data: props, error: propsError } = await propsQuery;
        if (propsError) throw new Error(propsError.message);
        propertyById = new Map(((props ?? []) as PropertyRow[]).map((row) => [row.id, row]));
      }

      const items = rows
        .filter((row) => !p.kind?.trim() || propertyById.has(row.property_id))
        .map((row) => ({
          listingId: row.id,
          propertyId: row.property_id,
          slug: row.slug,
          canonicalPath: row.canonical_path,
          title: row.title,
          city: row.city,
          postalCode: row.postal_code,
          propertyType: row.property_type,
          rooms: row.rooms,
          bedrooms: row.bedrooms,
          livingArea: row.living_area,
          hasTerrace: row.has_terrace,
          hasElevator: row.has_elevator,
          priceAmount: row.price_amount,
          priceCurrency: row.price_currency,
          businessType: row.business_type,
          isPublished: row.is_published,
          publicationStatus: row.publication_status,
          publishedAt: row.published_at,
          unpublishedAt: row.unpublished_at,
          updatedAt: row.updated_at,
          kind: propertyById.get(row.property_id)?.kind ?? null,
          availabilityStatus:
            propertyById.get(row.property_id)?.availability_status ?? null,
        }));

      return {
        items,
        count: items.length,
        limit,
        offset,
      };
    },
  },
  {
    name: "properties.get",
    description:
      "Recupere un bien par propertyId (uuid) ou par slug de listing publie.",
    version: "1.0.0",
    inputSchema: {
      oneOf: [
        {
          type: "object",
          properties: { propertyId: { type: "string", format: "uuid" } },
          required: ["propertyId"],
          additionalProperties: false,
        },
        {
          type: "object",
          properties: { slug: { type: "string", minLength: 1 } },
          required: ["slug"],
          additionalProperties: false,
        },
      ],
    },
    handler: async (input) => {
      const payload = (input ?? {}) as { propertyId?: string; slug?: string };
      let propertyId = payload.propertyId ?? null;

      if (!propertyId && payload.slug) {
        const { data: listing, error } = await supabaseAdmin
          .from("property_listings")
          .select("property_id")
          .eq("slug", payload.slug)
          .maybeSingle();
        if (error) throw new Error(error.message);
        if (!listing) return { property: null, listings: [] };
        propertyId = (listing as { property_id: string }).property_id;
      }

      if (!propertyId) return { property: null, listings: [] };

      const [propertyResult, listingResult] = await Promise.all([
        supabaseAdmin.from("properties").select("*").eq("id", propertyId).maybeSingle(),
        supabaseAdmin
          .from("property_listings")
          .select("*")
          .eq("property_id", propertyId),
      ]);
      if (propertyResult.error) throw new Error(propertyResult.error.message);
      if (listingResult.error) throw new Error(listingResult.error.message);

      return {
        property: propertyResult.data ?? null,
        listings: (listingResult.data ?? []) as ListingRow[],
      };
    },
  },
  {
    name: "properties.list_recent",
    description: "Liste les biens recemment mis a jour (toute publication confondue).",
    version: "1.0.0",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", minimum: 1, maximum: 50 },
      },
      additionalProperties: false,
    },
    handler: async (input) => {
      const limit = Math.min(
        Math.max(((input ?? {}) as { limit?: number }).limit ?? 20, 1),
        50
      );
      const { data, error } = await supabaseAdmin
        .from("properties")
        .select(
          "id, source, source_ref, kind, property_type, availability_status, formatted_address, city, postal_code, updated_at, last_synced_at"
        )
        .order("updated_at", { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      return { items: data ?? [], count: data?.length ?? 0, limit };
    },
  },
];
