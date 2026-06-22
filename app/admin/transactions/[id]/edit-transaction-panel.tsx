"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  HONORAIRES_SOURCE_LABELS,
  TRANSACTION_STATUSES,
  TRANSACTION_STATUS_LABELS,
  type HonorairesSource,
} from "@/types/domain/transactions";

type AdvisorOption = { id: string; label: string };

type HonorairesEntry = {
  id: string;
  amount: number;
  currency: string;
  source: string;
  reason: string | null;
  createdAt: string;
};

type TransactionView = {
  id: string;
  reference: string | null;
  businessType: string;
  status: string;
  currency: string;
  assignedAdminProfileId: string | null;
  mandatePriceAmount: number | null;
  agreedPriceAmount: number | null;
  deedPriceAmount: number | null;
  honorairesAmount: number | null;
  honorairesSource: string | null;
  mandateSignedAt: string | null;
  preliminarySaleSignedAt: string | null;
  deedSignedAt: string | null;
  notes: string | null;
};

const formatAmount = (amount: number | null, currency: string) => {
  if (typeof amount !== "number") return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency || "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const toDateInput = (value: string | null) =>
  value ? new Date(value).toISOString().slice(0, 10) : "";

export function EditTransactionPanel({
  canManage,
  transaction,
  advisors,
  honorairesHistory,
  sellersCount,
  buyersCount,
}: {
  canManage: boolean;
  transaction: TransactionView;
  advisors: AdvisorOption[];
  honorairesHistory: HonorairesEntry[];
  sellersCount: number;
  buyersCount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState(transaction.status);
  const [advisorId, setAdvisorId] = useState(transaction.assignedAdminProfileId ?? "");
  const [mandatePrice, setMandatePrice] = useState(
    transaction.mandatePriceAmount?.toString() ?? ""
  );
  const [agreedPrice, setAgreedPrice] = useState(
    transaction.agreedPriceAmount?.toString() ?? ""
  );
  const [deedPrice, setDeedPrice] = useState(
    transaction.deedPriceAmount?.toString() ?? ""
  );
  const [mandateSignedAt, setMandateSignedAt] = useState(
    toDateInput(transaction.mandateSignedAt)
  );
  const [compromisAt, setCompromisAt] = useState(
    toDateInput(transaction.preliminarySaleSignedAt)
  );
  const [deedSignedAt, setDeedSignedAt] = useState(toDateInput(transaction.deedSignedAt));

  const [newHonoraires, setNewHonoraires] = useState("");
  const [honorairesSource, setHonorairesSource] = useState<HonorairesSource>("adjusted");
  const [honorairesReason, setHonorairesReason] = useState("");

  const patch = async (body: Record<string, unknown>, successMessage?: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/transactions/${transaction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!data.ok) {
        setError(data.message ?? "Mise à jour impossible.");
        return false;
      }
      if (successMessage) {
        // no-op toast; rely on refresh
      }
      router.refresh();
      return true;
    } catch {
      setError("Erreur réseau, merci de réessayer.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveDetails = async (event: React.FormEvent) => {
    event.preventDefault();
    await patch({
      status,
      assignedAdminProfileId: advisorId || null,
      mandatePriceAmount: mandatePrice || null,
      agreedPriceAmount: agreedPrice || null,
      deedPriceAmount: deedPrice || null,
      mandateSignedAt: mandateSignedAt ? new Date(mandateSignedAt).toISOString() : null,
      preliminarySaleSignedAt: compromisAt ? new Date(compromisAt).toISOString() : null,
      deedSignedAt: deedSignedAt ? new Date(deedSignedAt).toISOString() : null,
    });
  };

  const recordHonoraires = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newHonoraires) return;
    const ok = await patch({
      action: "record_honoraires",
      amount: newHonoraires,
      source: honorairesSource,
      reason: honorairesReason.trim() || undefined,
    });
    if (ok) {
      setNewHonoraires("");
      setHonorairesReason("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6">
          <h2 className="mb-3 text-lg font-semibold text-navy">Synthèse</h2>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-navy/60">Type</dt>
              <dd>{transaction.businessType === "rental" ? "Location" : "Vente"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-navy/60">Honoraires actuels</dt>
              <dd className="font-semibold">
                {formatAmount(transaction.honorairesAmount, transaction.currency)}
                {transaction.honorairesSource
                  ? ` (${
                      HONORAIRES_SOURCE_LABELS[
                        transaction.honorairesSource as HonorairesSource
                      ] ?? transaction.honorairesSource
                    })`
                  : ""}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-navy/60">Vendeurs / Acquéreurs</dt>
              <dd>
                {sellersCount} / {buyersCount}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6">
          <h2 className="mb-3 text-lg font-semibold text-navy">Historique honoraires</h2>
          {honorairesHistory.length === 0 ? (
            <p className="text-sm text-navy/60">Aucun mouvement.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {honorairesHistory.map((entry) => (
                <li key={entry.id} className="flex justify-between border-b border-[rgba(20,20,70,0.06)] pb-1">
                  <span>
                    {formatAmount(entry.amount, entry.currency)}{" "}
                    <span className="text-navy/50">
                      ·{" "}
                      {HONORAIRES_SOURCE_LABELS[entry.source as HonorairesSource] ??
                        entry.source}
                      {entry.reason ? ` · ${entry.reason}` : ""}
                    </span>
                  </span>
                  <span className="text-navy/50">
                    {new Date(entry.createdAt).toLocaleDateString("fr-FR")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {canManage ? (
        <>
          <form
            onSubmit={saveDetails}
            className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6 space-y-4"
          >
            <h2 className="text-lg font-semibold text-navy">Détails & jalons</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-navy">Statut</label>
                <select
                  className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  {TRANSACTION_STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {TRANSACTION_STATUS_LABELS[value]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-navy">Conseiller</label>
                <select
                  className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  value={advisorId}
                  onChange={(event) => setAdvisorId(event.target.value)}
                >
                  <option value="">— Non attribué —</option>
                  {advisors.map((advisor) => (
                    <option key={advisor.id} value={advisor.id}>
                      {advisor.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-navy">Prix mandat (€)</label>
                <input
                  className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  inputMode="numeric"
                  value={mandatePrice}
                  onChange={(event) => setMandatePrice(event.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy">Prix compromis (€)</label>
                <input
                  className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  inputMode="numeric"
                  value={agreedPrice}
                  onChange={(event) => setAgreedPrice(event.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy">Prix acte (€)</label>
                <input
                  className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  inputMode="numeric"
                  value={deedPrice}
                  onChange={(event) => setDeedPrice(event.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-navy">Mandat signé le</label>
                <input
                  type="date"
                  className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  value={mandateSignedAt}
                  onChange={(event) => setMandateSignedAt(event.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy">Compromis signé le</label>
                <input
                  type="date"
                  className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  value={compromisAt}
                  onChange={(event) => setCompromisAt(event.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy">Acte signé le</label>
                <input
                  type="date"
                  className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  value={deedSignedAt}
                  onChange={(event) => setDeedSignedAt(event.target.value)}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="sillage-btn rounded px-4 py-2 text-sm disabled:opacity-50"
            >
              {busy ? "Enregistrement..." : "Enregistrer"}
            </button>
          </form>

          <form
            onSubmit={recordHonoraires}
            className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6 space-y-4"
          >
            <h2 className="text-lg font-semibold text-navy">Ajuster les honoraires</h2>
            <p className="text-sm text-navy/60">
              Enregistre une nouvelle valeur (ex : négociation au compromis). L&apos;historique est conservé.
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-navy">Nouveau montant HT (€)</label>
                <input
                  className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  inputMode="numeric"
                  value={newHonoraires}
                  onChange={(event) => setNewHonoraires(event.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy">Source</label>
                <select
                  className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  value={honorairesSource}
                  onChange={(event) =>
                    setHonorairesSource(event.target.value as HonorairesSource)
                  }
                >
                  <option value="adjusted">Ajustement</option>
                  <option value="manual">Saisie manuelle</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-navy">Motif</label>
                <input
                  className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  value={honorairesReason}
                  onChange={(event) => setHonorairesReason(event.target.value)}
                  placeholder="Négociation compromis"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={busy || !newHonoraires}
              className="sillage-btn rounded px-4 py-2 text-sm disabled:opacity-50"
            >
              {busy ? "Enregistrement..." : "Enregistrer l'ajustement"}
            </button>
          </form>
        </>
      ) : null}

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
