import { NextResponse } from "next/server";
import { createSellerLead } from "@/services/sellers/seller-lead.service";
import { buildSellerPropertyDetails } from "@/services/sellers/seller-metadata";
import { computeLoupeValuation } from "@/services/valuation/loupe-valuation.service";
import { consumeSellerEmailVerificationToken } from "@/services/sellers/seller-email-verification.service";
import {
  checkIdempotency,
  persistIdempotencyResponse,
} from "@/lib/idempotency/request-idempotency";
import {
  SELLER_APARTMENT_CONDITIONS,
  SELLER_BUILDING_AGES,
  SELLER_LIVING_EXPOSURES,
  SELLER_PROPERTY_TYPES,
  SELLER_SEA_VIEWS,
} from "@/types/domain/sellers";
import type {
  SellerApiErrorResponse,
  SellerEstimateAndCreateDuplicateResponse,
  SellerEstimateAndCreateSuccessResponse,
} from "@/types/api/seller";

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
  terrace?: boolean;
  terraceArea?: number;
  balcony?: boolean;
  balconyArea?: number;
  livingExposure?:
    | "north"
    | "north_east"
    | "east"
    | "south_east"
    | "south"
    | "south_west"
    | "west"
    | "north_west";
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

const validate = (payload: unknown): payload is EstimateAndCreateInput => {
  if (!payload || typeof payload !== "object") return false;
  const input = payload as Record<string, unknown>;
  return (
    isNonEmptyString(input.fullName) &&
    isNonEmptyString(input.email) &&
    isRequiredAllowedString(input.propertyType, [...SELLER_PROPERTY_TYPES]) &&
    isNonEmptyString(input.propertyAddress) &&
    isNonEmptyString(input.city) &&
    isNonEmptyString(input.postalCode) &&
    isNonEmptyString(input.verificationToken) &&
    typeof input.elevator === "boolean" &&
    isRequiredAllowedString(input.apartmentCondition, [...SELLER_APARTMENT_CONDITIONS]) &&
    (input.phone === undefined || typeof input.phone === "string") &&
    (input.timeline === undefined || typeof input.timeline === "string") &&
    (input.occupancyStatus === undefined || typeof input.occupancyStatus === "string") &&
    isOptionalNumber(input.livingArea) &&
    isOptionalNumber(input.rooms) &&
    (input.floor === undefined || typeof input.floor === "string") &&
    isOptionalNumber(input.buildingTotalFloors) &&
    isOptionalBoolean(input.terrace) &&
    isOptionalNumber(input.terraceArea) &&
    isOptionalBoolean(input.balcony) &&
    isOptionalNumber(input.balconyArea) &&
    isAllowedString(input.livingExposure, [...SELLER_LIVING_EXPOSURES]) &&
    isAllowedString(input.buildingAge, [...SELLER_BUILDING_AGES]) &&
    isAllowedString(input.seaView, [...SELLER_SEA_VIEWS]) &&
    isOptionalBoolean(input.diagnosticsReady) &&
    isOptionalBoolean(input.diagnosticsSupportNeeded) &&
    isOptionalBoolean(input.syndicDocsReady) &&
    isOptionalBoolean(input.syndicSupportNeeded) &&
    (input.message === undefined || typeof input.message === "string")
  );
};

export const POST = async (request: Request) => {
  const idempotencyKey = request.headers.get("idempotency-key") ?? "";
  if (idempotencyKey.trim().length > 0) {
    try {
      const idempotency = await checkIdempotency("seller.estimate_and_create", idempotencyKey);
      if (idempotency.kind === "replay") {
        return NextResponse.json(idempotency.payload, {
          status: idempotency.statusCode,
          headers: { "x-idempotent-replay": "true" },
        });
      }
      if (idempotency.kind === "in_progress") {
        return NextResponse.json(
          {
            ok: false,
            message:
              "Une demande identique est deja en cours de traitement. Merci de patienter.",
          },
          { status: 409 }
        );
      }
    } catch {
      // no-op: idempotency is best-effort if table is not migrated yet
    }
  }

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
      terrace: input.terrace,
      terraceArea: input.terraceArea,
      balcony: input.balcony,
      balconyArea: input.balconyArea,
      livingExposure: input.livingExposure,
      projectTemporality: input.timeline,
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
    property_details: buildSellerPropertyDetails({
      livingArea: input.livingArea ?? valuation.livingSpaceArea,
      rooms: input.rooms ?? valuation.rooms,
      floor: input.floor ?? valuation.floor,
      buildingTotalFloors: input.buildingTotalFloors,
      terrace: input.terrace,
      terraceArea: input.terraceArea,
      balcony: input.balcony,
      balconyArea: input.balconyArea,
      livingExposure: input.livingExposure,
      projectTemporality: input.timeline,
      loupeSupportedInputs: {
        living_area: input.livingArea ?? valuation.livingSpaceArea ?? null,
        rooms: input.rooms ?? valuation.rooms ?? null,
        floor: input.floor ?? valuation.floor ?? null,
        property_type: input.propertyType ?? null,
      },
      loupeExtraInputs: {
        terrace: input.terrace ?? null,
        terrace_area: input.terraceArea ?? null,
        balcony: input.balcony ?? null,
        balcony_area: input.balconyArea ?? null,
        living_exposure: input.livingExposure ?? null,
        project_temporality: input.timeline ?? null,
      },
      elevator: input.elevator,
      apartmentCondition: input.apartmentCondition,
      buildingAge: input.buildingAge,
      seaView: input.seaView,
      valuationLow: valuation.valuationPriceLow,
      valuationHigh: valuation.valuationPriceHigh,
    }),
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
    const payload: SellerApiErrorResponse = { ok: false, message: created.reason };
    if (idempotencyKey.trim().length > 0) {
      try {
        await persistIdempotencyResponse("seller.estimate_and_create", idempotencyKey, 500, payload);
      } catch {
        // no-op
      }
    }
    return NextResponse.json(payload, { status: 500 });
  }

  if (created.status === "duplicate_blocked") {
    const payload: SellerEstimateAndCreateDuplicateResponse = {
      ok: false,
      code: "duplicate_blocked",
      message: created.reason,
      data: {
        createStatus: "duplicate_blocked",
        sellerLeadId: created.sellerLeadId,
      },
    };
    if (idempotencyKey.trim().length > 0) {
      try {
        await persistIdempotencyResponse("seller.estimate_and_create", idempotencyKey, 409, payload);
      } catch {
        // no-op
      }
    }
    return NextResponse.json(payload, { status: 409 });
  }

  const payload: SellerEstimateAndCreateSuccessResponse = {
    ok: true,
    data: {
      createStatus: created.status,
      sellerLeadId: created.sellerLeadId,
      valuation,
    },
  };

  if (idempotencyKey.trim().length > 0) {
    try {
      await persistIdempotencyResponse("seller.estimate_and_create", idempotencyKey, 200, payload);
    } catch {
      // no-op
    }
  }

  return NextResponse.json(payload);
};
