import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, extractClientIp } from "@/lib/rate-limit/in-memory";
import { isClientPortalDirectAccessEnabled } from "@/lib/client-space/direct-access";
import { sendClientPortalMagicLink } from "@/services/clients/client-portal-magic-link.service";
import { createBuyerSearchSignup } from "@/services/buyers/buyer-signup.service";

const zonePolygonSchema = z
  .array(
    z
      .tuple([
        z.number().min(-90).max(90),
        z.number().min(-180).max(180),
      ])
  )
  .min(3)
  .max(200)
  .nullable()
  .optional();

const criteriaSchema = z.object({
  businessType: z.enum(["sale", "rental"]),
  cities: z.array(z.string().min(1)).max(20).default([]),
  propertyTypes: z.array(z.string().min(1)).max(20).default([]),
  locationText: z.string().max(500).optional().nullable(),
  budgetMin: z.number().int().nonnegative().nullable().optional(),
  budgetMax: z.number().int().nonnegative().nullable().optional(),
  roomsMin: z.number().int().min(0).max(50).nullable().optional(),
  roomsMax: z.number().int().min(0).max(50).nullable().optional(),
  bedroomsMin: z.number().int().min(0).max(50).nullable().optional(),
  livingAreaMin: z.number().int().min(0).max(10000).nullable().optional(),
  livingAreaMax: z.number().int().min(0).max(10000).nullable().optional(),
  floorMin: z.number().int().min(-5).max(200).nullable().optional(),
  floorMax: z.number().int().min(-5).max(200).nullable().optional(),
  requiresTerrace: z.boolean().nullable().optional(),
  requiresElevator: z.boolean().nullable().optional(),
  zonePolygon: zonePolygonSchema,
});

const payloadSchema = z.object({
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(240),
  phone: z.string().trim().max(60).optional().nullable(),
  rgpdAccepted: z.literal(true),
  sourceUrl: z.string().trim().max(2048).optional().nullable(),
  initialFilters: z.record(z.string(), z.unknown()).optional(),
  criteria: criteriaSchema,
});

const RATE_LIMIT = 6;
const RATE_WINDOW_MS = 10 * 60 * 1000;

export const POST = async (request: Request) => {
  const requestUrl = new URL(request.url);
  const ip = extractClientIp(request.headers);

  const rate = checkRateLimit({
    key: `buyer-searches:${ip}`,
    limit: RATE_LIMIT,
    windowMs: RATE_WINDOW_MS,
  });
  if (!rate.ok) {
    return NextResponse.json(
      {
        ok: false,
        code: "rate_limited",
        message: "Trop de tentatives. Merci de reessayer dans quelques minutes.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000))),
        },
      }
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, code: "invalid_json", message: "Corps JSON invalide." },
      { status: 400 }
    );
  }

  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        code: "invalid_payload",
        message: "Donnees de recherche invalides.",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 422 }
    );
  }

  const input = parsed.data;

  try {
    const signup = await createBuyerSearchSignup({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone ?? null,
      rgpdAcceptedAt: new Date().toISOString(),
      sourceUrl: input.sourceUrl ?? null,
      initialFilters: input.initialFilters,
      criteria: {
        businessType: input.criteria.businessType,
        cities: input.criteria.cities,
        propertyTypes: input.criteria.propertyTypes,
        locationText: input.criteria.locationText ?? null,
        budgetMin: input.criteria.budgetMin ?? null,
        budgetMax: input.criteria.budgetMax ?? null,
        roomsMin: input.criteria.roomsMin ?? null,
        roomsMax: input.criteria.roomsMax ?? null,
        bedroomsMin: input.criteria.bedroomsMin ?? null,
        livingAreaMin: input.criteria.livingAreaMin ?? null,
        livingAreaMax: input.criteria.livingAreaMax ?? null,
        floorMin: input.criteria.floorMin ?? null,
        floorMax: input.criteria.floorMax ?? null,
        requiresTerrace: input.criteria.requiresTerrace ?? null,
        requiresElevator: input.criteria.requiresElevator ?? null,
        zonePolygon: input.criteria.zonePolygon ?? null,
      },
    });

    const email = input.email.trim().toLowerCase();
    const nextPath = `/espace-client/recherches/${signup.clientProjectId}`;

    try {
      const sent = await sendClientPortalMagicLink({
        email,
        nextPath,
        inviteToken: signup.invitationToken,
        origin: requestUrl.origin,
        baseUrlOverride: isClientPortalDirectAccessEnabled(requestUrl.host)
          ? requestUrl.origin
          : undefined,
      });

      if (!sent.ok) {
        return NextResponse.json(
          {
            ok: true,
            code: "signup_created_email_failed",
            message:
              "Recherche enregistree mais l'envoi de l'email de verification a echoue. Vous pouvez redemander un lien depuis /espace-client/login.",
            data: {
              clientProjectId: signup.clientProjectId,
              buyerSearchProfileId: signup.buyerSearchProfileId,
              emailFailureCode: sent.code,
            },
          },
          { status: 201 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        {
          ok: true,
          code: "signup_created_email_failed",
          message:
            "Recherche enregistree mais l'envoi de l'email de verification a echoue. Vous pouvez redemander un lien depuis /espace-client/login.",
          data: {
            clientProjectId: signup.clientProjectId,
            buyerSearchProfileId: signup.buyerSearchProfileId,
            emailFailureDetail:
              error instanceof Error ? error.message : "unknown_error",
          },
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          clientProjectId: signup.clientProjectId,
          buyerSearchProfileId: signup.buyerSearchProfileId,
          email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue.";
    return NextResponse.json(
      {
        ok: false,
        code: "signup_failed",
        message: `Impossible d'enregistrer la recherche : ${message}`,
      },
      { status: 500 }
    );
  }
};
