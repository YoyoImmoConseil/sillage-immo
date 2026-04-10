import { NextResponse } from "next/server";
import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import { getClientById, updateClientProfile } from "@/services/clients/client-profile.service";
import { getClientProjectsByClientId } from "@/services/clients/client-project.service";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "clients.view")) {
    return NextResponse.json({ ok: false, message: "Acces refuse." }, { status: 403 });
  }

  const { id } = await params;
  try {
    const client = await getClientById(id);
    if (!client) {
      return NextResponse.json({ ok: false, message: "Client introuvable." }, { status: 404 });
    }

    const projects = await getClientProjectsByClientId(id);
    return NextResponse.json({
      ok: true,
      client: {
        id: client.id,
        email: client.email,
        phone: client.phone,
        firstName: client.first_name,
        lastName: client.last_name,
        fullName: client.full_name,
        authUserId: client.auth_user_id,
        isActive: client.is_active,
        lastLoginAt: client.last_login_at,
        createdAt: client.created_at,
        updatedAt: client.updated_at,
      },
      projects,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Chargement impossible." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "clients.edit")) {
    return NextResponse.json({ ok: false, message: "Acces refuse." }, { status: 403 });
  }

  const { id } = await params;
  type PatchBody = { email?: string; phone?: string; firstName?: string; lastName?: string };
  let body: PatchBody = {};
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ ok: false, message: "Corps JSON invalide." }, { status: 400 });
  }

  const client = await getClientById(id);
  if (!client) {
    return NextResponse.json({ ok: false, message: "Client introuvable." }, { status: 404 });
  }

  try {
    await updateClientProfile(id, {
      email: body.email,
      phone: body.phone,
      firstName: body.firstName,
      lastName: body.lastName,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Mise a jour impossible." },
      { status: 500 }
    );
  }
}
