import { NextResponse } from "next/server";
import { getClientSpacePageContext } from "@/lib/client-space/auth";
import { canClientAccessProperty } from "@/services/clients/client-project.service";
import {
  getPropertyDocumentById,
  getSignedDownloadUrlForDocument,
} from "@/services/properties/property-documents.service";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ propertyId: string; documentId: string }>;
  }
) {
  const session = await getClientSpacePageContext();
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Authentification requise." },
      { status: 401 }
    );
  }
  const { propertyId, documentId } = await params;

  try {
    const allowed = await canClientAccessProperty(session.clientProfile.id, propertyId);
    if (!allowed) {
      return NextResponse.json({ ok: false, message: "Bien introuvable." }, { status: 404 });
    }
    const existing = await getPropertyDocumentById(documentId);
    if (!existing || existing.propertyId !== propertyId) {
      return NextResponse.json(
        { ok: false, message: "Document introuvable." },
        { status: 404 }
      );
    }
    const { url } = await getSignedDownloadUrlForDocument(documentId, {
      kind: "client",
      clientProfileId: session.clientProfile.id,
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
