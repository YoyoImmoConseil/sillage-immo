import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env/server";
import { getRegisterEntries } from "@/lib/mynotary/client";
import type {
  MyNotaryRegisterEntry,
  MyNotaryRegisterType,
  MyNotarySignatureCompletedPayload,
} from "@/lib/mynotary/types";
import { processSignatureCompleted } from "./signature-completed.service";

// Shared backfill engine used by:
//   - scripts/mynotary-backfill.ts (one-shot, full history)
//   - app/api/internal/cron/mynotary-sync/route.ts (daily incremental,
//     bumps `app_settings.mynotary.last_synced_at`)
//   - app/api/admin/mynotary/sync/route.ts (manual button)
//
// Per the MyNotary spec the `/register-entries` endpoint is paginated
// by integer pages (no cursor / no `signedSince` filter) and a
// `type` filter is required per request. The engine therefore loops
// over both registers (MANAGEMENT for mandats, TRANSACTION for
// promesses / compromis / actes) and walks pages until the page
// returns fewer than `pageSize` items.
//
// For incremental runs we keep the `last_synced_at` timestamp as a
// SAFETY CHECKPOINT — entries whose `creationTime` is strictly older
// than the checkpoint are skipped (the API itself does not support a
// date filter, so we do it client-side). On the first run the
// checkpoint is null and we walk the full history.

const APP_SETTINGS_KEY = "mynotary.last_synced_at";
const MAX_PAGES_PER_REGISTER = 50;
const PAGE_SIZE = 100;
const REGISTERS: MyNotaryRegisterType[] = ["MANAGEMENT", "TRANSACTION"];

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
  entriesSeen: number;
  documentsUpserted: number;
  documentsSkipped: number;
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

// Per-register heuristic: the MANAGEMENT register only holds
// mandates, so we hint the contract type for entries that don't ship
// `contractType` explicitly. TRANSACTION entries cover purchase
// offers + preliminary sales + deeds — we let `resolveContractKind`
// figure it out from the entry's free-form fields.
const inferContractType = (
  entry: MyNotaryRegisterEntry,
  register: MyNotaryRegisterType
): string => {
  if (entry.contractType && entry.contractType.trim().length > 0) {
    return entry.contractType;
  }
  if (typeof entry.typeDeMandat === "string" && entry.typeDeMandat.trim().length > 0) {
    return entry.typeDeMandat;
  }
  if (register === "MANAGEMENT") return "mandat";
  return "";
};

const entryToPayload = (
  entry: MyNotaryRegisterEntry,
  register: MyNotaryRegisterType
): MyNotarySignatureCompletedPayload | null => {
  // Per the spec, the register entry exposes `legalOperationId` and
  // `id` (string). Sillage's earlier shape used `operationId` /
  // `contractId`; we read whichever is present.
  const operationId = entry.operationId ?? entry.legalOperationId ?? null;
  const contractId = entry.contractId ?? entry.id ?? null;
  if (!operationId || !contractId) return null;
  return {
    signatureId: entry.id ?? contractId,
    contractId,
    contractType: inferContractType(entry, register),
    operationId,
    signedAt: entry.signedAt ?? entry.signatureTime ?? entry.creationTime,
    signers: entry.signers,
    files: entry.files,
  };
};

const entryIsOlderThanCheckpoint = (
  entry: MyNotaryRegisterEntry,
  checkpoint: string | null
): boolean => {
  if (!checkpoint) return false;
  const candidate =
    entry.signatureTime ?? entry.signedAt ?? entry.creationTime ?? null;
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
  const checkpoint =
    input.signedSince ?? (await readLastSyncedAt()) ?? null;

  let pagesScanned = 0;
  let entriesSeen = 0;
  let documentsUpserted = 0;
  let documentsSkipped = 0;
  let errors = 0;

  // Iterate both registers; each one is paginated independently.
  for (const register of REGISTERS) {
    for (let page = 1; page <= MAX_PAGES_PER_REGISTER; page += 1) {
      const result = await getRegisterEntries({
        organizationId,
        type: register,
        page,
        pageSize: PAGE_SIZE,
      });
      pagesScanned += 1;
      entriesSeen += result.entries.length;

      for (const entry of result.entries) {
        if (entryIsOlderThanCheckpoint(entry, checkpoint)) {
          documentsSkipped += 1;
          continue;
        }
        const payload = entryToPayload(entry, register);
        if (!payload) {
          documentsSkipped += 1;
          continue;
        }
        try {
          const outcome = await processSignatureCompleted({
            payload,
            source: "backfill",
            registerType: register,
          });
          if (outcome.skipped) documentsSkipped += 1;
          else documentsUpserted += 1;
        } catch {
          errors += 1;
        }
      }

      if (!result.hasMore) break;
    }
  }

  if (input.trigger !== "manual" || errors === 0) {
    await writeLastSyncedAt(runStartedAt);
  }

  return {
    pagesScanned,
    entriesSeen,
    documentsUpserted,
    documentsSkipped,
    errors,
    lastSyncedAt: runStartedAt,
  };
};
