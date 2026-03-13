import { NextResponse } from "next/server";
import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import { createManualProperty, listAdminProperties } from "@/services/properties/manual-property.service";
import type { PropertyBusinessType } from "@/types/domain/properties";

type CreatePropertyBody = {
  title?: string;
  description?: string;
  propertyType?: string;
  city?: string;
  postalCode?: string;
  businessType?: PropertyBusinessType;
  priceAmount?: number;
  livingArea?: number;
  rooms?: number;
  bedrooms?: number;
  floor?: number;
  hasTerrace?: boolean | null;
  hasElevator?: boolean | null;
  coverImageUrl?: string;
  isPublished?: boolean;
};

export async function GET(request: Request) {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "properties.view")) {
    return NextResponse.json({ ok: false, message: "Acces refuse." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const businessTypeParam = searchParams.get("businessType");
  const businessType =
    businessTypeParam === "sale" || businessTypeParam === "rental" ? businessTypeParam : undefined;

  try {
    const properties = await listAdminProperties({
      search: searchParams.get("search") ?? undefined,
      source: searchParams.get("source") ?? undefined,
      businessType,
    });
    return NextResponse.json({ ok: true, properties });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Chargement impossible." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "properties.manage")) {
    return NextResponse.json({ ok: false, message: "Acces refuse." }, { status: 403 });
  }

  let body: CreatePropertyBody | null = null;
  try {
    body = (await request.json()) as CreatePropertyBody;
  } catch {
    return NextResponse.json({ ok: false, message: "Corps JSON invalide." }, { status: 400 });
  }

  if (!body?.title?.trim() || !body.businessType) {
    return NextResponse.json({ ok: false, message: "Titre et businessType requis." }, { status: 422 });
  }

  try {
    const created = await createManualProperty({
      title: body.title,
      description: body.description,
      propertyType: body.propertyType,
      city: body.city,
      postalCode: body.postalCode,
      businessType: body.businessType,
      priceAmount: typeof body.priceAmount === "number" ? body.priceAmount : undefined,
      livingArea: typeof body.livingArea === "number" ? body.livingArea : undefined,
      rooms: typeof body.rooms === "number" ? body.rooms : undefined,
      bedrooms: typeof body.bedrooms === "number" ? body.bedrooms : undefined,
      floor: typeof body.floor === "number" ? body.floor : undefined,
      hasTerrace: body.hasTerrace ?? null,
      hasElevator: body.hasElevator ?? null,
      coverImageUrl: body.coverImageUrl,
      isPublished: Boolean(body.isPublished),
    });

    return NextResponse.json({ ok: true, propertyId: created.property.id });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Creation impossible." },
      { status: 500 }
    );
  }
}
