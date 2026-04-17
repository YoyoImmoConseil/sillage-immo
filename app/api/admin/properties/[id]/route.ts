import type { AppLocale } from "@/lib/i18n/config";
import { NextResponse } from "next/server";
import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import { updateManualProperty } from "@/services/properties/manual-property.service";
import type { PropertyBusinessType } from "@/types/domain/properties";

type UpdatePropertyBody = {
  title?: string;
  description?: string;
  titleTranslations?: Partial<Record<AppLocale, string | null | undefined>>;
  descriptionTranslations?: Partial<Record<AppLocale, string | null | undefined>>;
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "properties.manage")) {
    return NextResponse.json({ ok: false, message: "Acces refuse." }, { status: 403 });
  }

  let body: UpdatePropertyBody | null = null;
  try {
    body = (await request.json()) as UpdatePropertyBody;
  } catch {
    return NextResponse.json({ ok: false, message: "Corps JSON invalide." }, { status: 400 });
  }

  const { id } = await params;
  if (!body?.title?.trim() || !body.businessType) {
    return NextResponse.json({ ok: false, message: "Titre et businessType requis." }, { status: 422 });
  }

  try {
    await updateManualProperty({
      propertyId: id,
      title: body.title,
      description: body.description,
      titleTranslations: body.titleTranslations,
      descriptionTranslations: body.descriptionTranslations,
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

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Mise a jour impossible." },
      { status: 500 }
    );
  }
}
