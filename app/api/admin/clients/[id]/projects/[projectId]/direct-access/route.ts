import { NextResponse } from "next/server";
import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import { isClientPortalDirectAccessEnabled } from "@/lib/client-space/direct-access";
import { serverEnv } from "@/lib/env/server";
import { getClientById } from "@/services/clients/client-profile.service";
import { getClientProjectById } from "@/services/clients/client-project.service";
import { createClientPortalAccessLink } from "@/services/clients/client-portal-magic-link.service";

type RouteParams = { params: Promise<{ id: string; projectId: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const requestUrl = new URL(request.url);
  if (
    !isClientPortalDirectAccessEnabled(
      requestUrl.host,
      serverEnv.PUBLIC_SITE_URL,
      process.env.VERCEL_URL,
      process.env.VERCEL_BRANCH_URL
    )
  ) {
    return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  }

  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "clients.invite")) {
    return NextResponse.json({ ok: false, message: "Acces refuse." }, { status: 403 });
  }

  const { id: clientId, projectId } = await params;
  const client = await getClientById(clientId);
  if (!client?.email) {
    return NextResponse.json({ ok: false, message: "Client introuvable." }, { status: 404 });
  }

  const project = await getClientProjectById(projectId);
  if (!project || project.client_profile_id !== clientId) {
    return NextResponse.json({ ok: false, message: "Projet introuvable." }, { status: 404 });
  }

  try {
    const result = await createClientPortalAccessLink({
      email: client.email,
      nextPath: `/espace-client/projets/${projectId}`,
      origin: requestUrl.origin,
      baseUrlOverride: requestUrl.origin,
    });

    if (!result.ok) {
      const status = result.code === "no_portal_access" ? 404 : 400;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json({
      ok: true,
      accessLink: result.data.link,
      email: result.data.email,
      context: result.data.context,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Impossible de generer le lien d'acces direct.",
      },
      { status: 500 }
    );
  }
}
