import { NextResponse } from "next/server";
import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import { resolvePresentedForClientProject } from "@/lib/buyers/presented-admin-guard";
import {
  addAdminPresentedDocumentLink,
  listPresentedDocumentsForAdmin,
  PRESENTED_DOCUMENT_MAX_BYTES,
  registerUploadedAdminPresentedDocument,
  resolvePresentedDocumentUploaders,
  uploadAdminPresentedDocument,
  type PresentedDocumentVisibility,
} from "@/services/buyers/buyer-presented-document.service";

type RouteParams = {
  params: Promise<{ id: string; projectId: string; presentedId: string }>;
};

const MAX_LABEL_LENGTH = 200;

const parseVisibility = (value: unknown): PresentedDocumentVisibility =>
  value === "admin_only" ? "admin_only" : "admin_and_client";

export async function GET(request: Request, { params }: RouteParams) {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "clients.view")) {
    return NextResponse.json({ ok: false, message: "Acces refuse." }, { status: 403 });
  }
  const { id: clientId, projectId, presentedId } = await params;
  const presented = await resolvePresentedForClientProject(clientId, projectId, presentedId);
  if (!presented) {
    return NextResponse.json({ ok: false, message: "Bien introuvable." }, { status: 404 });
  }
  try {
    const documents = await listPresentedDocumentsForAdmin(presentedId);
    const uploaders = await resolvePresentedDocumentUploaders(documents);
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

export async function POST(request: Request, { params }: RouteParams) {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "clients.edit")) {
    return NextResponse.json({ ok: false, message: "Acces refuse." }, { status: 403 });
  }
  const adminProfileId = context.profile?.id;
  if (!adminProfileId) {
    return NextResponse.json({ ok: false, message: "Profil admin requis." }, { status: 400 });
  }

  const { id: clientId, projectId, presentedId } = await params;
  const presented = await resolvePresentedForClientProject(clientId, projectId, presentedId);
  if (!presented) {
    return NextResponse.json({ ok: false, message: "Bien introuvable." }, { status: 404 });
  }

  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as {
        kind?: "link" | "file";
        label?: string;
        url?: string;
        storagePath?: string;
        visibility?: PresentedDocumentVisibility | string;
      };

      if (body.kind === "file") {
        const storagePath = (body.storagePath ?? "").trim();
        if (!storagePath) {
          return NextResponse.json(
            { ok: false, message: "Chemin de stockage requis." },
            { status: 422 }
          );
        }
        if (body.label && body.label.length > MAX_LABEL_LENGTH) {
          return NextResponse.json({ ok: false, message: "Libellé trop long." }, { status: 422 });
        }
        const document = await registerUploadedAdminPresentedDocument({
          presentedPropertyId: presentedId,
          adminProfileId,
          storagePath,
          label: body.label,
          visibility: parseVisibility(body.visibility),
        });
        return NextResponse.json({ ok: true, document });
      }

      if (body.kind !== "link") {
        return NextResponse.json(
          { ok: false, message: "Type de document invalide." },
          { status: 422 }
        );
      }
      if (!body.label || !body.url) {
        return NextResponse.json({ ok: false, message: "Libellé et URL requis." }, { status: 422 });
      }
      if (body.label.length > MAX_LABEL_LENGTH) {
        return NextResponse.json({ ok: false, message: "Libellé trop long." }, { status: 422 });
      }
      const document = await addAdminPresentedDocumentLink({
        presentedPropertyId: presentedId,
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
        return NextResponse.json({ ok: false, message: "Fichier PDF requis." }, { status: 422 });
      }
      if (file.size > PRESENTED_DOCUMENT_MAX_BYTES) {
        return NextResponse.json(
          { ok: false, message: "Fichier supérieur à 25 Mo." },
          { status: 413 }
        );
      }
      const visibility = parseVisibility(form.get("visibility"));
      const labelValue = form.get("label");
      const label = typeof labelValue === "string" ? labelValue : undefined;
      if (label && label.length > MAX_LABEL_LENGTH) {
        return NextResponse.json({ ok: false, message: "Libellé trop long." }, { status: 422 });
      }
      const document = await uploadAdminPresentedDocument({
        presentedPropertyId: presentedId,
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
