import { NextResponse } from "next/server";
import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import {
  getPropertyDocumentById,
  setPropertyDocumentVisibility,
  type PropertyDocumentVisibility,
} from "@/services/properties/property-documents.service";

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string; documentId: string }>;
  }
) {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "properties.manage")) {
    return NextResponse.json({ ok: false, message: "Acces refuse." }, { status: 403 });
  }
  const adminProfileId = context.profile?.id;
  if (!adminProfileId) {
    return NextResponse.json({ ok: false, message: "Profil admin requis." }, { status: 400 });
  }

  const { id: propertyId, documentId } = await params;

  let body: { visibility?: PropertyDocumentVisibility | string } = {};
  try {
    body = (await request.json()) as { visibility?: PropertyDocumentVisibility | string };
  } catch {
    return NextResponse.json({ ok: false, message: "Corps JSON invalide." }, { status: 400 });
  }
  if (body.visibility !== "admin_only" && body.visibility !== "admin_and_client") {
    return NextResponse.json(
      { ok: false, message: "Visibilité invalide." },
      { status: 422 }
    );
  }

  try {
    const existing = await getPropertyDocumentById(documentId);
    if (!existing || existing.propertyId !== propertyId) {
      return NextResponse.json(
        { ok: false, message: "Document introuvable." },
        { status: 404 }
      );
    }
    const updated = await setPropertyDocumentVisibility(
      documentId,
      body.visibility,
      adminProfileId
    );
    return NextResponse.json({ ok: true, document: updated });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Mise à jour impossible.",
      },
      { status: 500 }
    );
  }
}
