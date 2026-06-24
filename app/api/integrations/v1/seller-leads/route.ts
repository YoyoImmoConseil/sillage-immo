import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateIntegrationRequest } from "@/lib/integrations/auth";
import { moneyAmount } from "@/lib/integrations/parse";
import { upsertSellerLeadFromIntegration } from "@/services/sellers/seller-lead.service";
import { assigneeMetadata, resolveAssignee } from "@/lib/integrations/assignee";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Inbound seller lead / property owner from a partner Zap (SweepBright
// "Owner Created/Updated"). Upserts on external_id then email so a contact
// who self-created an estimation on the website merges with the SweepBright
// record instead of duplicating.
const bodySchema = z.object({
  externalId: z.string().trim().min(1).max(255).optional(),
  fullName: z.string().trim().max(240).optional().default(""),
  email: z.string().trim().email().max(240),
  phone: z.string().trim().max(60).optional().nullable(),
  propertyType: z.string().trim().max(120).optional().nullable(),
  propertyAddress: z.string().trim().max(500).optional().nullable(),
  city: z.string().trim().max(200).optional().nullable(),
  postalCode: z.string().trim().max(20).optional().nullable(),
  timeline: z.string().trim().max(120).optional().nullable(),
  occupancyStatus: z.string().trim().max(120).optional().nullable(),
  estimatedPrice: moneyAmount.optional().nullable(),
  message: z.string().trim().max(5000).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  // Sillage collaborator the lead is assigned to (SweepBright assignee).
  assigneeEmail: z.string().trim().max(240).optional().nullable(),
  assigneeExternalId: z.string().trim().max(120).optional().nullable(),
  assigneeName: z.string().trim().max(240).optional().nullable(),
  assigneePhone: z.string().trim().max(60).optional().nullable(),
});

export const POST = async (request: Request) => {
  const auth = await authenticateIntegrationRequest(request, {
    requiredScope: "integrations:seller_leads",
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
        message: "Données de lead vendeur invalides.",
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 422 }
    );
  }

  const b = parsed.data;
  // createSellerLead requires a name; fall back to the email local part.
  const fullName = b.fullName?.trim() || b.email.split("@")[0];

  try {
    const hints = {
      email: b.assigneeEmail,
      externalId: b.assigneeExternalId,
      name: b.assigneeName,
      phone: b.assigneePhone,
    };
    const resolved = await resolveAssignee(hints);
    const assignee = assigneeMetadata(hints, resolved);
    const metadata = { ...(b.metadata ?? {}) };
    if (assignee) metadata.assignee = assignee;

    const result = await upsertSellerLeadFromIntegration({
      externalId: b.externalId ?? null,
      fullName,
      email: b.email,
      phone: b.phone ?? undefined,
      propertyType: b.propertyType ?? undefined,
      propertyAddress: b.propertyAddress ?? undefined,
      city: b.city ?? undefined,
      postalCode: b.postalCode ?? undefined,
      timeline: b.timeline ?? undefined,
      occupancyStatus: b.occupancyStatus ?? undefined,
      estimatedPrice: b.estimatedPrice ?? undefined,
      message: b.message ?? undefined,
      source: "zapier",
      assignedAdminProfileId: resolved.adminProfileId,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    });

    return NextResponse.json(
      {
        ok: true,
        sellerLeadId: result.sellerLeadId,
        created: result.created,
        merged: result.merged,
        assignedAdminProfileId: resolved.adminProfileId,
        assigneeMatchedBy: resolved.matchedBy,
      },
      { status: result.created ? 201 : 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Échec de l'ingestion.";
    console.error("[integrations/seller-leads]", message);
    return NextResponse.json(
      { ok: false, code: "ingest_failed", message },
      { status: 500 }
    );
  }
};
