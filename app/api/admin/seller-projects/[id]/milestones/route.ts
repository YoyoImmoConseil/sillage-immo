import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getAdminPageContext, hasAdminPermission } from "@/lib/admin/auth";
import { updateSellerProjectMilestones } from "@/services/clients/seller-project.service";
import { DASHBOARD_PILOT_CACHE_TAG } from "@/services/admin/dashboard-aggregator.service";

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
    // Bust every cached dashboard period at once so the new
    // milestone shows up immediately on /admin (otherwise the user
    // would have to wait up to 5 minutes for the SSR cache to expire).
    try {
      // Next 16 requires the second argument (revalidation profile);
      // "max" forces an immediate purge so the next render fetches
      // fresh KPIs.
      revalidateTag(DASHBOARD_PILOT_CACHE_TAG, "max");
    } catch {
      // best-effort; never fail the request because cache invalidation failed.
    }
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
