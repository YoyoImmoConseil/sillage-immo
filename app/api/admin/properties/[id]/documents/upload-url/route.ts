import { NextResponse } from "next/server";
import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import {
  createSignedUploadUrlForPropertyDocument,
  PROPERTY_DOCUMENT_MAX_BYTES,
  PROPERTY_DOCUMENT_PDF_MIME,
} from "@/services/properties/property-documents.service";

type Body = {
  fileName?: string;
  sizeBytes?: number;
  mimeType?: string;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "properties.manage")) {
    return NextResponse.json({ ok: false, message: "Acces refuse." }, { status: 403 });
  }
  const adminProfileId = context.profile?.id;
  if (!adminProfileId) {
    return NextResponse.json({ ok: false, message: "Profil admin requis." }, { status: 400 });
  }

  let body: Body | null = null;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, message: "Corps JSON invalide." }, { status: 400 });
  }

  const fileName = (body?.fileName ?? "").trim();
  const sizeBytes = typeof body?.sizeBytes === "number" ? body.sizeBytes : NaN;
  const mimeType = body?.mimeType?.trim() || PROPERTY_DOCUMENT_PDF_MIME;

  if (!fileName) {
    return NextResponse.json(
      { ok: false, message: "Nom de fichier requis." },
      { status: 422 }
    );
  }
  if (mimeType !== PROPERTY_DOCUMENT_PDF_MIME) {
    return NextResponse.json(
      { ok: false, message: "Le fichier doit etre au format PDF." },
      { status: 422 }
    );
  }
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return NextResponse.json(
      { ok: false, message: "Taille de fichier invalide." },
      { status: 422 }
    );
  }
  if (sizeBytes > PROPERTY_DOCUMENT_MAX_BYTES) {
    return NextResponse.json(
      { ok: false, message: "Le fichier depasse 25 Mo." },
      { status: 413 }
    );
  }

  const { id: propertyId } = await params;
  try {
    const signed = await createSignedUploadUrlForPropertyDocument({
      propertyId,
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
