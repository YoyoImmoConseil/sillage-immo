import { NextResponse } from "next/server";
import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import { revokeInvitation } from "@/services/clients/client-project-invitation.service";

type RouteParams = {
  params: Promise<{ clientId: string; projectId: string; inviteId: string }>;
};

export async function POST(request: Request, { params }: RouteParams) {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "clients.invite")) {
    return NextResponse.json({ ok: false, message: "Acces refuse." }, { status: 403 });
  }

  const { inviteId } = await params;
  try {
    await revokeInvitation(inviteId, context.profile?.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Revocation impossible." },
      { status: 500 }
    );
  }
}
