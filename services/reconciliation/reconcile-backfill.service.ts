import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { enrichFromOperation } from "@/services/mynotary/operation-enrichment.service";
import {
  reconcileMyNotaryDocument,
  reconcileSweepBrightProperty,
  reconcileEstimatorLead,
} from "./reconcile.service";

// One-shot reconciliation backfill over the existing data:
//   - MyNotary signed documents ingested before Phase 1 (re-enrich the
//     structured facts from GET /operations/{id} + reconcile)
//   - SweepBright properties (reconcile → attach / suggest)
//   - estimator seller_leads (reconcile → suggest doublons)
//
// Idempotent + best-effort: every record is processed independently and
// failures are counted, never thrown.

export type ReconcileBackfillResult = {
  mynotary: { scanned: number; enriched: number; autoLinked: number; suggested: number; errors: number };
  sweepbright: { scanned: number; autoLinked: number; suggested: number; errors: number };
  estimator: { scanned: number; suggested: number; errors: number };
};

const backfillMyNotary = async (
  reEnrich: boolean
): Promise<ReconcileBackfillResult["mynotary"]> => {
  const stats = { scanned: 0, enriched: 0, autoLinked: 0, suggested: 0, errors: 0 };
  const reader = supabaseAdmin as unknown as {
    from: (table: "mynotary_signed_documents") => {
      select: (cols: string) => {
        is: (
          col: string,
          value: unknown
        ) => Promise<{
          data: Array<{
            id: string;
            mynotary_operation_id: string;
            contract_kind: string;
            seller_contacts: unknown[] | null;
            property_price: number | null;
            matched_seller_project_id: string | null;
          }> | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
  const { data, error } = await reader
    .from("mynotary_signed_documents")
    .select(
      "id, mynotary_operation_id, contract_kind, seller_contacts, property_price, matched_seller_project_id"
    )
    .is("deleted_at", null);
  if (error || !data) return stats;

  for (const doc of data) {
    stats.scanned += 1;
    try {
      const needsEnrichment =
        reEnrich || !doc.seller_contacts || doc.seller_contacts.length === 0;
      if (needsEnrichment && doc.mynotary_operation_id) {
        const enrichment = await enrichFromOperation(doc.mynotary_operation_id);
        const writer = supabaseAdmin as unknown as {
          from: (table: "mynotary_signed_documents") => {
            update: (row: Record<string, unknown>) => {
              eq: (col: string, value: string) => Promise<{ error: unknown }>;
            };
          };
        };
        await writer
          .from("mynotary_signed_documents")
          .update({
            seller_contacts: enrichment.sellerContacts,
            property_price: enrichment.price,
            living_area: enrichment.livingArea,
          })
          .eq("id", doc.id);
        stats.enriched += 1;
      }

      const result = await reconcileMyNotaryDocument(doc.id, {
        autoCreate: doc.contract_kind === "mandate",
      });
      if (result.decision === "auto_link") stats.autoLinked += 1;
      else if (result.decision === "suggestion") stats.suggested += 1;
    } catch {
      stats.errors += 1;
    }
  }
  return stats;
};

const backfillSweepBright = async (): Promise<ReconcileBackfillResult["sweepbright"]> => {
  const stats = { scanned: 0, autoLinked: 0, suggested: 0, errors: 0 };
  const { data } = await supabaseAdmin
    .from("properties")
    .select("id")
    .eq("source", "sweepbright");
  for (const row of (data ?? []) as Array<{ id: string }>) {
    stats.scanned += 1;
    try {
      const result = await reconcileSweepBrightProperty(row.id);
      if (result.decision === "auto_link") stats.autoLinked += 1;
      else if (result.decision === "suggestion") stats.suggested += 1;
    } catch {
      stats.errors += 1;
    }
  }
  return stats;
};

const backfillEstimator = async (): Promise<ReconcileBackfillResult["estimator"]> => {
  const stats = { scanned: 0, suggested: 0, errors: 0 };
  const { data } = await supabaseAdmin.from("seller_leads").select("id");
  for (const row of (data ?? []) as Array<{ id: string }>) {
    stats.scanned += 1;
    try {
      const result = await reconcileEstimatorLead(row.id);
      if (result.decision === "suggestion") stats.suggested += 1;
    } catch {
      stats.errors += 1;
    }
  }
  return stats;
};

export const runReconciliationBackfill = async (options?: {
  reEnrichMyNotary?: boolean;
  skipEstimator?: boolean;
  skipSweepBright?: boolean;
}): Promise<ReconcileBackfillResult> => {
  const mynotary = await backfillMyNotary(options?.reEnrichMyNotary ?? true);
  const sweepbright = options?.skipSweepBright
    ? { scanned: 0, autoLinked: 0, suggested: 0, errors: 0 }
    : await backfillSweepBright();
  const estimator = options?.skipEstimator
    ? { scanned: 0, suggested: 0, errors: 0 }
    : await backfillEstimator();
  return { mynotary, sweepbright, estimator };
};
