import { NextResponse } from "next/server";
import {
  createSellerLead,
  type SellerLeadInput,
} from "@/services/sellers/seller-lead.service";
import { createMerciVendeurAccessToken } from "@/lib/sellers/merci-vendeur-access";
import type {
  SellerApiErrorResponse,
  SellerLeadCreateDuplicateResponse,
  SellerLeadCreateSuccessResponse,
} from "@/types/api/seller";

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

const isOptionalString = (value: unknown): value is string | undefined => {
  return value === undefined || typeof value === "string";
};

const isOptionalBoolean = (value: unknown): value is boolean | undefined => {
  return value === undefined || typeof value === "boolean";
};

const isOptionalNumber = (value: unknown): value is number | undefined => {
  return value === undefined || (typeof value === "number" && Number.isFinite(value));
};

const validatePayload = (payload: unknown): payload is SellerLeadInput => {
  if (!payload || typeof payload !== "object") return false;
  const input = payload as Record<string, unknown>;

  return (
    isNonEmptyString(input.fullName) &&
    isNonEmptyString(input.email) &&
    isOptionalString(input.phone) &&
    isOptionalString(input.propertyType) &&
    isOptionalString(input.propertyAddress) &&
    isOptionalString(input.city) &&
    isOptionalString(input.postalCode) &&
    isOptionalString(input.timeline) &&
    isOptionalString(input.occupancyStatus) &&
    isOptionalNumber(input.estimatedPrice) &&
    isOptionalBoolean(input.diagnosticsReady) &&
    isOptionalBoolean(input.diagnosticsSupportNeeded) &&
    isOptionalBoolean(input.syndicDocsReady) &&
    isOptionalBoolean(input.syndicSupportNeeded) &&
    isOptionalString(input.message) &&
    isOptionalString(input.source)
  );
};

export const POST = async (request: Request) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Corps JSON invalide." },
      { status: 400 }
    );
  }

  if (!validatePayload(body)) {
    return NextResponse.json(
      { ok: false, message: "Données vendeur invalides." },
      { status: 422 }
    );
  }

  const result = await createSellerLead(body);
  if (result.status === "failed") {
    const payload: SellerApiErrorResponse = { ok: false, message: result.reason };
    return NextResponse.json(payload, { status: 500 });
  }

  if (result.status === "duplicate_blocked") {
    const payload: SellerLeadCreateDuplicateResponse = {
      ok: false,
      code: "duplicate_blocked",
      message: result.reason,
      data: {
        createStatus: "duplicate_blocked",
        auditLogged: result.auditLogged,
        duplicateDetected: true,
      },
    };
    return NextResponse.json(payload, { status: 409 });
  }

  const payload: SellerLeadCreateSuccessResponse = {
    ok: true,
    data: {
      createStatus: result.status,
      thankYouAccessToken: createMerciVendeurAccessToken(result.sellerLeadId),
      auditLogged: result.auditLogged,
      duplicateDetected: result.status === "reused",
    },
  };
  return NextResponse.json(
    payload,
    { status: result.status === "created" ? 201 : 200 }
  );
};
