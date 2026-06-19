import { NextResponse } from "next/server";
import { getClientSpacePageContext } from "@/lib/client-space/auth";
import { canAccessPresentedProperty } from "@/services/buyers/buyer-presented-property.service";
import {
  getPresentedDocumentById,
  getSignedDownloadUrlForPresentedDocument,
} from "@/services/buyers/buyer-presented-document.service";

type RouteParams = { params: Promise<{ presentedId: string; docId: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await getClientSpacePageContext();
  if (!session) {
    return NextResponse.json({ ok: false, message: "Authentification requise." }, { status: 401 });
  }
  const { presentedId, docId } = await params;

  try {
    const allowed = await canAccessPresentedProperty(session.clientProfile.id, presentedId);
    if (!allowed) {
      return NextResponse.json({ ok: false, message: "Bien introuvable." }, { status: 404 });
    }
    const existing = await getPresentedDocumentById(docId);
    if (!existing || existing.presentedPropertyId !== presentedId) {
      return NextResponse.json({ ok: false, message: "Document introuvable." }, { status: 404 });
    }
    const { url } = await getSignedDownloadUrlForPresentedDocument(docId, {
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
