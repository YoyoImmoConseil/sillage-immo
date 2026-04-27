import { NextResponse } from "next/server";
import { getClientSpacePageContext } from "@/lib/client-space/auth";
import { canClientAccessProperty } from "@/services/clients/client-project.service";
import {
  listPropertyDocumentsForClient,
  PROPERTY_DOCUMENT_MAX_BYTES,
  resolveDocumentUploaders,
  uploadClientPropertyDocument,
} from "@/services/properties/property-documents.service";

const MAX_LABEL_LENGTH = 200;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  const session = await getClientSpacePageContext();
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Authentification requise." },
      { status: 401 }
    );
  }
  const { propertyId } = await params;

  try {
    const allowed = await canClientAccessProperty(session.clientProfile.id, propertyId);
    if (!allowed) {
      return NextResponse.json({ ok: false, message: "Bien introuvable." }, { status: 404 });
    }
    const documents = await listPropertyDocumentsForClient(
      propertyId,
      session.clientProfile.id
    );
    const uploaders = await resolveDocumentUploaders(documents);
    return NextResponse.json({ ok: true, documents, uploaders });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Chargement impossible.",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  const session = await getClientSpacePageContext();
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Authentification requise." },
      { status: 401 }
    );
  }
  const { propertyId } = await params;

  try {
    const allowed = await canClientAccessProperty(session.clientProfile.id, propertyId);
    if (!allowed) {
      return NextResponse.json({ ok: false, message: "Bien introuvable." }, { status: 404 });
    }

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { ok: false, message: "Type de requête non supporté." },
        { status: 415 }
      );
    }
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, message: "Fichier PDF requis." },
        { status: 422 }
      );
    }
    if (file.size > PROPERTY_DOCUMENT_MAX_BYTES) {
      return NextResponse.json(
        { ok: false, message: "Fichier supérieur à 25 Mo." },
        { status: 413 }
      );
    }
    const labelValue = form.get("label");
    const label = typeof labelValue === "string" ? labelValue : undefined;
    if (label && label.length > MAX_LABEL_LENGTH) {
      return NextResponse.json(
        { ok: false, message: "Libellé trop long." },
        { status: 422 }
      );
    }

    const document = await uploadClientPropertyDocument({
      propertyId,
      clientProfileId: session.clientProfile.id,
      file,
      label,
    });
    return NextResponse.json({ ok: true, document });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Téléversement impossible.",
      },
      { status: 500 }
    );
  }
}
