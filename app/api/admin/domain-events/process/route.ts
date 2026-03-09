import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin/auth";
import {
  getDomainEventQueueStats,
  processPendingDomainEvents,
} from "@/services/events/domain-events-processor.service";

const jsonError = (status: number, message: string) => {
  return NextResponse.json({ ok: false, message }, { status });
};

export const GET = async (request: Request) => {
  if (!isAdminRequest(request)) {
    return jsonError(401, "Unauthorized.");
  }

  try {
    const stats = await getDomainEventQueueStats();
    return NextResponse.json({ ok: true, data: stats });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Impossible de lire la queue domain_events.";
    return jsonError(500, message);
  }
};

export const POST = async (request: Request) => {
  if (!isAdminRequest(request)) {
    return jsonError(401, "Unauthorized.");
  }

  let limit: number | undefined;
  try {
    const body = (await request.json()) as { limit?: unknown };
    if (typeof body.limit === "number" && Number.isFinite(body.limit)) {
      limit = body.limit;
    }
  } catch {
    // optional json body
  }

  try {
    const result = await processPendingDomainEvents(limit ?? 25);
    const stats = await getDomainEventQueueStats();
    return NextResponse.json({ ok: true, data: result, stats });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Impossible de traiter les domain_events.";
    return jsonError(500, message);
  }
};
