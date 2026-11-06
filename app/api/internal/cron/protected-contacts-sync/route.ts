import { NextResponse } from "next/server";

import { isInternalRequest } from "@/lib/admin/auth";
import { syncProtectedContactsFromMyNotary } from "@/services/reactivation/protected-contacts.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Synchronisation quotidienne des contacts protégés depuis MyNotary (règle
 * permanente : pas de relance à un client sous mandat / compromis depuis
 * moins de 12 mois). Tourne avant le cron d'envoi (vercel.json).
 */
export const GET = async (request: Request) => {
  if (!(await isInternalRequest(request))) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  try {
    const summary = await syncProtectedContactsFromMyNotary();
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Protected contacts sync failed." },
      { status: 500 }
    );
  }
};
