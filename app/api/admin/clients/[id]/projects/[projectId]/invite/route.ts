import { NextResponse } from "next/server";
import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import { createInvitation } from "@/services/clients/client-project-invitation.service";
import { sendClientPortalMagicLink } from "@/services/clients/client-portal-magic-link.service";
import { getClientById } from "@/services/clients/client-profile.service";
import { getClientProjectById } from "@/services/clients/client-project.service";

type RouteParams = { params: Promise<{ id: string; projectId: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "clients.invite")) {
    return NextResponse.json({ ok: false, message: "Acces refuse." }, { status: 403 });
  }

  const { id: clientId, projectId } = await params;
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

  // 1. Always create the invitation row first. If anything fails after this
  //    we still surface the inviteLink so the admin can fall back to a
  //    manual copy/paste through the UI.
  let invitation: Awaited<ReturnType<typeof createInvitation>>;
  try {
    invitation = await createInvitation({
      clientProjectId: projectId,
      clientProfileId: clientId,
      email,
      createdByAdminId: context.profile?.id,
      providerHint: body.providerHint,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Invitation impossible." },
      { status: 500 }
    );
  }

  const inviteLink = `/espace-client/invitation?token=${invitation.token}`;

  // 2. Trigger the actual email delivery. The token returned by
  //    createInvitation is the cleartext token (only the hash is stored)
  //    so we forward it as inviteToken; sendClientPortalMagicLink will
  //    re-validate it and generate a Supabase signup/magiclink URL
  //    embedded in the "Votre espace Sillage est prêt" template.
  const requestUrl = new URL(request.url);
  let mailResult: Awaited<ReturnType<typeof sendClientPortalMagicLink>>;
  try {
    mailResult = await sendClientPortalMagicLink({
      email,
      inviteToken: invitation.token,
      nextPath: "/espace-client",
      origin: requestUrl.origin,
    });
  } catch (error) {
    // The invitation row exists, the cleartext token was returned to the
    // admin UI through inviteLink, so the operation is recoverable via a
    // manual copy/paste. We surface the failure with HTTP 502.
    return NextResponse.json(
      {
        ok: false,
        code: "email_send_failed",
        message:
          error instanceof Error
            ? `L'invitation a ete creee mais l'envoi du mail a echoue : ${error.message}`
            : "L'invitation a ete creee mais l'envoi du mail a echoue.",
        invitationId: invitation.invitationId,
        expiresAt: invitation.expiresAt,
        inviteLink,
      },
      { status: 502 }
    );
  }

  if (!mailResult.ok) {
    return NextResponse.json(
      {
        ok: false,
        code: mailResult.code,
        message: mailResult.message,
        invitationId: invitation.invitationId,
        expiresAt: invitation.expiresAt,
        inviteLink,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    invitationId: invitation.invitationId,
    expiresAt: invitation.expiresAt,
    inviteLink,
    emailSent: true,
  });
}
