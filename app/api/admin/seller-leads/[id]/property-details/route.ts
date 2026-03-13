import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildSellerPropertyDetails, mergeSellerMetadata } from "@/services/sellers/seller-metadata";

type RouteParams = {
  params: Promise<{ id: string }>;
};

type PropertyDetailsInput = {
  livingArea?: number;
  rooms?: number;
  bedrooms?: number;
  floor?: string;
  buildingTotalFloors?: number;
  condition?: string;
  elevator?: boolean;
  apartmentCondition?: string;
  buildingAge?: string;
  seaView?: string;
  valuationLow?: number;
  valuationHigh?: number;
  notes?: string;
};

type SellerLeadsUpdater = {
  from: (
    table: "seller_leads"
  ) => {
    update: (values: { metadata: Record<string, unknown> }) => {
      eq: (column: "id", value: string) => Promise<{ error: { message: string } | null }>;
    };
  };
};

export const PATCH = async (request: Request, { params }: RouteParams) => {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  let body: PropertyDetailsInput | null = null;

  try {
    body = (await request.json()) as PropertyDetailsInput;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Corps JSON invalide." },
      { status: 400 }
    );
  }

  const { data: leadData, error: readError } = await supabaseAdmin
    .from("seller_leads")
    .select("id, metadata")
    .eq("id", id)
    .maybeSingle();

  if (readError) {
    return NextResponse.json({ ok: false, message: readError.message }, { status: 500 });
  }
  const lead = leadData as { id: string; metadata: Record<string, unknown> | null } | null;
  if (!lead) {
    return NextResponse.json({ ok: false, message: "Lead vendeur introuvable." }, { status: 404 });
  }

  const nextMetadata = mergeSellerMetadata(lead.metadata, {
    property_details: buildSellerPropertyDetails({
      livingArea: body?.livingArea,
      rooms: body?.rooms,
      bedrooms: body?.bedrooms,
      floor: body?.floor,
      buildingTotalFloors: body?.buildingTotalFloors,
      condition: body?.condition,
      elevator: body?.elevator,
      apartmentCondition: body?.apartmentCondition,
      buildingAge: body?.buildingAge,
      seaView: body?.seaView,
      valuationLow: body?.valuationLow,
      valuationHigh: body?.valuationHigh,
      notes: body?.notes,
    }),
  });
  const admin = supabaseAdmin as unknown as SellerLeadsUpdater;
  const { error: updateError } = await admin
    .from("seller_leads")
    .update({ metadata: nextMetadata })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ ok: false, message: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
};
