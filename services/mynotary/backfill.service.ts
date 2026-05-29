import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env/server";
import { listOperations } from "@/lib/mynotary/client";
import {
  isContractSigned,
  type MyNotaryContractSummary,
  type MyNotaryOperationListItem,
  type MyNotarySignatureCompletedPayload,
} from "@/lib/mynotary/types";
import { parseAddressFromOperationLabel } from "@/lib/mynotary/register-entry-parsers";
import { processSignatureCompleted } from "./signature-completed.service";

// Shared backfill engine used by:
//   - scripts/mynotary-backfill.ts (one-shot, full history)
//   - app/api/internal/cron/mynotary-sync/route.ts (daily incremental)
//   - app/api/admin/mynotary/sync/route.ts (manual button)
//
// CANONICAL SOURCE (since 29/05/2026): `GET /operations`. Per MyNotary
// support the `/register-entries` endpoint only tracks the carte-T
// mandate ledger and never exposes offers / preliminary sales, so we
// switched to walking the organization's operations, each of which
// embeds a `contracts[]` array carrying a precise `status`. We ingest
// every contract whose status is SIGNATURE_COMPLETED and classify it
// via its `model`.
//
// Pagination is best-effort: the `page` param appears to be ignored on
// the agency's org (it returns the full set), so we dedupe operations
// by id and stop as soon as a page introduces no new operation.
//
// For incremental runs we keep `last_synced_at` as a client-side
// checkpoint — contracts whose `signatureTime` is strictly older than
// the checkpoint are skipped (the API has no date filter on this
// endpoint).

const APP_SETTINGS_KEY = "mynotary.last_synced_at";
const MAX_PAGES = 50;
const PAGE_SIZE = 100;

type AppSettingsClient = {
  from: (table: "app_settings") => {
    select: (cols: string) => {
      eq: (col: string, value: string) => {
        single: () => Promise<{
          data: { value: { iso?: string } | null } | null;
          error: { message: string } | null;
        }>;
      };
    };
    upsert: (
      row: Record<string, unknown>,
      opts: { onConflict: string }
    ) => Promise<{ error: { message: string } | null }>;
  };
};

export type BackfillRunInput = {
  trigger: "cron" | "manual" | "script";
  // Optional override: bypass last_synced_at and force a date.
  signedSince?: string;
};

export type BackfillRunResult = {
  pagesScanned: number;
  // Number of operations walked.
  operationsSeen: number;
  // Number of contracts inspected across all operations.
  contractsSeen: number;
  // Back-compat alias kept for existing callers / logs.
  entriesSeen: number;
  documentsUpserted: number;
  documentsSkipped: number;
  documentsSoftDeleted: number;
  errors: number;
  lastSyncedAt: string;
};

const readLastSyncedAt = async (): Promise<string | null> => {
  const client = supabaseAdmin as unknown as AppSettingsClient;
  const { data } = await client
    .from("app_settings")
    .select("value")
    .eq("key", APP_SETTINGS_KEY)
    .single();
  if (!data?.value || typeof data.value.iso !== "string") return null;
  return data.value.iso;
};

const writeLastSyncedAt = async (iso: string): Promise<void> => {
  const client = supabaseAdmin as unknown as AppSettingsClient;
  await client.from("app_settings").upsert(
    {
      key: APP_SETTINGS_KEY,
      value: { iso },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );
};

const contractToPayload = (
  operation: MyNotaryOperationListItem,
  contract: MyNotaryContractSummary
): MyNotarySignatureCompletedPayload | null => {
  const operationId = operation.id ?? null;
  const contractId = contract.id ?? null;
  if (operationId === null || contractId === null) return null;
  return {
    signatureId: contractId,
    contractId,
    operationId,
    // The machine model is the most reliable classifier input; the
    // signature service runs it through classifyContractModel.
    contractType: contract.model,
    signedAt: contract.signatureTime ?? contract.creationTime,
    // Operations/contracts list does NOT carry signers or file URLs —
    // those only arrive via the webhook. Backfilled rows therefore have
    // no archived PDF (expected for historical data).
    signers: [],
    files: [],
  };
};

const contractIsOlderThanCheckpoint = (
  contract: MyNotaryContractSummary,
  checkpoint: string | null
): boolean => {
  if (!checkpoint) return false;
  const candidate = contract.signatureTime ?? contract.creationTime ?? null;
  if (!candidate) return false;
  const ts = Date.parse(candidate);
  if (!Number.isFinite(ts)) return false;
  return ts < Date.parse(checkpoint);
};

export const runIncrementalBackfill = async (
  input: BackfillRunInput
): Promise<BackfillRunResult> => {
  if (!serverEnv.MYNOTARY_API_KEY) {
    throw new Error("MYNOTARY_API_KEY is missing");
  }
  if (!serverEnv.MYNOTARY_ORGANIZATION_ID) {
    throw new Error("MYNOTARY_ORGANIZATION_ID is missing");
  }
  const organizationId = serverEnv.MYNOTARY_ORGANIZATION_ID;
  const runStartedAt = new Date().toISOString();
  // Manual + script runs do a full re-scan; only the cron uses the
  // checkpoint (and only when no explicit signedSince override).
  const useCheckpoint =
    input.trigger === "cron" && input.signedSince === undefined;
  const checkpoint =
    input.signedSince ??
    (useCheckpoint ? await readLastSyncedAt() : null) ??
    null;

  let pagesScanned = 0;
  let operationsSeen = 0;
  let contractsSeen = 0;
  let documentsUpserted = 0;
  let documentsSkipped = 0;
  const documentsSoftDeleted = 0;
  let errors = 0;

  const seenOperationIds = new Set<string>();

  for (let page = 0; page < MAX_PAGES; page += 1) {
    let operations: MyNotaryOperationListItem[] = [];
    try {
      operations = await listOperations({
        organizationId,
        page,
        pageSize: PAGE_SIZE,
      });
    } catch {
      errors += 1;
      break;
    }
    pagesScanned += 1;

    // Dedupe across pages (the `page` param may be ignored server-side).
    let newOnThisPage = 0;
    for (const operation of operations) {
      const opId = String(operation.id);
      if (seenOperationIds.has(opId)) continue;
      seenOperationIds.add(opId);
      newOnThisPage += 1;
      operationsSeen += 1;

      const inlineAddress = parseAddressFromOperationLabel(operation.label);
      const contracts = Array.isArray(operation.contracts)
        ? operation.contracts
        : [];

      for (const contract of contracts) {
        contractsSeen += 1;

        // Only signed contracts belong in the canonical table.
        if (!isContractSigned(contract.status)) {
          documentsSkipped += 1;
          continue;
        }
        if (contractIsOlderThanCheckpoint(contract, checkpoint)) {
          documentsSkipped += 1;
          continue;
        }

        const payload = contractToPayload(operation, contract);
        if (!payload) {
          documentsSkipped += 1;
          continue;
        }

        try {
          const outcome = await processSignatureCompleted({
            payload,
            inlineAddress,
            inlineRawEntry: {
              operation_label: operation.label ?? null,
              operation_type: operation.type ?? null,
              contract,
            },
            source: "backfill",
          });
          if (outcome.skipped) documentsSkipped += 1;
          else documentsUpserted += 1;
        } catch {
          errors += 1;
        }
      }
    }

    // Stop when the API returns nothing new (or an empty page).
    if (operations.length === 0 || newOnThisPage === 0) break;
  }

  // Only advance the checkpoint on a clean run that actually saw data,
  // to avoid poisoning the next incremental run.
  if (errors === 0 && operationsSeen > 0) {
    await writeLastSyncedAt(runStartedAt);
  }

  return {
    pagesScanned,
    operationsSeen,
    contractsSeen,
    entriesSeen: contractsSeen,
    documentsUpserted,
    documentsSkipped,
    documentsSoftDeleted,
    errors,
    lastSyncedAt: runStartedAt,
  };
};
