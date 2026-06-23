import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateIntegrationRequest } from "@/lib/integrations/auth";
import {
  buyerSearchCriteriaSchema,
  toBuyerSignupCriteria,
} from "@/lib/buyers/buyer-search-payload";
import { createBuyerSearchSignup } from "@/services/buyers/buyer-signup.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Inbound buyer lead from a partner Zap (e.g. a SweepBright contact or a lead
// form). Upserts by email through the same signup rail as /recherche/nouvelle
// (creates the lead + client project + search profile + runs matching), but
// does NOT send a portal magic-link email — these leads did not self-subscribe.
const bodySchema = z.object({
  firstName: z.string().trim().max(120).optional().default(""),
  lastName: z.string().trim().max(120).optional().default(""),
  email: z.string().trim().email().max(240),
  phone: z.string().trim().max(60).optional().nullable(),
  // RGPD consent must be explicit and traceable for any persisted contact.
  rgpdAccepted: z.literal(true),
  sourceUrl: z.string().trim().max(2048).optional().nullable(),
  criteria: buyerSearchCriteriaSchema
    .optional()
    .default({ businessType: "sale", cities: [], propertyTypes: [] }),
});

export const POST = async (request: Request) => {
  const auth = await authenticateIntegrationRequest(request, {
    requiredScope: "integrations:buyer_leads",
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
        message: "Données de lead acquéreur invalides.",
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 422 }
    );
  }

  const b = parsed.data;

  try {
    const signup = await createBuyerSearchSignup({
      firstName: b.firstName,
      lastName: b.lastName,
      email: b.email,
      phone: b.phone ?? null,
      rgpdAcceptedAt: new Date().toISOString(),
      sourceUrl: b.sourceUrl ?? "zapier_integration",
      origin: "zapier_integration",
      criteria: toBuyerSignupCriteria(b.criteria),
    });

    return NextResponse.json(
      {
        ok: true,
        buyerLeadId: signup.buyerLeadId,
        clientProjectId: signup.clientProjectId,
        buyerSearchProfileId: signup.buyerSearchProfileId,
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Échec de l'ingestion.";
    console.error("[integrations/buyer-leads]", message);
    return NextResponse.json(
      { ok: false, code: "ingest_failed", message },
      { status: 500 }
    );
  }
};
