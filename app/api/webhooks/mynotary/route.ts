import { timingSafeEqual } from "crypto";
import { after, NextResponse } from "next/server";
import { hashValue } from "@/lib/audit/hash";
import { serverEnv } from "@/lib/env/server";
import { parseMyNotaryWebhook } from "@/lib/mynotary/webhook-envelope";
import {
  processPendingMyNotaryEvents,
  recordMyNotaryEvent,
} from "@/services/mynotary/event-inbox.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Webhook MyNotary — boîte de réception.
 *
 * La requête fait trois choses et rien d'autre : authentifier (en-tête
 * dédié configuré chez MyNotary, comparaison à temps constant), lire les
 * en-têtes `x-mynotary-event-id` / `x-mynotary-event-creation-time` et
 * insérer l'événement brut dans `mynotary_events`. Un doublon est ignoré
 * et renvoie 2xx. Le traitement métier tourne après la réponse
 * (`after()`), puis par le cron `/api/internal/cron/mynotary-events` en
 * filet de sécurité : MyNotary exige une réponse 2xx en moins de 60 s et
 * abandonne l'événement après 12 échecs.
 */

const safeEqual = (a: string, b: string) => {
  if (!a || !b || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
};

const authorize = (request: Request): boolean => {
  const headerName = (serverEnv.MYNOTARY_WEBHOOK_AUTH_HEADER || "x-mynotary-secret").toLowerCase();
  const expected = serverEnv.MYNOTARY_WEBHOOK_AUTH_VALUE || "";
  if (!expected) {
    console.warn("[mynotary-webhook] MYNOTARY_WEBHOOK_AUTH_VALUE is not configured");
    return false;
  }
  // En-tête dédié (APIKEY chez MyNotary) ou, si la configuration passe un
  // jour en Bearer, l'en-tête Authorization.
  const received =
    request.headers.get(headerName) ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  return safeEqual(received, expected);
};

export const POST = async (request: Request): Promise<NextResponse> => {
  if (!authorize(request)) {
    console.warn("[mynotary-webhook] unauthorized call");
    return NextResponse.json({ ok: false, code: "unauthorized" }, { status: 401 });
  }

  const rawBody = await request.text();
  const parsed = parseMyNotaryWebhook(rawBody, request.headers, {
    // Sans en-tête d'identifiant (tests, rejeu manuel) : le même corps
    // déduplique quand même.
    fallbackEventId: (body) => `mn:body:${hashValue(body)}`,
  });
  if (!parsed.ok) {
    // Corps illisible : on le dit (400) mais sans faire boucler MyNotary
    // sur un payload que l'on ne saura jamais lire — leur retry s'arrête
    // de lui-même après 12 tentatives, et le 400 reste visible dans les
    // logs pour corriger le parseur.
    console.warn(`[mynotary-webhook] rejected body: ${parsed.code}`);
    return NextResponse.json({ ok: false, code: parsed.code }, { status: 400 });
  }
  if (!parsed.value.eventIdFromHeader) {
    console.warn("[mynotary-webhook] missing x-mynotary-event-id header, using body hash");
  }

  let recorded;
  try {
    recorded = await recordMyNotaryEvent(parsed.value);
  } catch (error) {
    // Base injoignable : 503 pour que MyNotary rejoue plus tard.
    const message = error instanceof Error ? error.message : String(error);
    console.error("[mynotary-webhook] insert failed:", message);
    return NextResponse.json({ ok: false, code: "inbox_unavailable" }, { status: 503 });
  }

  if (!recorded.duplicate) {
    after(async () => {
      try {
        await processPendingMyNotaryEvents({ limit: 10 });
      } catch (error) {
        // L'événement reste en `pending` ; le cron le reprendra.
        console.error(
          "[mynotary-webhook] deferred processing failed:",
          error instanceof Error ? error.message : String(error)
        );
      }
    });
  }

  return NextResponse.json(
    {
      ok: true,
      received: !recorded.duplicate,
      duplicate: recorded.duplicate,
      eventType: parsed.value.eventType,
    },
    { status: 202 }
  );
};
