import { NextResponse } from "next/server";

import { isInternalRequest } from "@/lib/admin/auth";
import { isReactivationSendSlot, parisHourOf } from "@/lib/reactivation/model";
import { runReactivationSendBatch } from "@/services/reactivation/reactivation-send.service";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Envoi quotidien de la vague propriétaires : 9 h heure de Paris, jours
 * ouvrés. La tâche Vercel appelle cette route à 7 h et 8 h UTC ; elle n'agit
 * que si l'heure de Paris est 9 h (été comme hiver). `?force=1` (appel manuel
 * authentifié) passe outre le créneau ; `?limit=` borne le lot ;
 * `?dryRunTo=adresse` envoie tout à une adresse de test sans rien écrire.
 */
export const GET = async (request: Request) => {
  if (!(await isInternalRequest(request))) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "1";
  const now = new Date();
  if (!force && !isReactivationSendSlot(now)) {
    return NextResponse.json({ ok: true, skipped: true, parisHour: parisHourOf(now) });
  }
  const limitRaw = Number.parseInt(url.searchParams.get("limit") ?? "", 10);
  const dryRunTo = url.searchParams.get("dryRunTo")?.trim() || null;
  try {
    const summary = await runReactivationSendBatch({
      limit: Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : undefined,
      dryRunTo,
      now,
    });
    return NextResponse.json({ ok: true, skipped: false, dryRun: Boolean(dryRunTo), ...summary });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Reactivation send failed." },
      { status: 500 }
    );
  }
};
