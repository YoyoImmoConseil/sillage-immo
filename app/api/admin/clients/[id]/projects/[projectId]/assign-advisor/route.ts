import { NextResponse } from "next/server";
import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import { getClientProjectById } from "@/services/clients/client-project.service";
import {
  assignAdvisorToSellerProject,
  getSellerProjectByClientProjectId,
} from "@/services/clients/seller-project.service";

type RouteParams = { params: Promise<{ id: string; projectId: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "clients.assign_advisor")) {
    return NextResponse.json({ ok: false, message: "Acces refuse." }, { status: 403 });
  }

  const { id: clientId, projectId } = await params;
  let body: { adminProfileId?: string; reason?: string } = {};
  try {
    body = (await request.json()) as { adminProfileId?: string; reason?: string };
  } catch {
    return NextResponse.json({ ok: false, message: "Corps JSON invalide." }, { status: 400 });
  }

  if (!body.adminProfileId?.trim()) {
    return NextResponse.json({ ok: false, message: "adminProfileId requis." }, { status: 422 });
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
    await assignAdvisorToSellerProject(sp.id, body.adminProfileId!, {
      assignedByAdminId: context.profile?.id,
      reason: body.reason,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Affectation impossible." },
      { status: 500 }
    );
  }
}
