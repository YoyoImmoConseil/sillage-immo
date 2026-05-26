import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin/auth";
import { serverEnv } from "@/lib/env/server";
import { runIncrementalBackfill } from "@/services/mynotary/backfill.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// Daily MyNotary sync, wired into vercel.json cron config (24h).
// Same auth model as the domain-events cron: either Vercel's
// scheduled cron Authorization header (CRON_SECRET) or an admin
// session for manual debugging.

const parseBearer = (request: Request) => {
  const auth = request.headers.get("authorization");
  if (!auth) return null;
  const [scheme, token] = auth.split(" ");
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") return null;
  return token.trim();
};

const isCronAuthorized = (request: Request) => {
  const expected = serverEnv.DOMAIN_EVENTS_CRON_SECRET;
  if (!expected) return false;
  const headerSecret = request.headers.get("x-cron-secret");
  if (headerSecret && headerSecret === expected) return true;
  const bearer = parseBearer(request);
  return Boolean(bearer && bearer === expected);
};

const jsonError = (status: number, message: string) =>
  NextResponse.json({ ok: false, message }, { status });

const isAuthorized = async (request: Request) =>
  (await isAdminRequest(request)) || isCronAuthorized(request);

export const GET = async (request: Request) => {
  if (!(await isAuthorized(request))) {
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
