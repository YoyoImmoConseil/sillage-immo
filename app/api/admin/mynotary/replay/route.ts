import { NextResponse } from "next/server";

import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import { replaySignedContracts } from "@/services/mynotary/replay-signatures.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Rejeu des signatures MyNotary dans la boîte de réception (rattrapage).
 * POST ?dryRun=1 pour compter sans écrire ; ?since=2026-06-01 pour borner ;
 * ?max=25 pour déposer par lots (rappeler jusqu'à partial=false) ; ?force=1
 * pour redéposer des contrats déjà rejoués (réparation).
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
  const force = url.searchParams.get("force") === "1";
  const maxRaw = Number.parseInt(url.searchParams.get("max") ?? "", 10);
  const maxContracts = Number.isFinite(maxRaw) && maxRaw > 0 ? maxRaw : undefined;
  try {
    const result = await replaySignedContracts({ dryRun, since, maxContracts, force, timeBudgetMs: 240_000 });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Replay failed." },
      { status: 500 }
    );
  }
};
