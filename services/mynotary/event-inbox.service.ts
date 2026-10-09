import "server-only";
import { emitDomainEvent } from "@/lib/events/domain-events";
import { getContract } from "@/lib/mynotary/client";
import type {
  MyNotaryEventType,
  MyNotarySignatureCompletedPayload,
  MyNotaryWebhookEnvelope,
} from "@/lib/mynotary/types";
import type { ParsedMyNotaryWebhook } from "@/lib/mynotary/webhook-envelope";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Database } from "@/types/db/supabase";
import { enrichFromOperation } from "./operation-enrichment.service";
import {
  processSignatureCompleted,
  softDeleteByContractOrOperation,
} from "./signature-completed.service";

/**
 * Boîte de réception MyNotary (étape 1 du registre des dossiers).
 *
 * Deux moments strictement séparés :
 *
 *  1. RÉCEPTION (`recordMyNotaryEvent`) — appelée par la requête webhook :
 *     une insertion dans `mynotary_events`, rien d'autre. La contrainte
 *     UNIQUE(event_id) fait la déduplication ; un doublon est ignoré et
 *     la route répond 2xx quand même (MyNotary rejoue le même événement
 *     jusqu'à 12 fois). Aucun appel réseau, aucun traitement métier :
 *     la réponse part en quelques dizaines de millisecondes.
 *
 *  2. TRAITEMENT (`processPendingMyNotaryEvents`) — hors requête, déclenché
 *     par `after()` juste après la réponse puis par le cron toutes les
 *     5 minutes : réserve un lot d'événements à traiter dans l'ORDRE
 *     d'`event_created_at` (fonction SQL `claim_mynotary_events`, verrou
 *     SKIP LOCKED), applique la projection existante (classification,
 *     enrichissement, rattachement, archivage) et marque chaque ligne
 *     processed / ignored / error. Un échec est repris jusqu'à
 *     MAX_ATTEMPTS, puis reste visible en `error` pour la vue
 *     « Aujourd'hui ».
 *
 * À l'étape 3 (modèle « dossier »), seule la fonction `handleMyNotaryEvent`
 * change de cible ; la réception et la file restent telles quelles.
 */

type MyNotaryEventRow = Database["public"]["Tables"]["mynotary_events"]["Row"];

export const MYNOTARY_EVENT_MAX_ATTEMPTS = 5;

/** Événements qui déclenchent une projection aujourd'hui. Les autres sont
 *  conservés (journal) et marqués `ignored` avec la raison. */
const PROJECTED_EVENTS = new Set<MyNotaryEventType>([
  "signature_completed",
  "signature_cancel",
  "operation_deleted",
]);

export type RecordMyNotaryEventResult =
  | { duplicate: false; id: string }
  | { duplicate: true; id: string | null };

const POSTGRES_UNIQUE_VIOLATION = "23505";

/** Insertion idempotente. Ne lève que si la base est injoignable. */
export const recordMyNotaryEvent = async (
  parsed: ParsedMyNotaryWebhook
): Promise<RecordMyNotaryEventResult> => {
  const { data, error } = await supabaseAdmin
    .from("mynotary_events")
    .insert({
      event_id: parsed.eventId,
      event_type: parsed.eventType,
      event_created_at: parsed.eventCreatedAt,
      raw_payload: parsed.raw,
      status: "pending",
    })
    .select("id")
    .single();

  if (!error && data) {
    return { duplicate: false, id: data.id };
  }
  if (error?.code === POSTGRES_UNIQUE_VIOLATION) {
    const { data: existing } = await supabaseAdmin
      .from("mynotary_events")
      .select("id")
      .eq("event_id", parsed.eventId)
      .maybeSingle();
    return { duplicate: true, id: existing?.id ?? null };
  }
  throw new Error(error?.message ?? "mynotary_events insert failed");
};

// ---------------------------------------------------------------------
// Traitement différé
// ---------------------------------------------------------------------

export type HandleOutcome =
  | { kind: "processed"; data: Record<string, unknown> }
  | { kind: "ignored"; reason: string };

/**
 * Projection d'un événement. Idempotente : `processSignatureCompleted`
 * fait un upsert sur UNIQUE(mynotary_contract_id), les suppressions sont
 * des soft-deletes. Reconstruit l'enveloppe `{ event, data }` depuis le
 * payload brut, quelle que soit la forme reçue.
 */
export const handleMyNotaryEvent = async (
  eventType: MyNotaryEventType,
  raw: Record<string, unknown>
): Promise<HandleOutcome> => {
  if (!PROJECTED_EVENTS.has(eventType)) {
    return { kind: "ignored", reason: "event_type_ignored" };
  }
  const data =
    typeof raw.data === "object" && raw.data !== null && !Array.isArray(raw.data)
      ? (raw.data as Record<string, unknown>)
      : raw;
  const envelope: MyNotaryWebhookEnvelope = { event: eventType, data };

  if (eventType === "signature_completed") {
    const payload = envelope.data as MyNotarySignatureCompletedPayload;
    if (!payload || typeof payload.contractId === "undefined") {
      return { kind: "ignored", reason: "missing_contract_id" };
    }
    // Le payload ne porte pas le `model` du contrat (mandat / offre /
    // compromis / bail…) : on le lit via l'API pour classifier. Best-effort.
    if (!payload.contractType) {
      try {
        const contract = await getContract(String(payload.contractId));
        if (contract?.model) payload.contractType = contract.model;
        if (!payload.operationType && contract?.label) {
          payload.operationType = contract.label;
        }
      } catch {
        // non bloquant
      }
    }
    let inlineEnrichment = null;
    try {
      inlineEnrichment = await enrichFromOperation(String(payload.operationId));
    } catch {
      // non bloquant
    }
    const result = await processSignatureCompleted({
      payload,
      inlineEnrichment,
      source: "webhook",
    });
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

  if (eventType === "signature_cancel") {
    const payload = envelope.data as { contractId?: number | string };
    if (!payload?.contractId) {
      return { kind: "ignored", reason: "missing_contract_id" };
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
    return { kind: "processed", data: { softDeleted } };
  }

  // operation_deleted
  const payload = envelope.data as { operationId?: number | string };
  if (!payload?.operationId) {
    return { kind: "ignored", reason: "missing_operation_id" };
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
  return { kind: "processed", data: { softDeleted } };
};

const settle = async (
  row: MyNotaryEventRow,
  update: Pick<
    Database["public"]["Tables"]["mynotary_events"]["Update"],
    "status" | "error" | "processed_at"
  >
) => {
  await supabaseAdmin
    .from("mynotary_events")
    .update({ ...update, locked_at: null })
    .eq("id", row.id);
};

export type ProcessPendingResult = {
  claimed: number;
  processed: number;
  ignored: number;
  failed: number;
  errors: Array<{ eventId: string; message: string }>;
};

/**
 * Réserve puis traite un lot d'événements, dans l'ordre d'event_created_at.
 * Sûr à appeler en parallèle (after() + cron) grâce à SKIP LOCKED.
 */
export const processPendingMyNotaryEvents = async (
  input: { limit?: number } = {}
): Promise<ProcessPendingResult> => {
  const limit = Math.max(1, Math.min(input.limit ?? 10, 50));
  const result: ProcessPendingResult = {
    claimed: 0,
    processed: 0,
    ignored: 0,
    failed: 0,
    errors: [],
  };

  const { data: rows, error } = await supabaseAdmin.rpc("claim_mynotary_events", {
    p_limit: limit,
    p_max_attempts: MYNOTARY_EVENT_MAX_ATTEMPTS,
  });
  if (error) {
    throw new Error(`claim_mynotary_events failed: ${error.message}`);
  }
  const claimed = (rows ?? []) as MyNotaryEventRow[];
  result.claimed = claimed.length;

  for (const row of claimed) {
    try {
      const outcome = await handleMyNotaryEvent(
        row.event_type as MyNotaryEventType,
        row.raw_payload ?? {}
      );
      if (outcome.kind === "processed") {
        await settle(row, {
          status: "processed",
          error: null,
          processed_at: new Date().toISOString(),
        });
        result.processed += 1;
      } else {
        await settle(row, {
          status: "ignored",
          error: outcome.reason,
          processed_at: new Date().toISOString(),
        });
        result.ignored += 1;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[mynotary-inbox] ${row.event_type} ${row.event_id} failed:`, message);
      await settle(row, { status: "error", error: message.slice(0, 2000) });
      result.failed += 1;
      result.errors.push({ eventId: row.event_id, message });
    }
  }

  return result;
};

export const getMyNotaryInboxStats = async () => {
  const { data } = await supabaseAdmin
    .from("mynotary_events")
    .select("status, attempts");
  const stats = { pending: 0, processing: 0, processed: 0, ignored: 0, error: 0, exhausted: 0 };
  for (const row of data ?? []) {
    const key = row.status as keyof typeof stats;
    if (key in stats) stats[key] += 1;
    if (row.status === "error" && row.attempts >= MYNOTARY_EVENT_MAX_ATTEMPTS) {
      stats.exhausted += 1;
    }
  }
  return stats;
};
