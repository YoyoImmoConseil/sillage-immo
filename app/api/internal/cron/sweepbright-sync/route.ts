import { NextResponse } from "next/server";
import { isInternalRequest } from "@/lib/admin/auth";
import {
  getSweepBrightDeliveryStats,
  processPendingSweepBrightDeliveries,
} from "@/services/properties/sweepbright-sync.service";

const jsonError = (status: number, message: string) => {
  return NextResponse.json({ ok: false, message }, { status });
};

export const GET = async (request: Request) => {
  if (!(await isInternalRequest(request))) {
    return jsonError(401, "Unauthorized.");
  }

  const limitRaw = new URL(request.url).searchParams.get("limit");
  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : 10;

  try {
    const data = await processPendingSweepBrightDeliveries(limit);
    const stats = await getSweepBrightDeliveryStats();
    return NextResponse.json({ ok: true, mode: "cron", data, stats });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "SweepBright sync cron processing failed.";
    return jsonError(500, message);
  }
};
