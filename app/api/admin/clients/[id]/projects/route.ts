import { NextResponse } from "next/server";
import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import {
  getClientProjectsByClientId,
  createClientProject,
  emitClientProjectEvent,
} from "@/services/clients/client-project.service";
import {
  createSellerProjectFromProperty,
  createSellerProjectManual,
} from "@/services/clients/seller-project.service";
import { getClientById } from "@/services/clients/client-profile.service";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "clients.view")) {
    return NextResponse.json({ ok: false, message: "Acces refuse." }, { status: 403 });
  }

  const { id: clientId } = await params;
  try {
    const projects = await getClientProjectsByClientId(clientId);
    return NextResponse.json({ ok: true, projects });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Chargement impossible." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "clients.create")) {
    return NextResponse.json({ ok: false, message: "Acces refuse." }, { status: 403 });
  }

  const { id: clientId } = await params;
  const client = await getClientById(clientId);
  if (!client) {
    return NextResponse.json({ ok: false, message: "Client introuvable." }, { status: 404 });
  }

  type BodyType = {
    title?: string;
    createdFrom?: "admin_manual" | "crm_property";
    propertyId?: string;
    adminProfileId?: string;
  };
  let body: BodyType = {};
  try {
    body = (await request.json()) as BodyType;
  } catch {
    return NextResponse.json({ ok: false, message: "Corps JSON invalide." }, { status: 400 });
  }

  const createdFrom = body.createdFrom ?? "admin_manual";
  const adminProfileId = body.adminProfileId ?? context.profile?.id ?? undefined;

  try {
    if (body.propertyId) {
      const result = await createSellerProjectFromProperty({
        clientProfileId: clientId,
        propertyId: body.propertyId!,
        adminProfileId,
      });
      return NextResponse.json({
        ok: true,
        clientProjectId: result.clientProjectId,
        sellerProjectId: result.sellerProjectId,
      });
    }

    const projectId = await createClientProject({
      clientProfileId: clientId,
      projectType: "seller",
      title: body.title ?? `Projet vendeur - ${client.full_name ?? client.email}`,
      createdFrom,
      primaryAdminProfileId: adminProfileId,
    });

    const sellerProjectId = await createSellerProjectManual({
      clientProjectId: projectId,
      adminProfileId,
    });

    return NextResponse.json({
      ok: true,
      clientProjectId: projectId,
      sellerProjectId,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Creation impossible." },
      { status: 500 }
    );
  }
}
