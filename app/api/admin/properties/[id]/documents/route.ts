import { NextResponse } from "next/server";
import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import {
  addAdminPropertyDocumentLink,
  listPropertyDocumentsForAdmin,
  PROPERTY_DOCUMENT_MAX_BYTES,
  resolveDocumentUploaders,
  uploadAdminPropertyDocument,
  type PropertyDocumentVisibility,
} from "@/services/properties/property-documents.service";

const MAX_LABEL_LENGTH = 200;

const parseVisibility = (value: unknown): PropertyDocumentVisibility => {
  return value === "admin_only" ? "admin_only" : "admin_and_client";
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "properties.view")) {
    return NextResponse.json({ ok: false, message: "Acces refuse." }, { status: 403 });
  }
  const { id: propertyId } = await params;
  try {
    const documents = await listPropertyDocumentsForAdmin(propertyId);
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

  const { id: propertyId } = await params;
  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as {
        kind?: "link";
        label?: string;
        url?: string;
        visibility?: PropertyDocumentVisibility | string;
      };
      if (body.kind !== "link") {
        return NextResponse.json(
          { ok: false, message: "Type de document invalide." },
          { status: 422 }
        );
      }
      if (!body.label || !body.url) {
        return NextResponse.json(
          { ok: false, message: "Libellé et URL requis." },
          { status: 422 }
        );
      }
      if (body.label.length > MAX_LABEL_LENGTH) {
        return NextResponse.json(
          { ok: false, message: "Libellé trop long." },
          { status: 422 }
        );
      }
      const document = await addAdminPropertyDocumentLink({
        propertyId,
        adminProfileId,
        label: body.label,
        url: body.url,
        visibility: parseVisibility(body.visibility),
      });
      return NextResponse.json({ ok: true, document });
    }

    if (contentType.includes("multipart/form-data")) {
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
      const visibility = parseVisibility(form.get("visibility"));
      const labelValue = form.get("label");
      const label = typeof labelValue === "string" ? labelValue : undefined;
      if (label && label.length > MAX_LABEL_LENGTH) {
        return NextResponse.json(
          { ok: false, message: "Libellé trop long." },
          { status: 422 }
        );
      }
      const document = await uploadAdminPropertyDocument({
        propertyId,
        adminProfileId,
        file,
        visibility,
        label,
      });
      return NextResponse.json({ ok: true, document });
    }

    return NextResponse.json(
      { ok: false, message: "Type de requête non supporté." },
      { status: 415 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Création impossible.",
      },
      { status: 500 }
    );
  }
}
