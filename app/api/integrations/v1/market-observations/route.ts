import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateIntegrationRequest } from "@/lib/integrations/auth";
import { isoDateString, moneyAmount } from "@/lib/integrations/parse";
import { recordMarketObservation } from "@/services/market/market-observation.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z
  .object({
    externalId: z.string().trim().min(1).max(255).optional(),
    city: z.string().trim().max(200).optional().nullable(),
    postalCode: z.string().trim().max(20).optional().nullable(),
    neighborhood: z.string().trim().max(200).optional().nullable(),
    zoneSlug: z.string().trim().max(200).optional().nullable(),
    propertyType: z.string().trim().max(120).optional().nullable(),
    businessType: z.enum(["sale", "rental"]).optional(),
    pricePerM2: moneyAmount.optional().nullable(),
    estimatedPrice: moneyAmount.optional().nullable(),
    livingAreaM2: z.coerce.number().finite().positive().optional().nullable(),
    valuationLow: moneyAmount.optional().nullable(),
    valuationHigh: moneyAmount.optional().nullable(),
    currency: z.string().trim().length(3).optional(),
    observedAt: isoDateString.optional().nullable(),
    // Nature of the data point: a listing asking price, an estimation/
    // valuation, or a realized sale. Stored in metadata for later filtering.
    kind: z.enum(["asking", "valuation", "sold"]).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .refine(
    (b) =>
      typeof b.pricePerM2 === "number" ||
      typeof b.estimatedPrice === "number",
    {
      message: "Fournir pricePerM2 ou estimatedPrice.",
      path: ["pricePerM2"],
    }
  );

export const POST = async (request: Request) => {
  const auth = await authenticateIntegrationRequest(request, {
    requiredScope: "integrations:market",
  });
  if (!auth.ok) return auth.response;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, code: "invalid_json", message: "Corps JSON invalide." },
      { status: 400 }
    );
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        code: "invalid_payload",
        message: "Données d'observation invalides.",
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 422 }
    );
  }

  const b = parsed.data;

  const metadata: Record<string, unknown> = { ...(b.metadata ?? {}) };
  if (b.kind) metadata.kind = b.kind;

  try {
    const result = await recordMarketObservation({
      source: "zapier",
      externalId: b.externalId ?? null,
      city: b.city ?? null,
      postalCode: b.postalCode ?? null,
      neighborhood: b.neighborhood ?? null,
      zoneSlug: b.zoneSlug ?? null,
      propertyType: b.propertyType ?? null,
      businessType: b.businessType,
      pricePerM2: b.pricePerM2 ?? null,
      estimatedPrice: b.estimatedPrice ?? null,
      livingAreaM2: b.livingAreaM2 ?? null,
      valuationLow: b.valuationLow ?? null,
      valuationHigh: b.valuationHigh ?? null,
      currency: b.currency,
      observedAt: b.observedAt ?? undefined,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    });

    if (!result) {
      return NextResponse.json(
        {
          ok: false,
          code: "insufficient_data",
          message:
            "Observation non enregistrée : prix/m² indisponible (fournir pricePerM2, ou estimatedPrice + livingAreaM2).",
        },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { ok: true, observationId: result.id },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Échec de l'ingestion.";
    console.error("[integrations/market-observations]", message);
    return NextResponse.json(
      { ok: false, code: "ingest_failed", message },
      { status: 500 }
    );
  }
};
