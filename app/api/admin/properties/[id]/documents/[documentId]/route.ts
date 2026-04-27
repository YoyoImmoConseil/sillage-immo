import { NextResponse } from "next/server";
import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import {
  getPropertyDocumentById,
  softDeletePropertyDocument,
} from "@/services/properties/property-documents.service";

export async function DELETE(
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
  try {
    const existing = await getPropertyDocumentById(documentId);
    if (!existing || existing.propertyId !== propertyId) {
      return NextResponse.json(
        { ok: false, message: "Document introuvable." },
        { status: 404 }
      );
    }
    await softDeletePropertyDocument(documentId, {
      kind: "admin",
      adminProfileId,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Suppression impossible.",
      },
      { status: 500 }
    );
  }
}
