import { NextResponse } from "next/server";
import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import {
  VitrineValidationError,
  getVitrineEditorial,
  saveVitrineEditorial,
} from "@/services/properties/vitrine.service";

type SaveVitrineBody = {
  highlights?: unknown;
  quartier?: unknown;
  mainMediaRef?: unknown;
  cardMediaRef?: unknown;
};

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "properties.view")) {
    return NextResponse.json({ ok: false, message: "Acces refuse." }, { status: 403 });
  }
  const { id } = await params;
  try {
    const editorial = await getVitrineEditorial(id);
    if (!editorial) {
      return NextResponse.json({ ok: false, message: "Bien introuvable." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, ...editorial });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Lecture impossible." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "properties.manage")) {
    return NextResponse.json({ ok: false, message: "Acces refuse." }, { status: 403 });
  }

  let body: SaveVitrineBody | null = null;
  try {
    body = (await request.json()) as SaveVitrineBody;
  } catch {
    return NextResponse.json({ ok: false, message: "Corps JSON invalide." }, { status: 400 });
  }

  const { id } = await params;
  try {
    const editorial = await saveVitrineEditorial({
      propertyId: id,
      highlights: body?.highlights,
      quartier: body?.quartier,
      mainMediaRef: body?.mainMediaRef,
      cardMediaRef: body?.cardMediaRef,
      updatedBy: context.profile?.email ?? null,
    });
    return NextResponse.json({ ok: true, ...editorial });
  } catch (error) {
    if (error instanceof VitrineValidationError) {
      return NextResponse.json(
        { ok: false, message: error.message, errors: error.errors },
        { status: 422 }
      );
    }
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Enregistrement impossible." },
      { status: 500 }
    );
  }
}
