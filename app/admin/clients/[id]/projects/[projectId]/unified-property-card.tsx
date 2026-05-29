"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  GoldenSource,
  GoldenOverrideField,
  PropertyGoldenRecord,
} from "@/services/properties/golden-record.service";

// "Fiche bien unifiée": renders the golden record computed from every
// source attached to the dossier (estimateur / SweepBright / MyNotary),
// with a divergence badge per field and a 1-click "choose this source"
// control that writes a manual override.

const SOURCE_LABELS: Record<GoldenSource, string> = {
  manual: "Manuel",
  sweepbright: "SweepBright",
  mynotary: "MyNotary",
  estimator: "Estimateur",
};

const SOURCE_BADGE: Record<GoldenSource, string> = {
  manual: "bg-violet-100 text-violet-900 border-violet-300",
  sweepbright: "bg-sky-100 text-sky-900 border-sky-300",
  mynotary: "bg-emerald-100 text-emerald-900 border-emerald-300",
  estimator: "bg-amber-100 text-amber-900 border-amber-300",
};

type FieldKind = "text" | "price" | "area" | "number";

type FieldDef = {
  field: GoldenOverrideField;
  label: string;
  kind: FieldKind;
  get: (g: PropertyGoldenRecord) => {
    value: unknown;
    source: GoldenSource | null;
    alternatives: Array<{ value: unknown; source: GoldenSource }>;
    hasDivergence: boolean;
  };
};

const FIELDS: FieldDef[] = [
  { field: "address", label: "Adresse", kind: "text", get: (g) => g.address },
  { field: "price", label: "Prix", kind: "price", get: (g) => g.price },
  { field: "livingArea", label: "Surface habitable", kind: "area", get: (g) => g.livingArea },
  { field: "propertyType", label: "Type de bien", kind: "text", get: (g) => g.propertyType },
  { field: "rooms", label: "Pièces", kind: "number", get: (g) => g.rooms },
  { field: "floor", label: "Étage", kind: "number", get: (g) => g.floor },
  { field: "seller.fullName", label: "Vendeur — nom", kind: "text", get: (g) => g.seller.fullName },
  { field: "seller.email", label: "Vendeur — email", kind: "text", get: (g) => g.seller.email },
  { field: "seller.phone", label: "Vendeur — téléphone", kind: "text", get: (g) => g.seller.phone },
];

const formatValue = (value: unknown, kind: FieldKind): string => {
  if (value === null || value === undefined || value === "") return "—";
  if (kind === "price" && typeof value === "number") {
    return `${value.toLocaleString("fr-FR")} €`;
  }
  if (kind === "area" && typeof value === "number") {
    return `${value} m²`;
  }
  return String(value);
};

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
            <span className={`rounded-full border px-2 py-0.5 text-xs ${SOURCE_BADGE.sweepbright}`}>SweepBright</span>
          ) : null}
          {golden.sources.mynotary ? (
            <span className={`rounded-full border px-2 py-0.5 text-xs ${SOURCE_BADGE.mynotary}`}>MyNotary</span>
          ) : null}
          {golden.sources.estimator ? (
            <span className={`rounded-full border px-2 py-0.5 text-xs ${SOURCE_BADGE.estimator}`}>Estimateur</span>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="mt-3 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          {error}
        </div>
      ) : null}

      <dl className="mt-4 divide-y divide-[rgba(20,20,70,0.08)]">
        {FIELDS.map((def) => {
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
                    {formatValue(f.value, def.kind)}
                  </span>
                  {f.source ? (
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] uppercase ${SOURCE_BADGE[f.source]}`}
                    >
                      {SOURCE_LABELS[f.source]}
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
                        <span className={`rounded-full border px-1.5 py-0.5 text-[9px] uppercase ${SOURCE_BADGE[alt.source]}`}>
                          {SOURCE_LABELS[alt.source]}
                        </span>
                        {formatValue(alt.value, def.kind)}
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
