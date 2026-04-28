import { NextResponse } from "next/server";
import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import { isAdminAvailabilityStatus } from "@/lib/properties/canonical-types";
import { updatePropertyAvailabilityStatus } from "@/services/properties/availability-status.service";

type UpdateStatusBody = {
  availabilityStatus?: string;
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "properties.manage")) {
    return NextResponse.json({ ok: false, message: "Acces refuse." }, { status: 403 });
  }

  let body: UpdateStatusBody | null = null;
  try {
    body = (await request.json()) as UpdateStatusBody;
  } catch {
    return NextResponse.json({ ok: false, message: "Corps JSON invalide." }, { status: 400 });
  }

  const candidate = (body?.availabilityStatus ?? "").trim().toLowerCase();
  if (!isAdminAvailabilityStatus(candidate)) {
    return NextResponse.json(
      { ok: false, message: "Statut inconnu." },
      { status: 422 }
    );
  }

  const { id } = await params;
  try {
    const result = await updatePropertyAvailabilityStatus({
      propertyId: id,
      availabilityStatus: candidate,
    });

    return NextResponse.json({
      ok: true,
      availabilityStatus: result.property.availability_status,
      isPublished: result.listing?.is_published ?? false,
      publicationStatus: result.listing?.publication_status ?? "inactive",
      isPublic: result.isPublic,
      previousAvailabilityStatus: result.previousAvailabilityStatus,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Mise a jour impossible." },
      { status: 500 }
    );
  }
}
