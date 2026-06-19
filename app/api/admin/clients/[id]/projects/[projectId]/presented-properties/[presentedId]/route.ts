import { NextResponse } from "next/server";
import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import { getClientProjectById } from "@/services/clients/client-project.service";
import {
  archivePresentedProperty,
  getPresentedProperty,
  updatePresentedProperty,
} from "@/services/buyers/buyer-presented-property.service";

type RouteParams = {
  params: Promise<{ id: string; projectId: string; presentedId: string }>;
};

const resolvePresentedForProject = async (
  clientId: string,
  projectId: string,
  presentedId: string
) => {
  const project = await getClientProjectById(projectId);
  if (!project || project.client_profile_id !== clientId) return null;
  if (project.project_type !== "buyer") return null;
  const presented = await getPresentedProperty(presentedId);
  if (!presented || presented.clientProjectId !== projectId) return null;
  return presented;
};

type PatchBody = {
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

export async function PATCH(request: Request, { params }: RouteParams) {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "clients.edit")) {
    return NextResponse.json({ ok: false, message: "Acces refuse." }, { status: 403 });
  }
  const { id: clientId, projectId, presentedId } = await params;
  const presented = await resolvePresentedForProject(clientId, projectId, presentedId);
  if (!presented) {
    return NextResponse.json({ ok: false, message: "Bien introuvable." }, { status: 404 });
  }

  let body: PatchBody = {};
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ ok: false, message: "Corps JSON invalide." }, { status: 400 });
  }
  if (!body.label?.trim()) {
    return NextResponse.json({ ok: false, message: "Le libellé est requis." }, { status: 422 });
  }

  try {
    const presentedProperty = await updatePresentedProperty({
      presentedPropertyId: presentedId,
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
        message: error instanceof Error ? error.message : "Mise à jour impossible.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "clients.edit")) {
    return NextResponse.json({ ok: false, message: "Acces refuse." }, { status: 403 });
  }
  const { id: clientId, projectId, presentedId } = await params;
  const presented = await resolvePresentedForProject(clientId, projectId, presentedId);
  if (!presented) {
    return NextResponse.json({ ok: false, message: "Bien introuvable." }, { status: 404 });
  }

  try {
    await archivePresentedProperty(presentedId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Suppression impossible.",
      },
      { status: 500 }
    );
  }
}
