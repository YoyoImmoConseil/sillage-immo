import { NextResponse } from "next/server";
import { isInternalRequest } from "@/lib/admin/auth";
import { serverEnv } from "@/lib/env/server";
import { runIncrementalBackfill } from "@/services/mynotary/backfill.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// Synchronisation quotidienne MyNotary (vercel.json). Même règle d'accès que
// les autres tâches : `isInternalRequest` accepte le secret que Vercel envoie
// (CRON_SECRET), le secret interne (DOMAIN_EVENTS_CRON_SECRET) ou une
// session admin pour un déclenchement manuel.

const jsonError = (status: number, message: string) =>
  NextResponse.json({ ok: false, message }, { status });

export const GET = async (request: Request) => {
  if (!(await isInternalRequest(request))) {
    return jsonError(401, "Unauthorized.");
  }
  if (!serverEnv.MYNOTARY_API_KEY || !serverEnv.MYNOTARY_ORGANIZATION_ID) {
    return NextResponse.json(
      {
        ok: true,
        skipped: true,
        message:
          "MyNotary integration not configured (missing MYNOTARY_API_KEY or MYNOTARY_ORGANIZATION_ID).",
      },
      { status: 200 }
    );
  }
  try {
    const data = await runIncrementalBackfill({ trigger: "cron" });
    return NextResponse.json({ ok: true, mode: "cron", data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "MyNotary sync failed.";
    return jsonError(500, message);
  }
};

export const POST = GET;
