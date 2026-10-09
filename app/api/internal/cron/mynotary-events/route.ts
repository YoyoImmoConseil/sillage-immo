import { NextResponse } from "next/server";
import { isInternalRequest } from "@/lib/admin/auth";
import {
  getMyNotaryInboxStats,
  processPendingMyNotaryEvents,
} from "@/services/mynotary/event-inbox.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Filet de sécurité de la boîte de réception MyNotary : traite les
 * événements `pending` / `error` (et les verrous abandonnés) dans l'ordre
 * d'event_created_at. Le gros du travail est fait par `after()` dans le
 * webhook ; ce cron rattrape les échecs et les redémarrages.
 */
export const GET = async (request: Request) => {
  if (!(await isInternalRequest(request))) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const limitRaw = new URL(request.url).searchParams.get("limit");
  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : 20;
  try {
    const result = await processPendingMyNotaryEvents({ limit });
    const stats = await getMyNotaryInboxStats();
    return NextResponse.json({ ok: true, mode: "cron", ...result, stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : "MyNotary inbox cron failed.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
};
