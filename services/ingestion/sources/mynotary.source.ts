import "server-only";
import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { hashValue } from "@/lib/audit/hash";
import { serverEnv } from "@/lib/env/server";
import { emitDomainEvent } from "@/lib/events/domain-events";
import type {
  SyncWebhookSource,
  WebhookProcessOutcome,
} from "@/lib/ingestion/webhook-handler";
import { getContract } from "@/lib/mynotary/client";
import type {
  MyNotaryEventType,
  MyNotarySignatureCompletedPayload,
  MyNotaryWebhookEnvelope,
} from "@/lib/mynotary/types";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { enrichFromOperation } from "@/services/mynotary/operation-enrichment.service";
import {
  processSignatureCompleted,
  softDeleteByContractOrOperation,
} from "@/services/mynotary/signature-completed.service";

/**
 * Source MyNotary (signatures / suppressions).
 *
 * Mode sync : la réponse renvoie le résultat du traitement (skipped,
 * contractKind, matched, confidence…), comme historiquement.
 *
 * Le rail apporte ce qui manquait :
 *  - idempotence robuste : clé = eventId MyNotary, ou hash du body quand
 *    MyNotary n'envoie pas d'eventId (l'ancien fallback générait un id
 *    aléatoire qui cassait la déduplication) ;
 *  - retry : un échec de traitement marque la livraison `failed` et le
 *    cron rejoue (processSignatureCompleted est idempotent — upsert sur
 *    UNIQUE(mynotary_contract_id)). Avant, l'événement était mort.
 *
 * La table `mynotary_events` reste alimentée comme journal brut métier
 * (continuité ops / debug) ; la mécanique de file vit dans le rail.
 */

const SUPPORTED_EVENTS = new Set<MyNotaryEventType>([
  "signature_completed",
  "signature_cancel",
  "operation_deleted",
]);

/** Erreur dédiée pour conserver le code HTTP historique `event_log_failed`. */
class MyNotaryEventLogError extends Error {}

const safeEqual = (a: string, b: string) => {
  if (!a || !b || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
};

const authorize = (request: Request): boolean => {
  const headerName = (serverEnv.MYNOTARY_WEBHOOK_AUTH_HEADER || "x-mynotary-secret")
    .toLowerCase();
  const expected = serverEnv.MYNOTARY_WEBHOOK_AUTH_VALUE || "";
  if (!expected) {
    console.warn(
      "[mynotary-webhook] auth failed: MYNOTARY_WEBHOOK_AUTH_VALUE is not configured"
    );
    return false;
  }
  const received = request.headers.get(headerName) ?? "";
  const ok = safeEqual(received, expected);
  if (!ok) {
    console.warn("[mynotary-webhook] auth failed: invalid or missing secret header");
  }
  return ok;
};

type StoredMyNotaryPayload = {
  event_id: string;
  envelope: MyNotaryWebhookEnvelope;
};

/**
 * Journal brut `mynotary_events`, idempotent sur UNIQUE(event_id).
 * Retourne l'id de ligne + un drapeau "déjà traité avec succès" (replay
 * d'un événement ingéré avant la mise en place du rail).
 */
const logMyNotaryEvent = async (input: {
  eventId: string;
  envelope: MyNotaryWebhookEnvelope;
}): Promise<{ eventDbId: string; alreadyProcessed: boolean }> => {
  const { data, error } = await supabaseAdmin
    .from("mynotary_events")
    .insert({
      event_id: input.eventId,
      event_type: input.envelope.event ?? "unknown",
      raw_payload: input.envelope as unknown as Record<string, unknown>,
    })
    .select("id")
    .single();

  if (!error && data) {
    return { eventDbId: data.id, alreadyProcessed: false };
  }

  if (error && error.code === "23505") {
    const { data: existing, error: readError } = await supabaseAdmin
      .from("mynotary_events")
      .select("id, processed_at, error")
      .eq("event_id", input.eventId)
      .single();

    if (readError || !existing) {
      throw new MyNotaryEventLogError(
        readError?.message ?? "Unable to load existing MyNotary event."
      );
    }
    // Déjà traité sans erreur → replay ; sinon (échec ou verdict "ignored"
    // historique), on retraite de façon idempotente.
    const alreadyProcessed =
      existing.processed_at !== null && existing.error === null;
    return { eventDbId: existing.id, alreadyProcessed };
  }

  console.error(
    "[mynotary-webhook] event log failed:",
    error?.message ?? "no row returned"
  );
  throw new MyNotaryEventLogError(error?.message ?? "MyNotary event log failed.");
};

const markEventProcessed = async (eventDbId: string, error?: string | null) => {
  await supabaseAdmin
    .from("mynotary_events")
    .update({
      processed_at: new Date().toISOString(),
      error: error ?? null,
    })
    .eq("id", eventDbId);
};

const ignoredOutcome = (
  eventDbId: string,
  reason: string
): Promise<WebhookProcessOutcome> =>
  markEventProcessed(eventDbId, reason).then(() => ({
    kind: "ignored" as const,
    reason,
    data: { ignored: true },
  }));

const handleEnvelope = async (
  envelope: MyNotaryWebhookEnvelope,
  eventDbId: string
): Promise<WebhookProcessOutcome> => {
  if (!envelope.event || !SUPPORTED_EVENTS.has(envelope.event)) {
    return ignoredOutcome(eventDbId, "event_type_ignored");
  }

  if (envelope.event === "signature_completed") {
    const payload = envelope.data as MyNotarySignatureCompletedPayload;
    if (!payload || typeof payload.contractId === "undefined") {
      return ignoredOutcome(eventDbId, "missing_contract_id");
    }
    // Le payload signature_completed ne porte pas le `model` du contrat
    // (mandat / offre / compromis…) : on le récupère pour classifier.
    // Best-effort — un échec n'empêche pas l'ingestion.
    if (!payload.contractType) {
      try {
        const contract = await getContract(String(payload.contractId));
        if (contract?.model) payload.contractType = contract.model;
        if (!payload.operationType && contract?.label) {
          payload.operationType = contract.label;
        }
      } catch {
        // non-blocking enrichment
      }
    }
    // Enrichissement depuis le détail de l'opération (parties, prix,
    // surface Loi Carrez). Best-effort également.
    let inlineEnrichment = null;
    try {
      inlineEnrichment = await enrichFromOperation(String(payload.operationId));
    } catch {
      // non-blocking enrichment
    }
    const result = await processSignatureCompleted({
      payload,
      inlineEnrichment,
      source: "webhook",
    });
    await markEventProcessed(eventDbId, null);
    return {
      kind: "processed",
      data: {
        skipped: result.skipped,
        contractKind: result.contractKind,
        matched: result.matched,
        confidence: result.confidence,
      },
    };
  }

  if (envelope.event === "signature_cancel") {
    const payload = envelope.data as { contractId?: number | string };
    if (!payload?.contractId) {
      return ignoredOutcome(eventDbId, "missing_contract_id");
    }
    const { softDeleted } = await softDeleteByContractOrOperation({
      mynotaryContractId: String(payload.contractId),
    });
    if (softDeleted > 0) {
      await emitDomainEvent({
        aggregateType: "mynotary_document",
        aggregateId: String(payload.contractId),
        eventName: "mynotary.document_soft_deleted",
        payload: { reason: "signature_cancel", softDeleted },
      });
    }
    await markEventProcessed(eventDbId, null);
    return { kind: "processed", data: { softDeleted } };
  }

  // operation_deleted
  const payload = envelope.data as { operationId?: number | string };
  if (!payload?.operationId) {
    return ignoredOutcome(eventDbId, "missing_operation_id");
  }
  const { softDeleted } = await softDeleteByContractOrOperation({
    mynotaryOperationId: String(payload.operationId),
  });
  if (softDeleted > 0) {
    await emitDomainEvent({
      aggregateType: "mynotary_document",
      aggregateId: String(payload.operationId),
      eventName: "mynotary.document_soft_deleted",
      payload: { reason: "operation_deleted", softDeleted },
    });
  }
  await markEventProcessed(eventDbId, null);
  return { kind: "processed", data: { softDeleted } };
};

export const myNotaryWebhookSource: SyncWebhookSource = {
  provider: "mynotary",
  mode: "sync",

  authenticate: (request) => {
    if (authorize(request)) {
      return { ok: true };
    }
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, code: "unauthorized" },
        { status: 401 }
      ),
    };
  },

  parse: (rawBody, request) => {
    let envelope: MyNotaryWebhookEnvelope | null = null;
    try {
      envelope = JSON.parse(rawBody) as MyNotaryWebhookEnvelope;
    } catch {
      envelope = null;
    }
    if (!envelope || typeof envelope.event !== "string") {
      return {
        ok: false,
        response: NextResponse.json(
          { ok: false, code: "invalid_payload" },
          { status: 400 }
        ),
      };
    }

    const fromBody = typeof envelope.eventId === "string" ? envelope.eventId : "";
    const fromHeader =
      request.headers.get("x-mynotary-event-id") ??
      request.headers.get("x-event-id") ??
      "";
    // Clé d'idempotence : l'eventId MyNotary quand il existe, sinon le
    // hash du body — un même payload rejoué sans eventId déduplique
    // (l'ancien fallback aléatoire ne le garantissait pas).
    const eventId =
      fromBody.length > 0
        ? fromBody
        : fromHeader.length > 0
          ? fromHeader
          : `mn:body:${hashValue(rawBody)}`;

    const stored: StoredMyNotaryPayload = { event_id: eventId, envelope };

    return {
      ok: true,
      eventName: envelope.event,
      eventKey: hashValue(`mynotary:${eventId}`),
      payload: stored as unknown as Record<string, unknown>,
    };
  },

  process: async (delivery): Promise<WebhookProcessOutcome> => {
    const stored = delivery.payload as unknown as StoredMyNotaryPayload;
    const { eventDbId, alreadyProcessed } = await logMyNotaryEvent({
      eventId: stored.event_id,
      envelope: stored.envelope,
    });

    if (alreadyProcessed) {
      return {
        kind: "ignored",
        reason: "replayed",
        data: { replayed: true },
      };
    }

    try {
      return await handleEnvelope(stored.envelope, eventDbId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "processing_failed";
      // Le détail reste en base (mynotary_events.error + livraison) et en
      // logs serveur, mais n'est pas renvoyé à l'appelant.
      console.error("[mynotary-webhook] processing failed:", message);
      await markEventProcessed(eventDbId, message);
      throw err;
    }
  },

  respond: (outcome) => NextResponse.json({ ok: true, ...outcome.data }),

  respondDuplicate: () => NextResponse.json({ ok: true, replayed: true }),

  respondError: (error) => {
    if (error instanceof MyNotaryEventLogError) {
      return NextResponse.json(
        { ok: false, code: "event_log_failed" },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { ok: false, code: "processing_failed" },
      { status: 500 }
    );
  },
};
