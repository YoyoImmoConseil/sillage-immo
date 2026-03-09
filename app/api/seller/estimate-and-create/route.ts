import { NextResponse } from "next/server";
import { createSellerLead } from "@/services/sellers/seller-lead.service";
import { scoreSellerLead } from "@/services/sellers/seller-score.service";
import { computeLoupeValuation } from "@/services/valuation/loupe-valuation.service";
import { consumeSellerEmailVerificationToken } from "@/services/sellers/seller-email-verification.service";

type EstimateAndCreateInput = {
  fullName: string;
  email: string;
  phone?: string;
  propertyType: "appartement" | "maison" | "villa" | "autre";
  propertyAddress: string;
  city: string;
  postalCode: string;
  timeline?: string;
  occupancyStatus?: string;
  livingArea?: number;
  rooms?: number;
  floor?: string;
  buildingTotalFloors?: number;
  elevator?: boolean;
  apartmentCondition?:
    | "a_renover"
    | "renove_20_ans"
    | "renove_10_ans"
    | "renove_moins_5_ans"
    | "neuf";
  buildingAge?: "ancien_1950" | "recent_1950_1970" | "moderne_1980_today";
  seaView?: "none" | "panoramic" | "classic" | "lateral";
  diagnosticsReady?: boolean;
  diagnosticsSupportNeeded?: boolean;
  syndicDocsReady?: boolean;
  syndicSupportNeeded?: boolean;
  message?: string;
  verificationToken: string;
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isOptionalNumber = (value: unknown): value is number | undefined =>
  value === undefined || (typeof value === "number" && Number.isFinite(value));

const isOptionalBoolean = (value: unknown): value is boolean | undefined =>
  value === undefined || typeof value === "boolean";

const isAllowedString = (value: unknown, allowed: string[]) => {
  return value === undefined || (typeof value === "string" && allowed.includes(value));
};

const isRequiredAllowedString = (value: unknown, allowed: string[]) => {
  return typeof value === "string" && allowed.includes(value);
};

const parseFloorNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value !== "string") return null;
  const match = value.match(/\d+/);
  if (!match) return null;
  const parsed = Number.parseInt(match[0], 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const computeIsTopFloor = (floorRaw: unknown, totalFloorsRaw: unknown) => {
  const floor = parseFloorNumber(floorRaw);
  const totalFloors =
    typeof totalFloorsRaw === "number" && Number.isFinite(totalFloorsRaw)
      ? Math.trunc(totalFloorsRaw)
      : null;
  if (floor === null || totalFloors === null || floor < 0 || totalFloors < 0) return null;
  if (floor > totalFloors) return null;
  return floor === totalFloors;
};

const validate = (payload: unknown): payload is EstimateAndCreateInput => {
  if (!payload || typeof payload !== "object") return false;
  const input = payload as Record<string, unknown>;
  return (
    isNonEmptyString(input.fullName) &&
    isNonEmptyString(input.email) &&
    isNonEmptyString(input.propertyType) &&
    isNonEmptyString(input.propertyAddress) &&
    isNonEmptyString(input.city) &&
    isNonEmptyString(input.postalCode) &&
    isNonEmptyString(input.verificationToken) &&
    typeof input.elevator === "boolean" &&
    isRequiredAllowedString(input.apartmentCondition, [
      "a_renover",
      "renove_20_ans",
      "renove_10_ans",
      "renove_moins_5_ans",
      "neuf",
    ]) &&
    (input.phone === undefined || typeof input.phone === "string") &&
    (input.timeline === undefined || typeof input.timeline === "string") &&
    (input.occupancyStatus === undefined || typeof input.occupancyStatus === "string") &&
    isOptionalNumber(input.livingArea) &&
    isOptionalNumber(input.rooms) &&
    (input.floor === undefined || typeof input.floor === "string") &&
    isOptionalNumber(input.buildingTotalFloors) &&
    isAllowedString(input.buildingAge, [
      "ancien_1950",
      "recent_1950_1970",
      "moderne_1980_today",
    ]) &&
    isAllowedString(input.seaView, ["none", "panoramic", "classic", "lateral"]) &&
    isOptionalBoolean(input.diagnosticsReady) &&
    isOptionalBoolean(input.diagnosticsSupportNeeded) &&
    isOptionalBoolean(input.syndicDocsReady) &&
    isOptionalBoolean(input.syndicSupportNeeded) &&
    (input.message === undefined || typeof input.message === "string")
  );
};

export const POST = async (request: Request) => {
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Corps JSON invalide." }, { status: 400 });
  }

  if (!validate(body)) {
    return NextResponse.json(
      { ok: false, message: "Donnees vendeur invalides." },
      { status: 422 }
    );
  }

  const input = body as EstimateAndCreateInput;

  try {
    await consumeSellerEmailVerificationToken(input.email, input.verificationToken);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "La verification email est invalide ou expiree.";
    return NextResponse.json({ ok: false, message }, { status: 401 });
  }

  let valuation;
  try {
    valuation = await computeLoupeValuation({
      addressLabel: input.propertyAddress,
      cityName: input.city,
      cityZipCode: input.postalCode,
      propertyType: input.propertyType,
      livingArea: input.livingArea,
      rooms: input.rooms,
      floor: input.floor,
      message: input.message,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Impossible de calculer l'estimation.";
    return NextResponse.json({ ok: false, message }, { status: 502 });
  }

  const metadata = {
    valuation: {
      provider: "loupe",
      synced_at: new Date().toISOString(),
      source: "direct_form",
      normalized: valuation,
    },
    property_details: {
      living_area: input.livingArea ?? valuation.livingSpaceArea ?? null,
      rooms: input.rooms ?? valuation.rooms ?? null,
      floor: input.floor ?? valuation.floor ?? null,
      building_total_floors: input.buildingTotalFloors ?? null,
      is_top_floor: computeIsTopFloor(input.floor, input.buildingTotalFloors),
      elevator: input.elevator ?? null,
      apartment_condition: input.apartmentCondition ?? null,
      building_age: input.buildingAge ?? null,
      sea_view: input.seaView ?? null,
      valuation_low: valuation.valuationPriceLow ?? null,
      valuation_high: valuation.valuationPriceHigh ?? null,
      updated_at: new Date().toISOString(),
    },
    verification: {
      email_verified_at: new Date().toISOString(),
    },
  };

  const created = await createSellerLead({
    fullName: input.fullName,
    email: input.email,
    phone: input.phone,
    propertyType: input.propertyType,
    propertyAddress: input.propertyAddress,
    city: input.city,
    postalCode: input.postalCode,
    timeline: input.timeline,
    occupancyStatus: input.occupancyStatus,
    diagnosticsReady: input.diagnosticsReady,
    diagnosticsSupportNeeded: input.diagnosticsSupportNeeded,
    syndicDocsReady: input.syndicDocsReady,
    syndicSupportNeeded: input.syndicSupportNeeded,
    message: input.message,
    source: "website_estimation_api_first",
    metadata,
  });

  if (created.status === "failed") {
    return NextResponse.json({ ok: false, message: created.reason }, { status: 500 });
  }

  try {
    await scoreSellerLead(created.sellerLeadId);
  } catch {
    // no-op
  }

  return NextResponse.json({
    ok: true,
    sellerLeadId: created.sellerLeadId,
    valuation,
  });
};
