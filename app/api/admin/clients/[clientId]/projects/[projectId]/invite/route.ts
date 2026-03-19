import { NextResponse } from "next/server";
import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import { createInvitation } from "@/services/clients/client-project-invitation.service";
import { getClientById } from "@/services/clients/client-profile.service";
import { getClientProjectById } from "@/services/clients/client-project.service";

type RouteParams = { params: Promise<{ clientId: string; projectId: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "clients.invite")) {
    return NextResponse.json({ ok: false, message: "Acces refuse." }, { status: 403 });
  }

  const { clientId, projectId } = await params;
  const client = await getClientById(clientId);
  if (!client) {
    return NextResponse.json({ ok: false, message: "Client introuvable." }, { status: 404 });
  }

  const project = await getClientProjectById(projectId);
  if (!project || project.client_profile_id !== clientId) {
    return NextResponse.json({ ok: false, message: "Projet introuvable." }, { status: 404 });
  }

  let body: { email?: string; providerHint?: "google" | "apple" | "microsoft" | "email" } = {};
  try {
    body = (await request.json()) as { email?: string; providerHint?: "google" | "apple" | "microsoft" | "email" };
  } catch {
    return NextResponse.json({ ok: false, message: "Corps JSON invalide." }, { status: 400 });
  }

  const email = body.email?.trim() ?? client.email;
  if (!email) {
    return NextResponse.json({ ok: false, message: "Email requis." }, { status: 422 });
  }

  try {
    const result = await createInvitation({
      clientProjectId: projectId,
      clientProfileId: clientId,
      email,
      createdByAdminId: context.profile?.id,
      providerHint: body.providerHint,
    });
    return NextResponse.json({
      ok: true,
      invitationId: result.invitationId,
      expiresAt: result.expiresAt,
      inviteLink: `/espace-client/invitation?token=${result.token}`,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Invitation impossible." },
      { status: 500 }
    );
  }
}
