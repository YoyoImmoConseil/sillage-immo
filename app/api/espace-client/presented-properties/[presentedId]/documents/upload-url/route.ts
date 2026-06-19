import { NextResponse } from "next/server";
import { getClientSpacePageContext } from "@/lib/client-space/auth";
import { canAccessPresentedProperty } from "@/services/buyers/buyer-presented-property.service";
import {
  createSignedUploadUrlForPresentedDocument,
  PRESENTED_DOCUMENT_MAX_BYTES,
  PRESENTED_DOCUMENT_PDF_MIME,
} from "@/services/buyers/buyer-presented-document.service";

type RouteParams = { params: Promise<{ presentedId: string }> };

type Body = {
  fileName?: string;
  sizeBytes?: number;
  mimeType?: string;
};

export async function POST(request: Request, { params }: RouteParams) {
  const session = await getClientSpacePageContext();
  if (!session) {
    return NextResponse.json({ ok: false, message: "Authentification requise." }, { status: 401 });
  }

  const { presentedId } = await params;
  const allowed = await canAccessPresentedProperty(session.clientProfile.id, presentedId);
  if (!allowed) {
    return NextResponse.json({ ok: false, message: "Bien introuvable." }, { status: 404 });
  }

  let body: Body | null = null;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, message: "Corps JSON invalide." }, { status: 400 });
  }

  const fileName = (body?.fileName ?? "").trim();
  const sizeBytes = typeof body?.sizeBytes === "number" ? body.sizeBytes : NaN;
  const mimeType = body?.mimeType?.trim() || PRESENTED_DOCUMENT_PDF_MIME;

  if (!fileName) {
    return NextResponse.json({ ok: false, message: "Nom de fichier requis." }, { status: 422 });
  }
  if (mimeType !== PRESENTED_DOCUMENT_PDF_MIME) {
    return NextResponse.json(
      { ok: false, message: "Le fichier doit etre au format PDF." },
      { status: 422 }
    );
  }
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return NextResponse.json({ ok: false, message: "Taille de fichier invalide." }, { status: 422 });
  }
  if (sizeBytes > PRESENTED_DOCUMENT_MAX_BYTES) {
    return NextResponse.json({ ok: false, message: "Le fichier depasse 25 Mo." }, { status: 413 });
  }

  try {
    const signed = await createSignedUploadUrlForPresentedDocument({
      presentedPropertyId: presentedId,
      fileName,
      sizeBytes,
      mimeType,
    });
    return NextResponse.json({ ok: true, ...signed });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "URL d'upload indisponible.",
      },
      { status: 500 }
    );
  }
}
