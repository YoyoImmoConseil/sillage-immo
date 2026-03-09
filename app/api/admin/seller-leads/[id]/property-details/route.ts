import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

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

const toNumberOrNull = (value: unknown) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
};

const toStringOrNull = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const parseFloorNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value !== "string") return null;
  const match = value.match(/\d+/);
  if (!match) return null;
  const parsed = Number.parseInt(match[0], 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const computeIsTopFloor = (floorRaw: unknown, totalFloorsRaw: unknown) => {
  const floor = parseFloorNumber(floorRaw);
  const totalFloors =
    typeof totalFloorsRaw === "number" && Number.isFinite(totalFloorsRaw)
      ? Math.trunc(totalFloorsRaw)
      : null;
  if (floor === null || totalFloors === null || floor < 0 || totalFloors < 0) return null;
  if (floor > totalFloors) return null;
  return floor === totalFloors;
};

export const PATCH = async (request: Request, { params }: RouteParams) => {
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

  const admin = supabaseAdmin as any;
  const { data: leadData, error: readError } = await admin
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

  const currentMetadata =
    lead.metadata && typeof lead.metadata === "object"
      ? (lead.metadata as Record<string, unknown>)
      : {};

  const nextMetadata: Record<string, unknown> = {
    ...currentMetadata,
    property_details: {
      living_area: toNumberOrNull(body?.livingArea),
      rooms: toNumberOrNull(body?.rooms),
      bedrooms: toNumberOrNull(body?.bedrooms),
      floor: toStringOrNull(body?.floor),
      building_total_floors: toNumberOrNull(body?.buildingTotalFloors),
      is_top_floor: computeIsTopFloor(body?.floor, body?.buildingTotalFloors),
      condition: toStringOrNull(body?.condition),
      elevator: typeof body?.elevator === "boolean" ? body.elevator : null,
      apartment_condition: toStringOrNull(body?.apartmentCondition),
      building_age: toStringOrNull(body?.buildingAge),
      sea_view: toStringOrNull(body?.seaView),
      valuation_low: toNumberOrNull(body?.valuationLow),
      valuation_high: toNumberOrNull(body?.valuationHigh),
      notes: toStringOrNull(body?.notes),
      updated_at: new Date().toISOString(),
    },
  };
  const { error: updateError } = await admin
    .from("seller_leads")
    .update({ metadata: nextMetadata })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ ok: false, message: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
};
