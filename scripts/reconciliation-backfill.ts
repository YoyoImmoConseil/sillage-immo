#!/usr/bin/env tsx
/**
 * scripts/reconciliation-backfill.ts
 *
 * One-shot CLI that runs the multi-source reconciliation backfill over
 * the existing data: re-enriches the MyNotary signed documents ingested
 * before Phase 1 (seller_contacts / price / surface), then reconciles
 * MyNotary documents, SweepBright properties and estimator leads against
 * the client_project hubs (auto-link strong matches, queue weak ones in
 * reconciliation_suggestions).
 *
 * Usage:
 *   MYNOTARY_API_KEY=xxx MYNOTARY_ORGANIZATION_ID=12345 \
 *   NEXT_PUBLIC_SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx \
 *   npx tsx scripts/reconciliation-backfill.ts [--no-reenrich] [--skip-estimator] [--skip-sweepbright]
 */

import { runReconciliationBackfill } from "@/services/reconciliation/reconcile-backfill.service";

const hasFlag = (name: string) => process.argv.slice(2).includes(`--${name}`);

const main = async () => {
  console.log("Starting reconciliation backfill…");
  const result = await runReconciliationBackfill({
    reEnrichMyNotary: !hasFlag("no-reenrich"),
    skipEstimator: hasFlag("skip-estimator"),
    skipSweepBright: hasFlag("skip-sweepbright"),
  });
  console.log("Done.");
  console.log(JSON.stringify(result, null, 2));
};

main().catch((err) => {
  console.error("Backfill failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
