#!/usr/bin/env tsx
/**
 * scripts/mynotary-backfill.ts
 *
 * One-shot CLI that walks the MyNotary register and ingests every
 * signed contract we don't already have in `mynotary_signed_documents`.
 *
 * Use cases:
 *   - first time you wire up the integration (no last_synced_at yet)
 *   - one-off re-sync after fixing a bug
 *
 * For the recurring daily sync, see app/api/cron/mynotary-sync/route.ts.
 *
 * Usage:
 *   MYNOTARY_API_KEY=xxx \
 *   MYNOTARY_ORGANIZATION_ID=12345 \
 *   SUPABASE_SERVICE_ROLE_KEY=xxx \
 *   npm run mynotary:backfill -- [--since=2026-01-01]
 */

import { runIncrementalBackfill } from "@/services/mynotary/backfill.service";

const readFlag = (name: string): string | null => {
  const prefix = `--${name}=`;
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith(prefix)) {
      return arg.slice(prefix.length);
    }
  }
  return null;
};

const main = async () => {
  console.log("Starting MyNotary backfill…");
  const since = readFlag("since") ?? undefined;
  const result = await runIncrementalBackfill({
    trigger: "script",
    signedSince: since,
  });
  console.log("Done.");
  console.log(JSON.stringify(result, null, 2));
};

main().catch((err) => {
  console.error("Backfill failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
