import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin/auth";
import { serverEnv } from "@/lib/env/server";
import {
  getDomainEventQueueStats,
  processPendingDomainEvents,
} from "@/services/events/domain-events-processor.service";

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

const isAuthorized = async (request: Request) => {
  return (await isAdminRequest(request)) || isCronAuthorized(request);
};

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
  if (!(await isAuthorized(request))) {
    return jsonError(401, "Unauthorized.");
  }
  if (!serverEnv.DOMAIN_EVENTS_CRON_SECRET && !(await isAdminRequest(request))) {
    return jsonError(500, "DOMAIN_EVENTS_CRON_SECRET is not configured.");
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
