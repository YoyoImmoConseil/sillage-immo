import type { ToolDefinition } from "../types";
import {
  formatListingPrice,
  listPublicPropertyListings,
} from "@/services/properties/property-listing.service";
import type { AppLocale } from "@/lib/i18n/config";
import type { PropertyBusinessType } from "@/types/domain/properties";

// Public, anonymous-safe listing search for the Home Assistant (Porte 1).
//
// Unlike `properties.search` (admin surface, returns internal fields and
// unpublished rows), this tool is a thin wrapper over the authoritative
// public listing service: it ONLY ever returns published + commercialized
// listings, on a strict whitelist of display fields, with a real public
// `url` (canonicalPath) so the model can never fabricate a link or a price.
type PublicListingsSearchInput = {
  businessType?: PropertyBusinessType;
  city?: string;
  propertyType?: string;
  priceMin?: number;
  priceMax?: number;
  roomsMin?: number;
  roomsMax?: number;
  surfaceMin?: number;
  hasTerrace?: boolean;
  hasElevator?: boolean;
  limit?: number;
  locale?: AppLocale;
};

const PUBLIC_LISTINGS_MAX = 5;
const PUBLIC_LISTINGS_DEFAULT = 3;

const SUPPORTED_LOCALES: AppLocale[] = ["fr", "en", "es", "ru"];

export const publicListingsTools: ToolDefinition<unknown, unknown>[] = [
  {
    name: "public_listings.search",
    description:
      "Recherche dans les annonces PUBLIÉES (vente + location). Champs publics uniquement, lien réel inclus. À utiliser pour proposer des biens à un visiteur du site.",
    version: "1.0.0",
    inputSchema: {
      type: "object",
      properties: {
        businessType: { type: "string", enum: ["sale", "rental"] },
        city: { type: "string" },
        propertyType: { type: "string" },
        priceMin: { type: "number", minimum: 0 },
        priceMax: { type: "number", minimum: 0 },
        roomsMin: { type: "number", minimum: 0 },
        roomsMax: { type: "number", minimum: 0 },
        surfaceMin: { type: "number", minimum: 0 },
        hasTerrace: { type: "boolean" },
        hasElevator: { type: "boolean" },
        limit: { type: "number", minimum: 1, maximum: PUBLIC_LISTINGS_MAX },
        locale: { type: "string", enum: ["fr", "en", "es", "ru"] },
      },
      additionalProperties: false,
    },
    handler: async (input) => {
      const p = (input ?? {}) as PublicListingsSearchInput;
      const limit = Math.min(
        Math.max(p.limit ?? PUBLIC_LISTINGS_DEFAULT, 1),
        PUBLIC_LISTINGS_MAX
      );
      const locale: AppLocale = SUPPORTED_LOCALES.includes(p.locale as AppLocale)
        ? (p.locale as AppLocale)
        : "fr";
      const businessTypes: PropertyBusinessType[] = p.businessType
        ? [p.businessType]
        : ["sale", "rental"];

      const perType = await Promise.all(
        businessTypes.map((businessType) =>
          listPublicPropertyListings({
            locale,
            businessType,
            city: p.city,
            propertyType: p.propertyType,
            minPrice: p.priceMin,
            maxPrice: p.priceMax,
            minRooms: p.roomsMin,
            maxRooms: p.roomsMax,
            minSurface: p.surfaceMin,
            terrace: p.hasTerrace,
            elevator: p.hasElevator,
            pageSize: limit,
          })
        )
      );

      const items = perType
        .flat()
        .slice(0, limit)
        .map((listing) => ({
          title: listing.title,
          city: listing.city,
          postalCode: listing.postalCode,
          propertyType: listing.propertyType,
          businessType: listing.businessType,
          rooms: listing.roomCount,
          livingArea: listing.livingArea,
          priceAmount: listing.priceAmount,
          priceCurrency: listing.priceCurrency,
          priceLabel: formatListingPrice({
            amount: listing.priceAmount,
            currency: listing.priceCurrency,
            locale,
          }),
          url: listing.canonicalPath,
          coverImageUrl: listing.coverImageUrl,
        }));

      return { items, count: items.length, limit };
    },
  },
];
