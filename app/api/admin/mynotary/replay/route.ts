import { NextResponse } from "next/server";

import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import { replaySignedContracts } from "@/services/mynotary/replay-signatures.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Rejeu des signatures MyNotary dans la boîte de réception (rattrapage).
 * POST ?dryRun=1 pour compter sans écrire ; ?since=2026-06-01 pour borner.
 * Lecture seule côté MyNotary ; la projection suit par le cron mynotary-events.
 */
export const POST = async (request: Request) => {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "admin.mynotary.sync")) {
    return NextResponse.json({ ok: false, message: "Accès réservé aux administrateurs." }, { status: 403 });
  }
  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1";
  const since = url.searchParams.get("since");
  try {
    const result = await replaySignedContracts({ dryRun, since, timeBudgetMs: 270_000 });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Replay failed." },
      { status: 500 }
    );
  }
};
