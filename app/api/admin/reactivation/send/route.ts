import { NextResponse } from "next/server";

import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import { isSenderKey } from "@/lib/reactivation/model";
import { runReactivationSendBatch } from "@/services/reactivation/reactivation-send.service";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Déclenchement manuel d'un lot (page admin « Réactivation ») :
 * { limit?: number, dryRunTo?: string }. `dryRunTo` envoie les mails du lot
 * à cette adresse sans rien écrire sur les contacts (BAT en conditions réelles).
 */
export async function POST(request: Request) {
  const adminContext = await getAdminRequestContext(request);
  if (!adminContext || !hasAdminPermission(adminContext, "leads.sellers.manage")) {
    return NextResponse.json({ ok: false, code: "forbidden", message: "Acces refuse." }, { status: 403 });
  }
  const body = (await request.json().catch(() => ({}))) as { limit?: unknown; dryRunTo?: unknown; dryRunSender?: unknown };
  const limit = typeof body.limit === "number" && body.limit > 0 ? Math.min(Math.floor(body.limit), 500) : undefined;
  const dryRunTo = typeof body.dryRunTo === "string" && body.dryRunTo.includes("@") ? body.dryRunTo.trim() : null;
  const dryRunSender = isSenderKey(body.dryRunSender) ? body.dryRunSender : null;
  try {
    const summary = await runReactivationSendBatch({ limit, dryRunTo, dryRunSender });
    return NextResponse.json({ ok: true, dryRun: Boolean(dryRunTo), data: summary });
  } catch (error) {
    return NextResponse.json(
      { ok: false, code: "send_failed", message: error instanceof Error ? error.message : "Send failed." },
      { status: 500 }
    );
  }
}
