import { NextResponse } from "next/server";
import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import { getClientProjectById } from "@/services/clients/client-project.service";
import {
  attachLeadToSellerProject,
  getSellerProjectByClientProjectId,
} from "@/services/clients/seller-project.service";

type RouteParams = { params: Promise<{ id: string; projectId: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "clients.edit")) {
    return NextResponse.json({ ok: false, message: "Acces refuse." }, { status: 403 });
  }

  const { id: clientId, projectId } = await params;
  let body: { sellerLeadId?: string } = {};
  try {
    body = (await request.json()) as { sellerLeadId?: string };
  } catch {
    return NextResponse.json({ ok: false, message: "Corps JSON invalide." }, { status: 400 });
  }

  if (!body.sellerLeadId?.trim()) {
    return NextResponse.json({ ok: false, message: "sellerLeadId requis." }, { status: 422 });
  }

  const clientProject = await getClientProjectById(projectId);
  if (!clientProject || clientProject.client_profile_id !== clientId) {
    return NextResponse.json({ ok: false, message: "Projet introuvable." }, { status: 404 });
  }

  const sp = await getSellerProjectByClientProjectId(projectId);
  if (!sp) {
    return NextResponse.json({ ok: false, message: "Projet vendeur introuvable." }, { status: 404 });
  }

  try {
    await attachLeadToSellerProject(sp.id, body.sellerLeadId!, context.profile?.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Rattachement impossible." },
      { status: 500 }
    );
  }
}
