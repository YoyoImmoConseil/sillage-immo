"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { SignedDocumentRow } from "@/services/admin/mynotary-list.service";
import { ManualMatchModal } from "./manual-match-modal";

type Filters = {
  kind: "mandate" | "purchase_offer" | "preliminary_sale" | "all";
  matched: "matched" | "unmatched" | "all";
  since?: string;
  until?: string;
};

const KIND_LABEL: Record<string, string> = {
  mandate: "Mandat",
  purchase_offer: "Offre",
  preliminary_sale: "Compromis",
};

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));

const formatConfidence = (row: SignedDocumentRow) => {
  if (row.matched_seller_project_id === null && row.matched_property_id === null) {
    return "Non matché";
  }
  const pct = Math.round((row.match_confidence ?? 0) * 100);
  return `${pct}% (${row.match_method ?? "n/a"})`;
};

export function MyNotaryListClient({
  initialRows,
  initialTotal,
  initialPage,
  pageSize,
  filters,
  canManage,
  canSync,
}: {
  initialRows: SignedDocumentRow[];
  initialTotal: number;
  initialPage: number;
  pageSize: number;
  filters: Filters;
  canManage: boolean;
  canSync: boolean;
}) {
  const router = useRouter();
  const search = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [activeRow, setActiveRow] = useState<SignedDocumentRow | null>(null);
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(initialTotal / pageSize));

  const updateFilter = (
    key: "kind" | "matched" | "since" | "until" | "page",
    value: string | undefined
  ) => {
    const params = new URLSearchParams(search.toString());
    if (value === undefined || value === "" || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    if (key !== "page") {
      params.delete("page");
    }
    startTransition(() => {
      router.push(`/admin/mynotary?${params.toString()}`);
    });
  };

  const triggerSync = async () => {
    setSyncBusy(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/admin/mynotary/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = (await res.json()) as { ok: boolean; message?: string };
      setSyncMessage(
        json.ok
          ? "Synchronisation déclenchée en arrière-plan."
          : json.message ?? "Échec de la synchronisation."
      );
    } catch {
      setSyncMessage("Impossible de joindre l'API.");
    } finally {
      setSyncBusy(false);
    }
  };

  const headerStats = useMemo(() => {
    const matched = initialRows.filter((r) => r.matched_seller_project_id !== null);
    return {
      visible: initialRows.length,
      matched: matched.length,
      unmatched: initialRows.length - matched.length,
    };
  }, [initialRows]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[#141446]">Filtres</p>
          <p className="text-xs text-[#141446]/60">
            {initialTotal} document{initialTotal > 1 ? "s" : ""} au total — affichés : {headerStats.visible} ({headerStats.matched} matchés / {headerStats.unmatched} à rattacher)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <select
            className="rounded-md border border-[rgba(20,20,70,0.2)] bg-white px-2 py-1"
            value={filters.kind}
            onChange={(e) => updateFilter("kind", e.target.value)}
            aria-label="Type de contrat"
          >
            <option value="all">Tous les contrats</option>
            <option value="mandate">Mandats</option>
            <option value="purchase_offer">Offres</option>
            <option value="preliminary_sale">Compromis</option>
          </select>
          <select
            className="rounded-md border border-[rgba(20,20,70,0.2)] bg-white px-2 py-1"
            value={filters.matched}
            onChange={(e) => updateFilter("matched", e.target.value)}
            aria-label="Statut rattachement"
          >
            <option value="all">Tous</option>
            <option value="matched">Matchés</option>
            <option value="unmatched">À rattacher</option>
          </select>
          <input
            type="date"
            className="rounded-md border border-[rgba(20,20,70,0.2)] bg-white px-2 py-1"
            value={filters.since ?? ""}
            onChange={(e) => updateFilter("since", e.target.value)}
            aria-label="Depuis"
          />
          <input
            type="date"
            className="rounded-md border border-[rgba(20,20,70,0.2)] bg-white px-2 py-1"
            value={filters.until ?? ""}
            onChange={(e) => updateFilter("until", e.target.value)}
            aria-label="Jusqu'au"
          />
          {canSync ? (
            <button
              type="button"
              onClick={triggerSync}
              disabled={syncBusy}
              className="rounded-md bg-[#141446] px-3 py-1 text-xs font-medium text-white disabled:opacity-60"
            >
              {syncBusy ? "Sync…" : "Synchroniser MyNotary"}
            </button>
          ) : null}
        </div>
      </div>

      {syncMessage ? (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
          {syncMessage}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-[rgba(20,20,70,0.16)] bg-white/70">
        <table className="min-w-full divide-y divide-[rgba(20,20,70,0.12)] text-sm">
          <thead className="bg-[#141446]/5">
            <tr className="text-left text-xs uppercase tracking-wide text-[#141446]/70">
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Signé le</th>
              <th className="px-3 py-2">Signataires</th>
              <th className="px-3 py-2">Matching</th>
              <th className="px-3 py-2">Fichier</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(20,20,70,0.08)]">
            {initialRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-[#141446]/60">
                  Aucun contrat trouvé pour ces filtres.
                </td>
              </tr>
            ) : null}
            {initialRows.map((row) => {
              const firstFile = row.files?.[0];
              const signersLabel =
                (row.signers ?? [])
                  .slice(0, 3)
                  .map((s) => {
                    const name = `${s.firstName ?? ""} ${s.lastName ?? ""}`.trim();
                    return name || s.email || "—";
                  })
                  .join(", ") || "—";
              return (
                <tr key={row.id} className="text-[#141446]">
                  <td className="px-3 py-2 font-medium">
                    {KIND_LABEL[row.contract_kind] ?? row.contract_kind}
                  </td>
                  <td className="px-3 py-2 text-[#141446]/80">{formatDate(row.signed_at)}</td>
                  <td className="px-3 py-2 text-[#141446]/80">{signersLabel}</td>
                  <td className="px-3 py-2 text-[#141446]/80">{formatConfidence(row)}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col gap-1">
                      {row.signed_document_path || firstFile ? (
                        <a
                          href={`/api/admin/mynotary/${row.id}/download?kind=signed`}
                          target="_blank"
                          rel="noreferrer"
                          className="underline"
                          title={
                            row.signed_document_path
                              ? "PDF archivé localement"
                              : "Téléchargement via proxy MyNotary"
                          }
                        >
                          {row.signed_document_path
                            ? "PDF signé (archive)"
                            : "PDF signé (MyNotary)"}
                        </a>
                      ) : (
                        <span className="text-[#141446]/40">—</span>
                      )}
                      {row.signature_proof_path ? (
                        <a
                          href={`/api/admin/mynotary/${row.id}/download?kind=proof`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs underline text-[#141446]/70"
                        >
                          Preuve de signature
                        </a>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {canManage ? (
                      <button
                        type="button"
                        onClick={() => setActiveRow(row)}
                        className="rounded-md border border-[#141446]/30 px-2 py-1 text-xs font-medium text-[#141446]"
                      >
                        Rattacher
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-[#141446]/70">
        <span>
          Page {initialPage} / {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={initialPage <= 1 || isPending}
            onClick={() => updateFilter("page", String(initialPage - 1))}
            className="rounded-md border border-[#141446]/30 px-3 py-1 disabled:opacity-50"
          >
            Précédent
          </button>
          <button
            type="button"
            disabled={initialPage >= totalPages || isPending}
            onClick={() => updateFilter("page", String(initialPage + 1))}
            className="rounded-md border border-[#141446]/30 px-3 py-1 disabled:opacity-50"
          >
            Suivant
          </button>
        </div>
      </div>

      {activeRow ? (
        <ManualMatchModal
          document={activeRow}
          onClose={() => setActiveRow(null)}
          onMatched={() => {
            setActiveRow(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
