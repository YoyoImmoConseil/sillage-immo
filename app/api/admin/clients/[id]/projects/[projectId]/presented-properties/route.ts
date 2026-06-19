import { NextResponse } from "next/server";
import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import { getClientProjectById } from "@/services/clients/client-project.service";
import {
  createPresentedProperty,
  listPresentedPropertiesForProject,
} from "@/services/buyers/buyer-presented-property.service";

type RouteParams = { params: Promise<{ id: string; projectId: string }> };

const resolveBuyerProjectForClient = async (clientId: string, projectId: string) => {
  const project = await getClientProjectById(projectId);
  if (!project || project.client_profile_id !== clientId) return null;
  if (project.project_type !== "buyer") return null;
  return project;
};

export async function GET(request: Request, { params }: RouteParams) {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "clients.view")) {
    return NextResponse.json({ ok: false, message: "Acces refuse." }, { status: 403 });
  }
  const { id: clientId, projectId } = await params;
  const project = await resolveBuyerProjectForClient(clientId, projectId);
  if (!project) {
    return NextResponse.json({ ok: false, message: "Projet introuvable." }, { status: 404 });
  }
  try {
    const presentedProperties = await listPresentedPropertiesForProject(projectId);
    return NextResponse.json({ ok: true, presentedProperties });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Chargement impossible.",
      },
      { status: 500 }
    );
  }
}

type CreateBody = {
  label?: string;
  address?: string;
  city?: string;
  priceAmount?: number;
  rooms?: number;
  livingAreaM2?: number;
  externalUrl?: string;
  propertyId?: string;
  notes?: string;
};

export async function POST(request: Request, { params }: RouteParams) {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "clients.edit")) {
    return NextResponse.json({ ok: false, message: "Acces refuse." }, { status: 403 });
  }
  const adminProfileId = context.profile?.id;
  if (!adminProfileId) {
    return NextResponse.json({ ok: false, message: "Profil admin requis." }, { status: 400 });
  }

  const { id: clientId, projectId } = await params;
  const project = await resolveBuyerProjectForClient(clientId, projectId);
  if (!project) {
    return NextResponse.json({ ok: false, message: "Projet introuvable." }, { status: 404 });
  }

  let body: CreateBody = {};
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json({ ok: false, message: "Corps JSON invalide." }, { status: 400 });
  }

  if (!body.label?.trim()) {
    return NextResponse.json({ ok: false, message: "Le libellé est requis." }, { status: 422 });
  }

  try {
    const presentedProperty = await createPresentedProperty({
      clientProjectId: projectId,
      adminProfileId,
      data: {
        label: body.label,
        address: body.address,
        city: body.city,
        priceAmount: body.priceAmount,
        rooms: body.rooms,
        livingAreaM2: body.livingAreaM2,
        externalUrl: body.externalUrl,
        propertyId: body.propertyId,
        notes: body.notes,
      },
    });
    return NextResponse.json({ ok: true, presentedProperty });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Création impossible.",
      },
      { status: 500 }
    );
  }
}
