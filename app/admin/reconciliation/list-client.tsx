"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReconciliationSuggestionRow } from "@/services/admin/reconciliation-list.service";

const KIND_LABEL: Record<ReconciliationSuggestionRow["sourceKind"], string> = {
  sweepbright_property: "Bien SweepBright",
  mynotary_document: "Document MyNotary",
  estimator_lead: "Lead estimateur",
};

const REASON_LABEL: Record<string, string> = {
  address: "adresse",
  identity_email: "email vendeur",
  identity_phone: "téléphone vendeur",
  name_fuzzy: "nom proche",
  price_band: "prix cohérent",
  surface_band: "surface cohérente",
};

const formatDate = (value: string) => new Date(value).toLocaleString("fr-FR");

export function ReconciliationListClient({
  initialRows,
  canManage,
}: {
  initialRows: ReconciliationSuggestionRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const act = async (id: string, action: "accept" | "reject") => {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reconciliation/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = (await res.json()) as { ok: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setError(json.message ?? "Action impossible.");
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== id));
      router.refresh();
    } catch {
      setError("Impossible de joindre l'API.");
    } finally {
      setBusyId(null);
    }
  };

  if (rows.length === 0) {
    return (
      <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6">
        <p className="text-navy/70">
          Aucune suggestion de réconciliation en attente. Les rapprochements
          forts sont rattachés automatiquement ; seuls les cas douteux
          apparaissent ici.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          {error}
        </div>
      ) : null}

      {rows.map((row) => {
        const isBusy = busyId === row.id;
        const scorePct = Math.round(row.score * 100);
        return (
          <section
            key={row.id}
            className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-[rgba(20,20,70,0.2)] bg-white px-2 py-0.5 text-xs uppercase text-navy/70">
                    {KIND_LABEL[row.sourceKind]}
                  </span>
                  <span className="text-xs text-navy/50">{formatDate(row.createdAt)}</span>
                </div>
                <p className="font-medium text-navy">{row.sourceLabel}</p>
                <p className="text-sm text-navy/70">
                  → Dossier suggéré :{" "}
                  {row.targetClientId && row.targetClientProjectId ? (
                    <Link
                      href={`/admin/clients/${row.targetClientId}/projects/${row.targetClientProjectId}`}
                      className="underline"
                    >
                      {row.targetLabel}
                    </Link>
                  ) : (
                    row.targetLabel
                  )}
                </p>
                <div className="flex flex-wrap gap-1 pt-1">
                  {row.reasons.map((reason) => (
                    <span
                      key={reason}
                      className="rounded-full border border-[rgba(20,20,70,0.15)] bg-[#f7f5f0] px-2 py-0.5 text-[10px] text-navy/70"
                    >
                      {REASON_LABEL[reason] ?? reason}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-semibold text-navy">{scorePct}%</p>
                <p className="text-xs text-navy/50">confiance</p>
              </div>
            </div>

            {canManage ? (
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => act(row.id, "accept")}
                  className="rounded-md bg-navy px-3 py-1.5 text-sm text-white disabled:opacity-60"
                >
                  Rattacher
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => act(row.id, "reject")}
                  className="rounded-md border border-navy/30 px-3 py-1.5 text-sm text-navy disabled:opacity-60"
                >
                  Rejeter
                </button>
                {isBusy ? (
                  <span className="self-center text-xs text-navy/60">…</span>
                ) : null}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
