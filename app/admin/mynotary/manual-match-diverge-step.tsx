"use client";

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

// Étape 2 du rattachement manuel : arbitrage des divergences du golden record.
// Composant de présentation : la persistance des overrides vit dans le parent.

type ManualMatchDivergeStepProps = {
  golden: PropertyGoldenRecord | null;
  busyField: GoldenOverrideField | null;
  link: { clientProfileId: string | null; clientProjectId: string | null };
  onPersistOverride: (field: GoldenOverrideField, value: unknown | null) => void;
};

export function ManualMatchDivergeStep({
  golden,
  busyField,
  link,
  onPersistOverride,
}: ManualMatchDivergeStepProps) {
  const divergentFields = golden
    ? GOLDEN_RECORD_FIELDS.map((def) => ({ def, f: def.get(golden) })).filter(
        (x) => x.f.hasDivergence
      )
    : [];

  return (
    <div className="space-y-4 text-sm text-navy">
      <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
        Contrat rattaché. {divergentFields.length > 0
          ? "Quelques données divergent entre les sources — choisissez la bonne valeur."
          : "Aucune divergence détectée, tout concorde."}
      </div>

      {golden && divergentFields.length > 0 ? (
        <dl className="divide-y divide-[rgba(20,20,70,0.08)]">
          {divergentFields.map(({ def, f }) => {
            const isBusy = busyField === def.field;
            return (
              <div key={def.field} className="grid grid-cols-[120px_1fr] gap-3 py-3">
                <dt className="text-xs uppercase tracking-wide text-navy/60">{def.label}</dt>
                <dd className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{formatGoldenFieldValue(f.value, def.kind)}</span>
                    {f.source ? (
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase ${GOLDEN_SOURCE_BADGE_CLASS[f.source]}`}>
                        {GOLDEN_SOURCE_LABELS[f.source]}
                      </span>
                    ) : null}
                    <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] uppercase text-emerald-800">
                      retenue
                    </span>
                    {isBusy ? <span className="text-xs text-navy/60">…</span> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {f.alternatives.map((alt, i) => (
                      <button
                        key={`${def.field}-${i}`}
                        type="button"
                        disabled={isBusy}
                        onClick={() => onPersistOverride(def.field, alt.value)}
                        className="flex items-center gap-1 rounded-md border border-[rgba(20,20,70,0.2)] bg-white px-2 py-1 text-xs hover:bg-sand disabled:opacity-60"
                        title="Garder cette valeur"
                      >
                        <span className={`rounded-full border px-1.5 py-0.5 text-[9px] uppercase ${GOLDEN_SOURCE_BADGE_CLASS[alt.source]}`}>
                          {GOLDEN_SOURCE_LABELS[alt.source]}
                        </span>
                        {formatGoldenFieldValue(alt.value, def.kind)}
                      </button>
                    ))}
                  </div>
                </dd>
              </div>
            );
          })}
        </dl>
      ) : null}

      {link.clientProfileId && link.clientProjectId ? (
        <a
          href={`/admin/clients/${link.clientProfileId}/projects/${link.clientProjectId}`}
          target="_blank"
          rel="noreferrer"
          className="inline-block text-xs underline text-navy/70"
        >
          Ouvrir la fiche bien unifiée →
        </a>
      ) : null}
    </div>
  );
}
