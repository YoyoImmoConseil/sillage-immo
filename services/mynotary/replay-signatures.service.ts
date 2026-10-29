import "server-only";
import { serverEnv } from "@/lib/env/server";
import { getSignature, listOperations } from "@/lib/mynotary/client";
import { isContractSigned, type MyNotaryOperationListItem } from "@/lib/mynotary/types";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Rattrapage MyNotary : rejoue toutes les signatures dans la boîte de
 * réception. Pour chaque contrat SIGNATURE_COMPLETED de l'organisation, on
 * fabrique un événement `signature_completed` identique à celui qu'enverrait
 * le webhook (signataires et identifiants des fichiers signés lus via
 * GET /signatures/{id}) et on l'insère en `pending` dans `mynotary_events`
 * (event_id `backfill:contract:<contractId>`). Le traitement différé habituel
 * (cron mynotary-events) fait ensuite la projection : rien n'est écrit ici
 * dans `mynotary_signed_documents` ni dans le bucket.
 *
 * Pourquoi pas la synchro quotidienne (`runIncrementalBackfill`) : la liste
 * des opérations ne porte ni signataires ni fichiers, elle crée donc des
 * lignes sans archive. Ce rejeu complète ces lignes (upsert par contrat).
 *
 * Idempotent (un contrat déjà déposé est ignoré avant tout appel API) et en
 * lecture seule côté MyNotary.
 */

const MAX_PAGES = 50;
const PAGE_SIZE = 100;
const PAUSE_MS = 120;
const EVENT_ID_PREFIX = "backfill:contract:";

export type ReplaySignaturesInput = {
  /** Ne rejoue que les contrats signés à partir de cette date (ISO). */
  since?: string | null;
  /** Compte sans rien écrire. */
  dryRun?: boolean;
  /** Budget de temps (ms) : au-delà, on s'arrête proprement (`partial`). */
  timeBudgetMs?: number;
  /** Nombre maximal de contrats à déposer par appel (rejeu par lots). */
  maxContracts?: number;
};

export type ReplaySignaturesResult = {
  dryRun: boolean;
  operations: number;
  contracts: number;
  signed: number;
  alreadyQueued: number;
  skippedSince: number;
  withFiles: number;
  inserted: number;
  duplicates: number;
  errors: number;
  partial: boolean;
  sample: string[];
  timings: { listOperationsMs: number; queuedMs: number; loopMs: number };
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const listAllOperations = async (organizationId: string): Promise<MyNotaryOperationListItem[]> => {
  const operations: MyNotaryOperationListItem[] = [];
  const seen = new Set<string>();
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const rows = await listOperations({ organizationId, page, pageSize: PAGE_SIZE });
    let added = 0;
    for (const operation of rows) {
      const id = String(operation.id);
      if (seen.has(id)) continue;
      seen.add(id);
      operations.push(operation);
      added += 1;
    }
    if (rows.length === 0 || added === 0) break;
    await sleep(PAUSE_MS);
  }
  return operations;
};

const listQueuedContractIds = async (): Promise<Set<string>> => {
  const { data, error } = await supabaseAdmin
    .from("mynotary_events")
    .select("event_id")
    .like("event_id", `${EVENT_ID_PREFIX}%`);
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((row) => String(row.event_id).slice(EVENT_ID_PREFIX.length)));
};

export const replaySignedContracts = async (
  input: ReplaySignaturesInput = {}
): Promise<ReplaySignaturesResult> => {
  if (!serverEnv.MYNOTARY_API_KEY) throw new Error("MYNOTARY_API_KEY is missing");
  if (!serverEnv.MYNOTARY_ORGANIZATION_ID) throw new Error("MYNOTARY_ORGANIZATION_ID is missing");
  const organizationId = serverEnv.MYNOTARY_ORGANIZATION_ID;
  const dryRun = input.dryRun === true;
  const sinceTs = input.since ? Date.parse(input.since) : null;
  const deadline = Date.now() + (input.timeBudgetMs ?? 240_000);

  const result: ReplaySignaturesResult = {
    dryRun,
    operations: 0,
    contracts: 0,
    signed: 0,
    alreadyQueued: 0,
    skippedSince: 0,
    withFiles: 0,
    inserted: 0,
    duplicates: 0,
    errors: 0,
    partial: false,
    sample: [],
    timings: { listOperationsMs: 0, queuedMs: 0, loopMs: 0 },
  };
  const maxContracts = input.maxContracts ?? Number.POSITIVE_INFINITY;
  let handled = 0;

  const t0 = Date.now();
  const operations = await listAllOperations(organizationId);
  result.timings.listOperationsMs = Date.now() - t0;
  const t1 = Date.now();
  const queued = await listQueuedContractIds();
  result.timings.queuedMs = Date.now() - t1;
  result.operations = operations.length;
  const loopStart = Date.now();

  for (const operation of operations) {
    const contracts = Array.isArray(operation.contracts) ? operation.contracts : [];
    for (const contract of contracts) {
      result.contracts += 1;
      if (!isContractSigned(contract.status)) continue;
      const signatureTime = contract.signatureTime ?? contract.creationTime ?? null;
      if (sinceTs && signatureTime && Date.parse(signatureTime) < sinceTs) {
        result.skippedSince += 1;
        continue;
      }
      result.signed += 1;
      const contractId = String(contract.id);
      if (queued.has(contractId)) {
        result.alreadyQueued += 1;
        continue;
      }
      if (Date.now() > deadline || handled >= maxContracts) {
        result.partial = true;
        result.timings.loopMs = Date.now() - loopStart;
        return result;
      }
      handled += 1;

      const rawContract = asRecord(contract);
      const signatureId =
        rawContract.currentSignatureId ?? rawContract.signatureId ?? null;
      const files: Array<{ signedFileId: string; name: string }> = [];
      const signers: Array<Record<string, unknown>> = [];
      if (signatureId !== null && signatureId !== undefined) {
        try {
          const signature = await getSignature(String(signatureId));
          const signatureFiles = signature?.files ?? [];
          // GET /signatures/{id} porte le nom réel de chaque fichier (« Mandat de vente.pdf »).
          for (const [index, file] of signatureFiles.entries()) {
            if (!file?.signedFileId) continue;
            const fallback =
              signatureFiles.length > 1
                ? `${contract.label ?? "document"} (${index + 1})`
                : (contract.label ?? "document");
            const name = typeof file.name === "string" && file.name.trim() ? file.name.trim().replace(/\.pdf$/i, "") : fallback;
            files.push({ signedFileId: file.signedFileId, name });
          }
          for (const signatory of signature?.signatories ?? []) {
            signers.push({
              recordId: signatory.id,
              firstName: signatory.firstname ?? undefined,
              lastName: signatory.lastname ?? undefined,
              email: signatory.email ?? undefined,
              phone: signatory.phone ?? undefined,
              role: signatory.type ?? undefined,
            });
          }
          await sleep(PAUSE_MS);
        } catch {
          result.errors += 1;
        }
      }
      if (files.length > 0) result.withFiles += 1;
      if (result.sample.length < 12) {
        result.sample.push(
          `${operation.label ?? operation.id} · ${contract.label ?? contract.model} · ${signatureTime ?? "?"} · ${files.length} fichier(s)`
        );
      }
      if (dryRun) continue;

      const payload = {
        eventId: "signature_completed",
        organizationId: Number(organizationId),
        operationId: operation.id,
        contractId: contract.id,
        signatureId: signatureId ?? contract.id,
        signatureTime,
        contractType: contract.model,
        operationType: operation.label ?? operation.type ?? undefined,
        files,
        signers,
        _replay: { source: "replay-signatures.service", at: new Date().toISOString(), operationLabel: operation.label ?? null },
      };
      const { error } = await supabaseAdmin.from("mynotary_events").insert({
        event_id: `${EVENT_ID_PREFIX}${contractId}`,
        event_type: "signature_completed",
        event_created_at: signatureTime,
        raw_payload: payload,
        status: "pending",
      });
      if (!error) result.inserted += 1;
      else if (error.code === "23505") result.duplicates += 1;
      else result.errors += 1;
    }
  }
  result.timings.loopMs = Date.now() - loopStart;
  return result;
};
