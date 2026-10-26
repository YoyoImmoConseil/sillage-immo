import { NextResponse } from "next/server";
import { isInternalRequest } from "@/lib/admin/auth";
import { isBuyerAlertSlot, parisHour } from "@/lib/buyers/match-scoring";
import { runScheduledBuyerAlerts } from "@/services/buyers/buyer-alert-schedule.service";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Alertes acquéreurs groupées, à 9 h, 12 h et 18 h heure de Paris.
 * La tâche Vercel appelle cette route aux heures UTC candidates ; elle ne
 * fait quelque chose que si l'heure de Paris est l'un des trois créneaux.
 * `?force=1` (appel manuel authentifié) passe outre le créneau.
 */
export const GET = async (request: Request) => {
  if (!(await isInternalRequest(request))) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "1";
  const now = new Date();
  if (!force && !isBuyerAlertSlot(now)) {
    return NextResponse.json({ ok: true, skipped: true, parisHour: parisHour(now) });
  }
  try {
    const summary = await runScheduledBuyerAlerts();
    return NextResponse.json({ ok: true, skipped: false, parisHour: parisHour(now), ...summary });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Buyer alerts cron failed." },
      { status: 500 }
    );
  }
};
