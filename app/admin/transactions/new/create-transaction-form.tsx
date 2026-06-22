"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  TRANSACTION_STATUSES,
  TRANSACTION_STATUS_LABELS,
} from "@/types/domain/transactions";

type AdvisorOption = { id: string; label: string };

export function CreateTransactionForm({ advisors }: { advisors: AdvisorOption[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [reference, setReference] = useState("");
  const [businessType, setBusinessType] = useState("sale");
  const [status, setStatus] = useState("mandate");
  const [advisorId, setAdvisorId] = useState("");
  const [mandatePrice, setMandatePrice] = useState("");
  const [honoraires, setHonoraires] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: reference.trim() || undefined,
          businessType,
          status,
          assignedAdminProfileId: advisorId || undefined,
          mandatePriceAmount: mandatePrice || undefined,
          honorairesAmount: honoraires || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; transactionId?: string; message?: string };
      if (data.ok && data.transactionId) {
        router.push(`/admin/transactions/${data.transactionId}`);
        return;
      }
      setError(data.message ?? "Création impossible.");
    } catch {
      setError("Erreur réseau, merci de réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-xl space-y-4 rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6"
    >
      <div>
        <label className="block text-sm font-medium text-navy">Référence</label>
        <input
          className="mt-1 w-full rounded border px-3 py-2 text-sm"
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          placeholder="Ex : Mandat 12 rue Paradis"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-navy">Type</label>
          <select
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            value={businessType}
            onChange={(event) => setBusinessType(event.target.value)}
          >
            <option value="sale">Vente</option>
            <option value="rental">Location</option>
          </select>
        </div>
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
      </div>
      <div>
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
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-navy">Prix mandat (€)</label>
          <input
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            inputMode="numeric"
            value={mandatePrice}
            onChange={(event) => setMandatePrice(event.target.value)}
            placeholder="450000"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-navy">Honoraires HT (€)</label>
          <input
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            inputMode="numeric"
            value={honoraires}
            onChange={(event) => setHonoraires(event.target.value)}
            placeholder="18000"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-navy">Notes</label>
        <textarea
          className="mt-1 w-full rounded border px-3 py-2 text-sm"
          rows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="sillage-btn rounded px-4 py-2 text-sm disabled:opacity-50"
      >
        {loading ? "Création..." : "Créer la transaction"}
      </button>
    </form>
  );
}
