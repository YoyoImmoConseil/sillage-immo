import { NextResponse } from "next/server";
import { getAdminPageContext, hasAdminPermission } from "@/lib/admin/auth";
import { updateSellerProjectMilestones } from "@/services/clients/seller-project.service";

export const dynamic = "force-dynamic";

type Body = {
  mandateSignedAt?: string | null;
  offerReceivedAt?: string | null;
  offerBuyerLeadId?: string | null;
  offerBuyerName?: string | null;
  preliminarySaleSignedAt?: string | null;
  deedSignedAt?: string | null;
};

const ALLOWED_KEYS: Array<keyof Body> = [
  "mandateSignedAt",
  "offerReceivedAt",
  "offerBuyerLeadId",
  "offerBuyerName",
  "preliminarySaleSignedAt",
  "deedSignedAt",
];

const filterPayload = (raw: unknown): Body => {
  if (!raw || typeof raw !== "object") return {};
  const out: Body = {};
  for (const key of ALLOWED_KEYS) {
    if (key in (raw as Record<string, unknown>)) {
      out[key] = (raw as Record<string, unknown>)[key] as Body[typeof key];
    }
  }
  return out;
};

export const PUT = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const context = await getAdminPageContext();
  if (!context || !context.profile) {
    return NextResponse.json(
      { ok: false, code: "unauthenticated", message: "Session admin requise." },
      { status: 401 }
    );
  }
  if (!hasAdminPermission(context, "clients.edit")) {
    return NextResponse.json(
      { ok: false, code: "forbidden", message: "Permission insuffisante." },
      { status: 403 }
    );
  }

  const { id: sellerProjectId } = await params;

  let body: Body;
  try {
    body = filterPayload(await request.json());
  } catch {
    return NextResponse.json(
      { ok: false, code: "invalid_json", message: "JSON invalide." },
      { status: 400 }
    );
  }

  if (Object.keys(body).length === 0) {
    return NextResponse.json(
      { ok: false, code: "empty_payload", message: "Aucun champ à mettre à jour." },
      { status: 400 }
    );
  }

  try {
    const milestones = await updateSellerProjectMilestones(sellerProjectId, body, {
      adminProfileId: context.profile.id,
    });
    return NextResponse.json({ ok: true, milestones });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        code: "update_failed",
        message: err instanceof Error ? err.message : "Échec de la mise à jour.",
      },
      { status: 400 }
    );
  }
};
