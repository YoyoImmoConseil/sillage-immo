import { NextResponse } from "next/server";
import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import { updateBuyerLeadForAdmin } from "@/services/buyers/buyer-lead.service";
import type { PropertyBusinessType } from "@/types/domain/properties";

type BuyerLeadUpdateBody = {
  fullName?: string;
  email?: string;
  phone?: string;
  status?: string;
  timeline?: string;
  financingStatus?: string;
  preferredContactChannel?: string;
  notes?: string;
  businessType?: PropertyBusinessType;
  locationText?: string;
  cities?: string;
  propertyTypes?: string;
  budgetMin?: number;
  budgetMax?: number;
  roomsMin?: number;
  roomsMax?: number;
  bedroomsMin?: number;
  livingAreaMin?: number;
  livingAreaMax?: number;
  floorMin?: number;
  floorMax?: number;
  requiresTerrace?: boolean | null;
  requiresElevator?: boolean | null;
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "leads.buyers.manage")) {
    return NextResponse.json({ ok: false, message: "Acces refuse." }, { status: 403 });
  }

  let body: BuyerLeadUpdateBody | null = null;
  try {
    body = (await request.json()) as BuyerLeadUpdateBody;
  } catch {
    return NextResponse.json({ ok: false, message: "Corps JSON invalide." }, { status: 400 });
  }

  const { id } = await params;
  if (!body?.fullName?.trim() || !body.email?.trim() || !body.status || !body.businessType) {
    return NextResponse.json(
      { ok: false, message: "Nom, email, statut et type de recherche sont requis." },
      { status: 422 }
    );
  }

  try {
    await updateBuyerLeadForAdmin({
      buyerLeadId: id,
      fullName: body.fullName,
      email: body.email,
      phone: body.phone,
      status: body.status,
      timeline: body.timeline,
      financingStatus: body.financingStatus,
      preferredContactChannel: body.preferredContactChannel,
      notes: body.notes,
      businessType: body.businessType,
      locationText: body.locationText,
      cities: body.cities ?? "",
      propertyTypes: body.propertyTypes ?? "",
      budgetMin: typeof body.budgetMin === "number" ? body.budgetMin : undefined,
      budgetMax: typeof body.budgetMax === "number" ? body.budgetMax : undefined,
      roomsMin: typeof body.roomsMin === "number" ? body.roomsMin : undefined,
      roomsMax: typeof body.roomsMax === "number" ? body.roomsMax : undefined,
      bedroomsMin: typeof body.bedroomsMin === "number" ? body.bedroomsMin : undefined,
      livingAreaMin: typeof body.livingAreaMin === "number" ? body.livingAreaMin : undefined,
      livingAreaMax: typeof body.livingAreaMax === "number" ? body.livingAreaMax : undefined,
      floorMin: typeof body.floorMin === "number" ? body.floorMin : undefined,
      floorMax: typeof body.floorMax === "number" ? body.floorMax : undefined,
      requiresTerrace: body.requiresTerrace ?? null,
      requiresElevator: body.requiresElevator ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Mise a jour impossible.",
      },
      { status: 500 }
    );
  }
}
