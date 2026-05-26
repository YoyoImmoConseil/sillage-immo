"use client";

import { useState } from "react";
import type { SignedDocumentRow } from "@/services/admin/mynotary-list.service";

export function ManualMatchModal({
  document,
  onClose,
  onMatched,
}: {
  document: SignedDocumentRow;
  onClose: () => void;
  onMatched: () => void;
}) {
  const [sellerProjectId, setSellerProjectId] = useState(
    document.matched_seller_project_id ?? ""
  );
  const [propertyId, setPropertyId] = useState(
    document.matched_property_id ?? ""
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/mynotary/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: document.id,
          sellerProjectId: sellerProjectId || null,
          propertyId: propertyId || null,
        }),
      });
      const json = (await res.json()) as { ok: boolean; message?: string };
      if (!json.ok) {
        setError(json.message ?? "Échec du rattachement.");
        return;
      }
      onMatched();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[rgba(20,20,70,0.16)] bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-3">
          <h2 className="text-lg font-semibold text-[#141446]">
            Rattacher le document
          </h2>
          <p className="text-xs text-[#141446]/60">
            Contrat MyNotary <code>{document.mynotary_contract_id}</code> ·{" "}
            {document.contract_kind}
          </p>
        </header>
        <div className="space-y-3 text-sm text-[#141446]">
          <label className="block">
            <span className="block text-xs font-medium uppercase tracking-wide text-[#141446]/70">
              Seller project (UUID)
            </span>
            <input
              type="text"
              value={sellerProjectId}
              onChange={(e) => setSellerProjectId(e.target.value.trim())}
              placeholder="00000000-0000-0000-0000-000000000000"
              className="mt-1 w-full rounded-md border border-[rgba(20,20,70,0.2)] px-3 py-2 font-mono text-xs"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium uppercase tracking-wide text-[#141446]/70">
              Property (UUID)
            </span>
            <input
              type="text"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value.trim())}
              placeholder="00000000-0000-0000-0000-000000000000"
              className="mt-1 w-full rounded-md border border-[rgba(20,20,70,0.2)] px-3 py-2 font-mono text-xs"
            />
          </label>
          {error ? (
            <div className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-900">
              {error}
            </div>
          ) : null}
        </div>
        <footer className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#141446]/30 px-3 py-1 text-sm text-[#141446]"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || (!sellerProjectId && !propertyId)}
            className="rounded-md bg-[#141446] px-3 py-1 text-sm font-medium text-white disabled:opacity-60"
          >
            {busy ? "Enregistrement…" : "Rattacher"}
          </button>
        </footer>
      </div>
    </div>
  );
}
