import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateIntegrationRequest } from "@/lib/integrations/auth";
import {
  buyerSearchCriteriaSchema,
  toBuyerSignupCriteria,
} from "@/lib/buyers/buyer-search-payload";
import { upsertBuyerLeadFromIntegration } from "@/services/buyers/buyer-signup.service";
import { assigneeMetadata, resolveAssignee } from "@/lib/integrations/assignee";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// CRM sources (SweepBright, etc.) emit decimals for areas/budgets (e.g. a
// "min liveable area" of 73.87 m²). Our criteria schema stores integers, so we
// round these inbound numeric fields instead of rejecting the whole payload.
const INT_CRITERIA_FIELDS = [
  "budgetMin",
  "budgetMax",
  "roomsMin",
  "roomsMax",
  "bedroomsMin",
  "livingAreaMin",
  "livingAreaMax",
  "floorMin",
  "floorMax",
] as const;

const normalizeCriteria = (value: unknown): unknown => {
  if (value == null) return { businessType: "sale", cities: [], propertyTypes: [] };
  if (typeof value !== "object") return value;
  const c: Record<string, unknown> = { ...(value as Record<string, unknown>) };
  for (const key of INT_CRITERIA_FIELDS) {
    const n = c[key];
    if (typeof n === "number" && Number.isFinite(n)) {
      c[key] = Math.round(n);
    } else if (typeof n === "string" && n.trim() !== "" && Number.isFinite(Number(n))) {
      c[key] = Math.round(Number(n));
    }
  }
  return c;
};

// Inbound buyer lead from a partner Zap (e.g. a SweepBright contact or a lead
// form). Upserts by email through the same signup rail as /recherche/nouvelle
// (creates the lead + client project + search profile + runs matching), but
// does NOT send a portal magic-link email — these leads did not self-subscribe.
const bodySchema = z.object({
  // Stable id of the originating record (e.g. SweepBright lead id). Enables
  // idempotent upsert + identity merge on email with self-service leads.
  externalId: z.string().trim().min(1).max(255).optional(),
  firstName: z.string().trim().max(120).optional().default(""),
  lastName: z.string().trim().max(120).optional().default(""),
  email: z.string().trim().email().max(240),
  phone: z.string().trim().max(60).optional().nullable(),
  // RGPD consent must be explicit and traceable for any persisted contact.
  rgpdAccepted: z.literal(true),
  sourceUrl: z.string().trim().max(2048).optional().nullable(),
  // Free-form note (e.g. SweepBright internal note) + arbitrary extra fields
  // captured for later use; persisted in the lead metadata.
  notes: z.string().trim().max(5000).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  // Sillage collaborator the lead is assigned to (SweepBright assignee).
  // Resolved to an admin_profile by email → sweepbright_user_id → name.
  assigneeEmail: z.string().trim().max(240).optional().nullable(),
  assigneeExternalId: z.string().trim().max(120).optional().nullable(),
  assigneeName: z.string().trim().max(240).optional().nullable(),
  assigneePhone: z.string().trim().max(60).optional().nullable(),
  // The shared criteria schema already exposes every search field (rooms,
  // bedrooms, living area min/max, floor, terrace, elevator, budget, …).
  // Decimal areas/budgets are rounded to int before validation.
  criteria: z.preprocess(normalizeCriteria, buyerSearchCriteriaSchema),
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
    const initialFilters: Record<string, unknown> = { ...(b.metadata ?? {}) };
    if (b.notes) initialFilters.note = b.notes;

    const hints = {
      email: b.assigneeEmail,
      externalId: b.assigneeExternalId,
      name: b.assigneeName,
      phone: b.assigneePhone,
    };
    const resolved = await resolveAssignee(hints);
    const assignee = assigneeMetadata(hints, resolved);

    const result = await upsertBuyerLeadFromIntegration({
      firstName: b.firstName,
      lastName: b.lastName,
      email: b.email,
      phone: b.phone ?? null,
      rgpdAcceptedAt: new Date().toISOString(),
      sourceUrl: b.sourceUrl ?? "zapier_integration",
      origin: "zapier_integration",
      externalId: b.externalId ?? null,
      assignedAdminProfileId: resolved.adminProfileId,
      assignee: assignee ?? null,
      initialFilters:
        Object.keys(initialFilters).length > 0 ? initialFilters : undefined,
      criteria: toBuyerSignupCriteria(b.criteria),
    });

    return NextResponse.json(
      {
        ok: true,
        buyerLeadId: result.buyerLeadId,
        created: result.created,
        clientProjectId: result.clientProjectId,
        buyerSearchProfileId: result.buyerSearchProfileId,
        assignedAdminProfileId: resolved.adminProfileId,
        assigneeMatchedBy: resolved.matchedBy,
      },
      { status: result.created ? 201 : 200 }
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
