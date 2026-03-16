import { NextResponse } from "next/server";
import {
  listPropertyTypesForBusinessType,
  listPublicPropertyListings,
} from "@/services/properties/property-listing.service";
import type { PropertyBusinessType, PropertyListingSnapshot } from "@/types/domain/properties";

const toNumber = (value: string | null) => {
  if (!value?.trim()) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const toBoolean = (value: string | null) => {
  if (!value) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
};

const isBusinessType = (value: string | null): value is PropertyBusinessType => {
  return value === "sale" || value === "rental";
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const businessTypeParam = searchParams.get("businessType");

  if (!isBusinessType(businessTypeParam)) {
    return NextResponse.json(
      { ok: false, message: "businessType invalide (sale|rental)." },
      { status: 400 }
    );
  }

  const [listings, propertyTypes] = await Promise.all([
    listPublicPropertyListings({
      businessType: businessTypeParam,
      city: searchParams.get("city") ?? undefined,
      propertyType: searchParams.get("type") ?? undefined,
      minPrice: toNumber(searchParams.get("minPrice")),
      maxPrice: toNumber(searchParams.get("maxPrice")),
      minRooms: toNumber(searchParams.get("minRooms")),
      maxRooms: toNumber(searchParams.get("maxRooms")),
      minSurface: toNumber(searchParams.get("minSurface")),
      maxSurface: toNumber(searchParams.get("maxSurface")),
      minFloor: toNumber(searchParams.get("minFloor")),
      maxFloor: toNumber(searchParams.get("maxFloor")),
      terrace: toBoolean(searchParams.get("terrace")),
      elevator: toBoolean(searchParams.get("elevator")),
    }),
    listPropertyTypesForBusinessType(businessTypeParam),
  ]);

  return NextResponse.json({
    ok: true,
    listings: listings as PropertyListingSnapshot[],
    propertyTypes,
  });
}
