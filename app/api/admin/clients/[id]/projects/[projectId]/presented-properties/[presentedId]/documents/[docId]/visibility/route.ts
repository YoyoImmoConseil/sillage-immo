import { NextResponse } from "next/server";
import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import { resolvePresentedForClientProject } from "@/lib/buyers/presented-admin-guard";
import {
  getPresentedDocumentById,
  setPresentedDocumentVisibility,
  type PresentedDocumentVisibility,
} from "@/services/buyers/buyer-presented-document.service";

type RouteParams = {
  params: Promise<{ id: string; projectId: string; presentedId: string; docId: string }>;
};

export async function PATCH(request: Request, { params }: RouteParams) {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "clients.edit")) {
    return NextResponse.json({ ok: false, message: "Acces refuse." }, { status: 403 });
  }

  const { id: clientId, projectId, presentedId, docId } = await params;
  const presented = await resolvePresentedForClientProject(clientId, projectId, presentedId);
  if (!presented) {
    return NextResponse.json({ ok: false, message: "Bien introuvable." }, { status: 404 });
  }

  let body: { visibility?: PresentedDocumentVisibility | string } = {};
  try {
    body = (await request.json()) as { visibility?: PresentedDocumentVisibility | string };
  } catch {
    return NextResponse.json({ ok: false, message: "Corps JSON invalide." }, { status: 400 });
  }
  if (body.visibility !== "admin_only" && body.visibility !== "admin_and_client") {
    return NextResponse.json({ ok: false, message: "Visibilité invalide." }, { status: 422 });
  }

  try {
    const existing = await getPresentedDocumentById(docId);
    if (!existing || existing.presentedPropertyId !== presentedId) {
      return NextResponse.json({ ok: false, message: "Document introuvable." }, { status: 404 });
    }
    const updated = await setPresentedDocumentVisibility(docId, body.visibility);
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
