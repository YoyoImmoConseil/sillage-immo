import { NextResponse } from "next/server";
import { z } from "zod";
import { getClientSpacePageContext } from "@/lib/client-space/auth";
import {
  archiveBuyerSearch,
  updateBuyerSearch,
} from "@/services/buyers/buyer-portal.service";

const patchSchema = z.object({
  businessType: z.enum(["sale", "rental"]).optional(),
  locationText: z.string().max(500).nullable().optional(),
  cities: z.array(z.string().min(1)).max(20).optional(),
  propertyTypes: z.array(z.string().min(1)).max(20).optional(),
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
  zonePolygon: z
    .array(
      z.tuple([
        z.number().min(-90).max(90),
        z.number().min(-180).max(180),
      ])
    )
    .min(3)
    .max(200)
    .nullable()
    .optional(),
});

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

export const PATCH = async (request: Request, context: RouteContext) => {
  const session = await getClientSpacePageContext();
  if (!session) {
    return NextResponse.json({ ok: false, message: "Authentification requise." }, { status: 401 });
  }

  const { projectId } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Corps JSON invalide." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Critères invalides.",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 422 }
    );
  }

  try {
    const updated = await updateBuyerSearch({
      clientProfileId: session.clientProfile.id,
      clientProjectId: projectId,
      patch: parsed.data,
    });

    if (!updated) {
      return NextResponse.json(
        { ok: false, message: "Recherche introuvable." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "update_failed";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
};

export const DELETE = async (_request: Request, context: RouteContext) => {
  const session = await getClientSpacePageContext();
  if (!session) {
    return NextResponse.json({ ok: false, message: "Authentification requise." }, { status: 401 });
  }

  const { projectId } = await context.params;
  try {
    const ok = await archiveBuyerSearch({
      clientProfileId: session.clientProfile.id,
      clientProjectId: projectId,
    });

    if (!ok) {
      return NextResponse.json(
        { ok: false, message: "Recherche introuvable." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "archive_failed";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
};
