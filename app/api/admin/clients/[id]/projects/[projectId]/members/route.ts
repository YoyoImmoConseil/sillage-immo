import { NextResponse } from "next/server";
import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import { normalizeEmail } from "@/services/contacts/contact-identity.service";
import {
  addClientToProject,
  getClientProjectById,
  removeClientFromProject,
} from "@/services/clients/client-project.service";
import { createClientProfile } from "@/services/clients/client-profile.service";

type RouteParams = { params: Promise<{ id: string; projectId: string }> };

const resolveProjectForClient = async (clientId: string, projectId: string) => {
  const project = await getClientProjectById(projectId);
  if (!project || project.client_profile_id !== clientId) return null;
  return project;
};

export async function POST(request: Request, { params }: RouteParams) {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "clients.edit")) {
    return NextResponse.json({ ok: false, message: "Acces refuse." }, { status: 403 });
  }

  const { id: clientId, projectId } = await params;
  const project = await resolveProjectForClient(clientId, projectId);
  if (!project) {
    return NextResponse.json({ ok: false, message: "Projet introuvable." }, { status: 404 });
  }

  type BodyType = {
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
  let body: BodyType = {};
  try {
    body = (await request.json()) as BodyType;
  } catch {
    return NextResponse.json({ ok: false, message: "Corps JSON invalide." }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  if (!email) {
    return NextResponse.json({ ok: false, message: "Email requis." }, { status: 400 });
  }

  try {
    const profileResult = await createClientProfile({
      email,
      phone: body.phone,
      firstName: body.firstName,
      lastName: body.lastName,
    });

    await addClientToProject({
      clientProjectId: projectId,
      clientProfileId: profileResult.clientProfileId,
      role: "co_owner",
      adminProfileId: context.profile?.id ?? null,
    });

    return NextResponse.json({
      ok: true,
      clientProfileId: profileResult.clientProfileId,
      created: profileResult.status === "created",
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Ajout impossible." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "clients.edit")) {
    return NextResponse.json({ ok: false, message: "Acces refuse." }, { status: 403 });
  }

  const { id: clientId, projectId } = await params;
  const project = await resolveProjectForClient(clientId, projectId);
  if (!project) {
    return NextResponse.json({ ok: false, message: "Projet introuvable." }, { status: 404 });
  }

  type BodyType = { clientProfileId?: string };
  let body: BodyType = {};
  try {
    body = (await request.json()) as BodyType;
  } catch {
    return NextResponse.json({ ok: false, message: "Corps JSON invalide." }, { status: 400 });
  }

  const clientProfileId = body.clientProfileId?.trim();
  if (!clientProfileId) {
    return NextResponse.json({ ok: false, message: "clientProfileId requis." }, { status: 400 });
  }

  if (clientProfileId === project.client_profile_id) {
    return NextResponse.json(
      {
        ok: false,
        message: "Impossible de retirer le titulaire principal du projet.",
      },
      { status: 400 }
    );
  }

  try {
    await removeClientFromProject({ clientProjectId: projectId, clientProfileId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Retrait impossible." },
      { status: 500 }
    );
  }
}
