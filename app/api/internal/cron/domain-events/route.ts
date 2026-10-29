import { NextResponse } from "next/server";
import { isInternalRequest } from "@/lib/admin/auth";
import {
  getDomainEventQueueStats,
  processPendingDomainEvents,
} from "@/services/events/domain-events-processor.service";

// Même règle d'accès que les autres tâches planifiées : `isInternalRequest`
// accepte le secret envoyé par Vercel (CRON_SECRET), le secret interne
// (DOMAIN_EVENTS_CRON_SECRET) ou une session admin.

const jsonError = (status: number, message: string) => {
  return NextResponse.json({ ok: false, message }, { status });
};

const parseLimitFromUrl = (request: Request) => {
  const url = new URL(request.url);
  const raw = url.searchParams.get("limit");
  if (!raw) return undefined;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const GET = async (request: Request) => {
  if (!(await isInternalRequest(request))) {
    return jsonError(401, "Unauthorized.");
  }

  const limit = parseLimitFromUrl(request) ?? 25;

  try {
    const data = await processPendingDomainEvents(limit);
    const stats = await getDomainEventQueueStats();
    return NextResponse.json({ ok: true, mode: "cron", data, stats });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Domain events cron processing failed.";
    return jsonError(500, message);
  }
};
