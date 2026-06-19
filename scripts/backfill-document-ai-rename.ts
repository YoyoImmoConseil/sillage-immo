#!/usr/bin/env tsx
/**
 * scripts/backfill-document-ai-rename.ts
 *
 * One-shot backfill that applies the AI auto-rename to documents that were
 * uploaded BEFORE the feature shipped, across every client space.
 *
 * Eligibility (mirrors the live "smart" rename rule):
 *   - kind = 'file', not soft-deleted
 *   - label still looks like a raw filename (ends with an extension) → treated
 *     as a non-customized default label; clean human labels are left untouched
 *   - AI status not already 'done' or 'processing'
 *
 * For each eligible document we seed `metadata.ai = { status: 'pending',
 * autoLabel: true }` then run `analyzeAndRenameDocument` synchronously (the
 * function is idempotent and skips renaming when the PDF has too little text
 * or the model is not confident).
 *
 * Usage (DRY-RUN by default — prints what would change):
 *   NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
 *   SUPABASE_SERVICE_ROLE_KEY=... ADMIN_API_KEY=... OPENAI_API_KEY=... \
 *   tsx scripts/backfill-document-ai-rename.ts
 *
 * Add --apply to actually run the analysis and rename.
 */

import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  analyzeAndRenameDocument,
  type DocumentAiScope,
} from "@/services/documents/document-ai-rename.service";

const APPLY = process.argv.includes("--apply");
// Re-run the analysis on documents the AI already auto-renamed (status=done,
// autoLabel=true). Use it to propagate a prompt change (e.g. keep the year).
// Documents with a human/custom label (autoLabel != true) are never touched.
const REPROCESS_DONE = process.argv.includes("--reprocess-done");

// A label that still ends with a short file extension (".pdf", ".jpg"…) is a
// default upload label; clean AI/human titles carry no extension.
const FILENAME_LIKE = /\.[a-z0-9]{2,4}$/i;

type Target = {
  scope: DocumentAiScope;
  table: "property_documents" | "buyer_presented_property_documents";
};

const TARGETS: Target[] = [
  { scope: "property_document", table: "property_documents" },
  { scope: "presented_document", table: "buyer_presented_property_documents" },
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Row = {
  id: string;
  label: string;
  metadata: Record<string, unknown> | null;
};

const readAi = (
  metadata: Record<string, unknown> | null
): Record<string, unknown> & { status?: string; autoLabel?: boolean } =>
  (metadata?.ai ?? {}) as Record<string, unknown> & { status?: string; autoLabel?: boolean };

const main = async () => {
  const mode = REPROCESS_DONE ? "REPROCESS-DONE" : "BACKFILL";
  console.log(`Document AI rename ${mode} — ${APPLY ? "APPLY" : "DRY-RUN"}`);
  const summary = {
    eligible: 0,
    renamed: 0,
    skippedNoChange: 0,
    failed: 0,
    ignoredCustomLabel: 0,
    ignoredAlreadyDone: 0,
  };

  for (const target of TARGETS) {
    const { data, error } = await supabaseAdmin
      .from(target.table)
      .select("id, label, metadata")
      .eq("kind", "file")
      .is("deleted_at", null);
    if (error) throw new Error(`${target.table}: ${error.message}`);

    const rows = (data ?? []) as Row[];
    for (const row of rows) {
      const ai = readAi(row.metadata);
      const status = ai.status ?? "";

      if (REPROCESS_DONE) {
        // Only re-run documents the AI itself renamed; never touch custom
        // labels, in-flight, or skipped (no-text) documents.
        if (ai.autoLabel !== true || status !== "done") {
          if (status === "done" || status === "processing") summary.ignoredAlreadyDone += 1;
          else summary.ignoredCustomLabel += 1;
          continue;
        }
      } else {
        if (status === "done" || status === "processing") {
          summary.ignoredAlreadyDone += 1;
          continue;
        }
        if (!FILENAME_LIKE.test(row.label)) {
          summary.ignoredCustomLabel += 1;
          continue;
        }
      }

      summary.eligible += 1;
      if (!APPLY) {
        console.log(`[dry] ${target.table} ${row.id} — "${row.label}"`);
        continue;
      }

      const { error: seedError } = await supabaseAdmin
        .from(target.table)
        .update({
          metadata: {
            ...(row.metadata ?? {}),
            ai: { ...ai, status: "pending", autoLabel: true },
          },
        })
        .eq("id", row.id);
      if (seedError) {
        summary.failed += 1;
        console.error(`  seed failed ${row.id}: ${seedError.message}`);
        continue;
      }

      try {
        await analyzeAndRenameDocument({ scope: target.scope, documentId: row.id });
        const { data: after } = await supabaseAdmin
          .from(target.table)
          .select("label, metadata")
          .eq("id", row.id)
          .maybeSingle();
        const afterRow = after as { label: string; metadata: Record<string, unknown> | null } | null;
        if (afterRow && readAi(afterRow.metadata).status === "done") {
          summary.renamed += 1;
          console.log(`  renamed ${row.id}: "${row.label}" → "${afterRow.label}"`);
        } else {
          summary.skippedNoChange += 1;
          console.log(`  kept    ${row.id}: "${row.label}" (AI skipped: insufficient/uncertain)`);
        }
      } catch (err) {
        summary.failed += 1;
        console.error(`  failed  ${row.id}: ${err instanceof Error ? err.message : err}`);
      }

      await sleep(300); // gentle pacing for the OpenAI API
    }
  }

  console.log("\nSummary:");
  console.log(JSON.stringify(summary, null, 2));
};

main().catch((err) => {
  console.error("Backfill failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
