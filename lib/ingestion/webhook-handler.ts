import "server-only";
import { after, NextResponse } from "next/server";
import {
  markDeliveryFailed,
  markDeliveryIgnored,
  markDeliveryProcessed,
  markDeliveryProcessing,
  registerWebhookDelivery,
  type WebhookDeliveryRow,
} from "@/lib/ingestion/delivery-queue";

/**
 * Rail d'ingestion — fabrique de handler webhook.
 *
 * Une source déclare uniquement sa sémantique (auth, parsing, traitement,
 * formats de réponse) ; le rail factorise la mécanique commune :
 * enregistrement persisté, déduplication, statuts, retry, persistance de
 * la réponse HTTP pour rejouer un doublon à l'identique.
 *
 * Deux modes de traitement :
 *  - "sync"  : le traitement s'exécute dans la requête et son résultat
 *              nourrit la réponse (Zapier, MyNotary) ;
 *  - "async" : ACK immédiat, traitement lourd différé via after(),
 *              repris par cron en cas d'échec (SweepBright).
 */

export type WebhookAuthResult =
  | { ok: true }
  | { ok: false; response: NextResponse };

export type WebhookParseResult =
  | {
      ok: true;
      eventName: string;
      /** Clé d'idempotence : stable pour un même événement logique. */
      eventKey: string;
      /** Payload normalisé, persisté tel quel dans la file. */
      payload: Record<string, unknown>;
      signature?: string | null;
      estateId?: string | null;
      companyId?: string | null;
    }
  | { ok: false; response: NextResponse };

/**
 * Verdict du processeur d'une source (mode "sync") :
 *  - "processed" : succès complet ;
 *  - "ignored"   : donnée non rattachable / événement non supporté — la
 *                  livraison est close gracieusement (pas de retry) ;
 *  - "partial"   : la partie critique a réussi (la réponse HTTP doit être
 *                  un succès pour ne pas faire échouer l'émetteur), mais un
 *                  effet secondaire a échoué — la livraison est marquée
 *                  `failed` pour que le cron la rejoue.
 */
export type WebhookProcessOutcome =
  | { kind: "processed"; data: Record<string, unknown> }
  | { kind: "ignored"; reason: string; data: Record<string, unknown> }
  | { kind: "partial"; data: Record<string, unknown>; retryError: string };

type WebhookSourceBase = {
  provider: string;
  authenticate: (request: Request, rawBody: string) => WebhookAuthResult;
  parse: (
    rawBody: string,
    request: Request
  ) => WebhookParseResult | Promise<WebhookParseResult>;
  /** Réponse à un doublon déjà traité (processed / ignored / processing). */
  respondDuplicate: (delivery: WebhookDeliveryRow) => NextResponse;
  /**
   * Si vrai, un doublon d'une livraison close en `ignored` est retraité au
   * lieu de rejouer la réponse stockée. Utile quand "ignoré" dépend d'un
   * état qui peut évoluer (ex. Zapier `property_not_found` : un replay
   * manuel après ingestion du bien doit enregistrer la visite).
   */
  reprocessIgnoredDuplicates?: boolean;
};

export type SyncWebhookSource = WebhookSourceBase & {
  mode: "sync";
  /**
   * Traitement métier idempotent. Appelé dans la requête ET par le cron de
   * retry : il ne doit dépendre que de `delivery.payload`.
   */
  process: (delivery: WebhookDeliveryRow) => Promise<WebhookProcessOutcome>;
  /** Construit la réponse HTTP de succès à partir du verdict. */
  respond: (
    outcome: WebhookProcessOutcome,
    delivery: WebhookDeliveryRow
  ) => NextResponse;
  respondError: (error: unknown) => NextResponse;
};

export type AsyncWebhookSource = WebhookSourceBase & {
  mode: "async";
  /** Traitement différé ; gère lui-même les statuts de la livraison. */
  processAsync: (deliveryId: string) => Promise<unknown>;
  respondAccepted: (delivery: WebhookDeliveryRow) => NextResponse;
  respondError: (error: unknown) => NextResponse;
};

export type WebhookSource = SyncWebhookSource | AsyncWebhookSource;

const responseSnapshot = async (response: NextResponse) => {
  try {
    const payload = (await response.clone().json()) as Record<string, unknown>;
    return { status: response.status, payload };
  } catch {
    return undefined;
  }
};

/**
 * Exécute le processeur d'une source "sync" sur une livraison et applique
 * le verdict aux statuts de la file. Utilisé par le handler HTTP et par le
 * cron de retry (`processPendingWebhookDeliveries`).
 */
export const runSyncProcessor = async (
  source: SyncWebhookSource,
  delivery: WebhookDeliveryRow
): Promise<WebhookProcessOutcome> => {
  const outcome = await source.process(delivery);
  if (outcome.kind === "processed") {
    await markDeliveryProcessed(delivery.id);
  } else if (outcome.kind === "ignored") {
    await markDeliveryIgnored(delivery.id, outcome.reason);
  } else {
    await markDeliveryFailed(delivery.id, outcome.retryError);
  }
  return outcome;
};

const isReprocessableDuplicate = (
  source: WebhookSource,
  delivery: WebhookDeliveryRow
) =>
  delivery.status === "failed" ||
  delivery.status === "received" ||
  (delivery.status === "ignored" && source.reprocessIgnoredDuplicates === true);

export const createWebhookHandler = (source: WebhookSource) => {
  return async (request: Request): Promise<NextResponse> => {
    const rawBody = await request.text();

    const auth = source.authenticate(request, rawBody);
    if (!auth.ok) {
      return auth.response;
    }

    const parsed = await source.parse(rawBody, request);
    if (!parsed.ok) {
      return parsed.response;
    }

    let registration;
    try {
      registration = await registerWebhookDelivery({
        provider: source.provider,
        eventName: parsed.eventName,
        eventKey: parsed.eventKey,
        payload: parsed.payload,
        signature: parsed.signature ?? null,
        estateId: parsed.estateId ?? null,
        companyId: parsed.companyId ?? null,
      });
    } catch (error) {
      return source.respondError(error);
    }

    const delivery = registration.delivery;

    if (registration.duplicate) {
      if (source.mode === "async" || !isReprocessableDuplicate(source, delivery)) {
        return source.respondDuplicate(delivery);
      }
      // Doublon d'une livraison en échec (ou ignorée si la source l'autorise) :
      // l'émetteur retente — on retraite (le processeur est idempotent) au
      // lieu de rejouer l'ancienne réponse.
    }

    if (source.mode === "async") {
      after(async () => {
        try {
          await source.processAsync(delivery.id);
        } catch {
          // l'état d'échec est persisté dans la file ; le cron rejouera
        }
      });
      return source.respondAccepted(delivery);
    }

    try {
      await markDeliveryProcessing(delivery.id, delivery.attempts ?? 0);
      const outcome = await source.process(delivery);
      const response = source.respond(outcome, delivery);
      const snapshot = await responseSnapshot(response);
      if (outcome.kind === "processed") {
        await markDeliveryProcessed(delivery.id, snapshot);
      } else if (outcome.kind === "ignored") {
        await markDeliveryIgnored(delivery.id, outcome.reason, snapshot);
      } else {
        await markDeliveryFailed(delivery.id, outcome.retryError);
      }
      return response;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Webhook processing failed.";
      try {
        await markDeliveryFailed(delivery.id, message);
      } catch {
        // la livraison reste en `processing` ; le cron la verra expirer
      }
      return source.respondError(error);
    }
  };
};
