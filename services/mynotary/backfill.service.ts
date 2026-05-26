import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env/server";
import { getRegisterEntries } from "@/lib/mynotary/client";
import type {
  MyNotaryRegisterEntry,
  MyNotarySignatureCompletedPayload,
} from "@/lib/mynotary/types";
import { processSignatureCompleted } from "./signature-completed.service";

// Shared backfill engine used by:
//   - scripts/mynotary-backfill.ts (one-shot, no date filter)
//   - app/api/cron/mynotary-sync/route.ts (daily incremental,
//     signedSince = app_settings.mynotary.last_synced_at)
//   - app/api/admin/mynotary/sync/route.ts (manual button in /admin/mynotary)
//
// The engine walks GET /register-entries pages, converts each entry
// to the `processSignatureCompleted` input shape, and lets that
// service handle idempotence (mynotary_contract_id UNIQUE) and the
// auto-match. After a successful run, the last_synced_at is bumped.

const APP_SETTINGS_KEY = "mynotary.last_synced_at";
const MAX_PAGES_PER_RUN = 50;

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

const entryToPayload = (
  entry: MyNotaryRegisterEntry
): MyNotarySignatureCompletedPayload | null => {
  if (!entry.contractId || !entry.operationId) return null;
  return {
    signatureId: entry.id ?? entry.contractId,
    contractId: entry.contractId,
    contractType: entry.contractType ?? "",
    operationId: entry.operationId,
    signedAt: entry.signedAt ?? entry.signatureTime,
    signers: entry.signers,
    files: entry.files,
  };
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
  const signedSince =
    input.signedSince ?? (await readLastSyncedAt()) ?? undefined;

  let pagesScanned = 0;
  let entriesSeen = 0;
  let documentsUpserted = 0;
  let documentsSkipped = 0;
  let errors = 0;
  let cursor: string | null = null;

  for (let i = 0; i < MAX_PAGES_PER_RUN; i += 1) {
    const page = await getRegisterEntries({
      organizationId,
      signedSince,
      cursor,
      limit: 100,
    });
    pagesScanned += 1;
    entriesSeen += page.entries.length;

    for (const entry of page.entries) {
      const payload = entryToPayload(entry);
      if (!payload) {
        documentsSkipped += 1;
        continue;
      }
      try {
        const result = await processSignatureCompleted({
          payload,
          source: "backfill",
        });
        if (result.skipped) documentsSkipped += 1;
        else documentsUpserted += 1;
      } catch {
        errors += 1;
      }
    }

    if (!page.nextCursor) break;
    cursor = page.nextCursor;
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
