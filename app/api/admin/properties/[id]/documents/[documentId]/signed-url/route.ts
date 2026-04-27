import { NextResponse } from "next/server";
import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import {
  getPropertyDocumentById,
  getSignedDownloadUrlForDocument,
} from "@/services/properties/property-documents.service";

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string; documentId: string }>;
  }
) {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "properties.view")) {
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
    const { url } = await getSignedDownloadUrlForDocument(documentId, {
      kind: "admin",
      adminProfileId,
    });
    return NextResponse.json({ ok: true, url });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Lien indisponible.",
      },
      { status: 500 }
    );
  }
}
