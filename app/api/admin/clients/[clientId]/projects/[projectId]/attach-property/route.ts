import { NextResponse } from "next/server";
import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import { attachPropertyToSellerProject } from "@/services/clients/seller-project.service";

type RouteParams = { params: Promise<{ clientId: string; projectId: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "clients.edit")) {
    return NextResponse.json({ ok: false, message: "Acces refuse." }, { status: 403 });
  }

  const { projectId } = await params;
  let body: { propertyId?: string; isPrimary?: boolean } = {};
  try {
    body = (await request.json()) as { propertyId?: string; isPrimary?: boolean };
  } catch {
    return NextResponse.json({ ok: false, message: "Corps JSON invalide." }, { status: 400 });
  }

  if (!body.propertyId?.trim()) {
    return NextResponse.json({ ok: false, message: "propertyId requis." }, { status: 422 });
  }

  try {
    await attachPropertyToSellerProject(projectId, body.propertyId!, {
      isPrimary: body.isPrimary ?? false,
      adminProfileId: context.profile?.id,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Rattachement impossible." },
      { status: 500 }
    );
  }
}
