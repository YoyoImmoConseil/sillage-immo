import { NextResponse } from "next/server";
import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import { resolvePresentedForClientProject } from "@/lib/buyers/presented-admin-guard";
import {
  getPresentedDocumentById,
  softDeletePresentedDocument,
} from "@/services/buyers/buyer-presented-document.service";

type RouteParams = {
  params: Promise<{ id: string; projectId: string; presentedId: string; docId: string }>;
};

export async function DELETE(request: Request, { params }: RouteParams) {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "clients.edit")) {
    return NextResponse.json({ ok: false, message: "Acces refuse." }, { status: 403 });
  }
  const adminProfileId = context.profile?.id;
  if (!adminProfileId) {
    return NextResponse.json({ ok: false, message: "Profil admin requis." }, { status: 400 });
  }

  const { id: clientId, projectId, presentedId, docId } = await params;
  const presented = await resolvePresentedForClientProject(clientId, projectId, presentedId);
  if (!presented) {
    return NextResponse.json({ ok: false, message: "Bien introuvable." }, { status: 404 });
  }

  try {
    const existing = await getPresentedDocumentById(docId);
    if (!existing || existing.presentedPropertyId !== presentedId) {
      return NextResponse.json({ ok: false, message: "Document introuvable." }, { status: 404 });
    }
    await softDeletePresentedDocument(docId, { kind: "admin", adminProfileId });
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
