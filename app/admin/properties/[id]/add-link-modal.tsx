"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/app/components/modal";
import { parseApiResponse } from "@/lib/http/parse-api-response";

type AddLinkModalProps = {
  createPath: string;
  onClose: () => void;
  onCreated: () => Promise<void> | void;
};

/** Modale admin "Ajouter un lien" (lien externe partagé ou interne). */
export function AddLinkModal({ createPath, onClose, onCreated }: AddLinkModalProps) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [adminOnly, setAdminOnly] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isUrlValid = useMemo(() => {
    if (!url.trim()) return false;
    try {
      const parsed = new URL(url.trim());
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }, [url]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      setError("Libellé requis.");
      return;
    }
    if (!isUrlValid) {
      setError("URL invalide (http ou https requis).");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(createPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "link",
          label: label.trim(),
          url: url.trim(),
          visibility: adminOnly ? "admin_only" : "admin_and_client",
        }),
      });
      const parsed = await parseApiResponse(res);
      if (!parsed.ok) throw new Error(parsed.message ?? "Création impossible.");
      await onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      onClose={onClose}
      title="Ajouter un lien"
      size="sm"
      closeOnOverlayClick={false}
      onSubmit={handleSubmit}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded border border-[rgba(20,20,70,0.16)] px-4 py-2 text-sm text-navy disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={submitting || !label.trim() || !isUrlValid}
            className="sillage-btn rounded px-4 py-2 text-sm disabled:opacity-50"
          >
            {submitting ? "Création…" : "Ajouter"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Libellé du lien"
          aria-label="Libellé du lien"
          className="w-full rounded-xl border border-[rgba(20,20,70,0.16)] px-4 py-2 text-sm"
          maxLength={200}
          required
        />
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          aria-label="URL du lien"
          className="w-full rounded-xl border border-[rgba(20,20,70,0.16)] px-4 py-2 text-sm"
          required
        />
        <label className="flex items-center gap-2 text-sm text-navy">
          <input
            type="checkbox"
            checked={adminOnly}
            onChange={(e) => setAdminOnly(e.target.checked)}
          />
          Lien interne admin (non visible par le client)
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </Modal>
  );
}
