"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type ValuationSummary = {
  provider: string | null;
  syncedAt: string | null;
  source: string | null;
  addressLabel: string | null;
  cityName: string | null;
  cityZipCode: string | null;
  type: string | null;
  livingSpaceArea: number | null;
  rooms: number | null;
  valuationPrice: number | null;
  valuationPriceLow: number | null;
  valuationPriceHigh: number | null;
};

type ValuationSyncCardProps = {
  sellerLeadId: string;
  valuation: ValuationSummary | null;
};

export function ValuationSyncCard({ sellerLeadId, valuation }: ValuationSyncCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [loupeLeadId, setLoupeLeadId] = useState("");

  const syncValuation = () => {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/seller-leads/${sellerLeadId}/valuation-sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            loupeLeadId: loupeLeadId.trim() || undefined,
          }),
        });
        const data = (await response.json()) as { ok?: boolean; message?: string };
        if (!response.ok || !data.ok) {
          setError(data.message ?? "Impossible de synchroniser l'estimation Loupe.");
          return;
        }
        router.refresh();
      } catch {
        setError("Erreur reseau pendant la synchronisation de l'estimation.");
      }
    });
  };

  return (
    <section className="rounded-2xl border p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg font-medium">Donnees estimation (API Loupe)</h2>
        <button
          type="button"
          className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-60"
          onClick={syncValuation}
          disabled={isPending}
        >
          {isPending ? "Synchronisation..." : "Synchroniser les donnees d'estimation"}
        </button>
      </div>
      <label className="block text-sm">
        ID lead Loupe (optionnel, recommande pour valuationResult widget)
        <input
          className="mt-1 w-full rounded border px-3 py-2"
          value={loupeLeadId}
          onChange={(event) => setLoupeLeadId(event.target.value)}
          placeholder="ex: 123456"
        />
      </label>

      {!valuation ? (
        <p className="text-sm opacity-70">
          Aucune donnee d&apos;estimation synchronisee pour le moment.
        </p>
      ) : (
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <p>
            <span className="opacity-70">Fournisseur:</span> {valuation.provider ?? "-"}
          </p>
          <p>
            <span className="opacity-70">Source:</span> {valuation.source ?? "-"}
          </p>
          <p className="sm:col-span-2">
            <span className="opacity-70">Adresse:</span>{" "}
            {valuation.addressLabel ?? "-"} {valuation.cityZipCode ?? ""} {valuation.cityName ?? ""}
          </p>
          <p>
            <span className="opacity-70">Type:</span> {valuation.type ?? "-"}
          </p>
          <p>
            <span className="opacity-70">Surface:</span>{" "}
            {valuation.livingSpaceArea !== null ? `${valuation.livingSpaceArea} m2` : "-"}
          </p>
          <p>
            <span className="opacity-70">Pieces:</span>{" "}
            {valuation.rooms !== null ? valuation.rooms : "-"}
          </p>
          <p>
            <span className="opacity-70">Prix:</span>{" "}
            {valuation.valuationPrice !== null ? `${valuation.valuationPrice} EUR` : "-"}
          </p>
          <p>
            <span className="opacity-70">Fourchette:</span>{" "}
            {valuation.valuationPriceLow !== null || valuation.valuationPriceHigh !== null
              ? `${valuation.valuationPriceLow ?? "-"} - ${valuation.valuationPriceHigh ?? "-"} EUR`
              : "-"}
          </p>
          <p className="sm:col-span-2 text-xs opacity-60">
            Derniere synchronisation:{" "}
            {valuation.syncedAt
              ? new Date(valuation.syncedAt).toLocaleString("fr-FR")
              : "-"}
          </p>
        </div>
      )}

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </section>
  );
}
