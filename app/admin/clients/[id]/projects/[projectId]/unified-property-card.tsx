"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  GoldenOverrideField,
  PropertyGoldenRecord,
} from "@/services/properties/golden-record.service";
import {
  GOLDEN_SOURCE_LABELS,
  GOLDEN_SOURCE_BADGE_CLASS,
  GOLDEN_RECORD_FIELDS,
  formatGoldenFieldValue,
} from "@/lib/properties/golden-record-ui";

// "Fiche bien unifiée": renders the golden record computed from every
// source attached to the dossier (estimateur / SweepBright / MyNotary),
// with a divergence badge per field and a 1-click "choose this source"
// control that writes a manual override.

export function UnifiedPropertyCard({
  clientProjectId,
  sellerProjectId,
  initialGolden,
  canEdit,
}: {
  clientProjectId: string;
  sellerProjectId: string | null;
  initialGolden: PropertyGoldenRecord;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [golden, setGolden] = useState(initialGolden);
  const [busyField, setBusyField] = useState<GoldenOverrideField | null>(null);
  const [error, setError] = useState<string | null>(null);

  const persist = async (field: GoldenOverrideField, value: unknown | null) => {
    if (!sellerProjectId) return;
    setBusyField(field);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/seller-projects/${sellerProjectId}/golden-override`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ field, value, clientProjectId }),
        }
      );
      const json = (await res.json()) as {
        ok: boolean;
        golden?: PropertyGoldenRecord;
        message?: string;
      };
      if (!res.ok || !json.ok) {
        setError(json.message ?? "Échec de la mise à jour.");
        return;
      }
      if (json.golden) setGolden(json.golden);
      router.refresh();
    } catch {
      setError("Impossible de joindre l'API.");
    } finally {
      setBusyField(null);
    }
  };

  return (
    <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#141446]">Fiche bien unifiée</h2>
          <p className="text-sm text-[#141446]/60">
            Donnée consolidée multi-sources. La source retenue suit une priorité
            par défaut ; en cas de divergence, choisissez la bonne valeur.
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {golden.sources.sweepbright ? (
            <span className={`rounded-full border px-2 py-0.5 text-xs ${GOLDEN_SOURCE_BADGE_CLASS.sweepbright}`}>SweepBright</span>
          ) : null}
          {golden.sources.mynotary ? (
            <span className={`rounded-full border px-2 py-0.5 text-xs ${GOLDEN_SOURCE_BADGE_CLASS.mynotary}`}>MyNotary</span>
          ) : null}
          {golden.sources.estimator ? (
            <span className={`rounded-full border px-2 py-0.5 text-xs ${GOLDEN_SOURCE_BADGE_CLASS.estimator}`}>Estimateur</span>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="mt-3 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          {error}
        </div>
      ) : null}

      <dl className="mt-4 divide-y divide-[rgba(20,20,70,0.08)]">
        {GOLDEN_RECORD_FIELDS.map((def) => {
          const f = def.get(golden);
          if (f.value === null && f.alternatives.length === 0) return null;
          const isBusy = busyField === def.field;
          return (
            <div key={def.field} className="grid grid-cols-[160px_1fr] gap-3 py-3">
              <dt className="text-xs uppercase tracking-wide text-[#141446]/60">
                {def.label}
              </dt>
              <dd className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-[#141446]">
                    {formatGoldenFieldValue(f.value, def.kind)}
                  </span>
                  {f.source ? (
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] uppercase ${GOLDEN_SOURCE_BADGE_CLASS[f.source]}`}
                    >
                      {GOLDEN_SOURCE_LABELS[f.source]}
                    </span>
                  ) : null}
                  {f.hasDivergence ? (
                    <span className="rounded-full border border-rose-300 bg-rose-50 px-2 py-0.5 text-[10px] uppercase text-rose-800">
                      divergence
                    </span>
                  ) : null}
                  {f.source === "manual" && canEdit ? (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => persist(def.field, null)}
                      className="text-[11px] underline text-[#141446]/70"
                    >
                      réinitialiser
                    </button>
                  ) : null}
                  {isBusy ? (
                    <span className="text-xs text-[#141446]/60">…</span>
                  ) : null}
                </div>
                {f.hasDivergence ? (
                  <div className="flex flex-wrap gap-2">
                    {f.alternatives.map((alt, i) => (
                      <button
                        key={`${def.field}-${i}`}
                        type="button"
                        disabled={!canEdit || isBusy}
                        onClick={() => persist(def.field, alt.value)}
                        className="flex items-center gap-1 rounded-md border border-[rgba(20,20,70,0.2)] bg-white px-2 py-1 text-xs text-[#141446] hover:bg-[#f4ece4] disabled:opacity-60"
                        title="Utiliser cette valeur"
                      >
                        <span className={`rounded-full border px-1.5 py-0.5 text-[9px] uppercase ${GOLDEN_SOURCE_BADGE_CLASS[alt.source]}`}>
                          {GOLDEN_SOURCE_LABELS[alt.source]}
                        </span>
                        {formatGoldenFieldValue(alt.value, def.kind)}
                      </button>
                    ))}
                  </div>
                ) : null}
              </dd>
            </div>
          );
        })}
      </dl>

      {!sellerProjectId ? (
        <p className="mt-3 text-xs text-[#141446]/50">
          Les overrides manuels nécessitent un projet vendeur matérialisé.
        </p>
      ) : null}
    </section>
  );
}
