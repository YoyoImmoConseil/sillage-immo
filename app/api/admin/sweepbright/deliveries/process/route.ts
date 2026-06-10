import { NextResponse } from "next/server";
import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import type { AdminPermission } from "@/types/domain/admin";
import {
  getSweepBrightDeliveryStats,
  listRecentSweepBrightDeliveries,
  processPendingSweepBrightDeliveries,
} from "@/services/properties/sweepbright-sync.service";

const jsonError = (status: number, message: string) => {
  return NextResponse.json({ ok: false, message }, { status });
};

const isAuthorized = async (request: Request, permission: AdminPermission) => {
  const context = await getAdminRequestContext(request);
  return context !== null && hasAdminPermission(context, permission);
};

export const GET = async (request: Request) => {
  if (!(await isAuthorized(request, "operations.view"))) {
    return jsonError(403, "Acces refuse.");
  }

  try {
    const [stats, deliveries] = await Promise.all([
      getSweepBrightDeliveryStats(),
      listRecentSweepBrightDeliveries(25),
    ]);
    return NextResponse.json({ ok: true, data: { stats, deliveries } });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Impossible de lire la queue SweepBright.";
    return jsonError(500, message);
  }
};

export const POST = async (request: Request) => {
  if (!(await isAuthorized(request, "operations.manage"))) {
    return jsonError(403, "Acces refuse.");
  }

  let limit = 10;
  try {
    const body = (await request.json()) as { limit?: unknown };
    if (typeof body.limit === "number" && Number.isFinite(body.limit)) {
      limit = body.limit;
    }
  } catch {
    // optional body
  }

  try {
    const [data, stats] = await Promise.all([
      processPendingSweepBrightDeliveries(limit),
      getSweepBrightDeliveryStats(),
    ]);
    return NextResponse.json({ ok: true, data, stats });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Impossible de traiter les deliveries SweepBright.";
    return jsonError(500, message);
  }
};
