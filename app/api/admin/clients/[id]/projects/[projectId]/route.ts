import { NextResponse } from "next/server";
import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import { getClientProjectById } from "@/services/clients/client-project.service";
import { getSellerProjectDetail } from "@/services/clients/seller-project.service";
import { getProjectEvents } from "@/services/clients/client-project-invitation.service";

type RouteParams = { params: Promise<{ id: string; projectId: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "clients.view")) {
    return NextResponse.json({ ok: false, message: "Acces refuse." }, { status: 403 });
  }

  const { id: clientId, projectId } = await params;
  try {
    const clientProject = await getClientProjectById(projectId);
    if (!clientProject || clientProject.client_profile_id !== clientId) {
      return NextResponse.json({ ok: false, message: "Projet introuvable." }, { status: 404 });
    }

    const detail = await getSellerProjectDetail(projectId);
    if (!detail) {
      return NextResponse.json({ ok: false, message: "Projet introuvable." }, { status: 404 });
    }

    const events = await getProjectEvents(detail.clientProjectId, 20);
    return NextResponse.json({
      ok: true,
      project: detail,
      events,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Chargement impossible." },
      { status: 500 }
    );
  }
}
