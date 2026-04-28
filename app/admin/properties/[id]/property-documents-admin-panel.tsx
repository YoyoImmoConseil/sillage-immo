"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseApiResponse } from "@/lib/http/parse-api-response";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const PDF_MIME = "application/pdf";

type DocumentVisibility = "admin_only" | "admin_and_client";
type DocumentKind = "file" | "link";

type DocumentDto = {
  id: string;
  propertyId: string;
  kind: DocumentKind;
  visibility: DocumentVisibility;
  label: string;
  externalUrl: string | null;
  storageBucket: string | null;
  storagePath: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  uploadedByAdminProfileId: string | null;
  uploadedByClientProfileId: string | null;
  createdAt: string;
  updatedAt: string;
};

type UploaderInfo = {
  documentId: string;
  uploaderKind: "admin" | "client" | "unknown";
  fullName: string | null;
  email: string | null;
};

type PropertyDocumentsAdminPanelProps = {
  propertyId: string;
};

const formatSize = (bytes: number | null) => {
  if (typeof bytes !== "number" || Number.isNaN(bytes)) return null;
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};

const formatDate = (iso: string) => {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

const describeUploader = (
  document: DocumentDto,
  uploader: UploaderInfo | undefined
) => {
  if (uploader?.uploaderKind === "admin") {
    return `Sillage Immo — ${uploader.fullName ?? uploader.email ?? "admin"}`;
  }
  if (uploader?.uploaderKind === "client") {
    return `Client — ${uploader.fullName ?? uploader.email ?? "co-propriétaire"}`;
  }
  if (document.uploadedByAdminProfileId) return "Sillage Immo";
  if (document.uploadedByClientProfileId) return "Client";
  return "Inconnu";
};

export function PropertyDocumentsAdminPanel({ propertyId }: PropertyDocumentsAdminPanelProps) {
  const [documents, setDocuments] = useState<DocumentDto[]>([]);
  const [uploaders, setUploaders] = useState<Record<string, UploaderInfo>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/properties/${propertyId}/documents`);
      const parsed = await parseApiResponse<{
        ok?: boolean;
        documents?: DocumentDto[];
        uploaders?: Record<string, UploaderInfo>;
      }>(res);
      if (!parsed.ok || !parsed.data || !Array.isArray(parsed.data.documents)) {
        throw new Error(parsed.message ?? "Chargement impossible.");
      }
      setDocuments(parsed.data.documents);
      setUploaders(parsed.data.uploaders ?? {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleDelete = async (documentId: string) => {
    if (typeof window !== "undefined" && !window.confirm("Supprimer ce document ?")) return;
    try {
      const res = await fetch(
        `/api/admin/properties/${propertyId}/documents/${documentId}`,
        { method: "DELETE" }
      );
      const parsed = await parseApiResponse(res);
      if (!parsed.ok) throw new Error(parsed.message ?? "Suppression impossible.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible.");
    }
  };

  const handleToggleVisibility = async (
    documentId: string,
    nextVisibility: DocumentVisibility
  ) => {
    try {
      const res = await fetch(
        `/api/admin/properties/${propertyId}/documents/${documentId}/visibility`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visibility: nextVisibility }),
        }
      );
      const parsed = await parseApiResponse(res);
      if (!parsed.ok) throw new Error(parsed.message ?? "Mise à jour impossible.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mise à jour impossible.");
    }
  };

  const handleDownload = async (documentId: string) => {
    try {
      const res = await fetch(
        `/api/admin/properties/${propertyId}/documents/${documentId}/signed-url`
      );
      const parsed = await parseApiResponse<{ url?: string }>(res);
      const url = parsed.data?.url;
      if (!parsed.ok || !url) throw new Error(parsed.message ?? "Lien indisponible.");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lien indisponible.");
    }
  };

  return (
    <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[#141446]">Documents</h2>
          <p className="text-sm text-[#141446]/70">
            PDF et liens partagés avec les propriétaires (25 Mo maximum par fichier).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="sillage-btn rounded px-4 py-2 text-sm"
          >
            Uploader un PDF
          </button>
          <button
            type="button"
            onClick={() => setShowLinkModal(true)}
            className="rounded border border-[rgba(20,20,70,0.16)] px-4 py-2 text-sm text-[#141446]"
          >
            Ajouter un lien
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-5 space-y-3">
        {loading ? (
          <p className="text-sm text-[#141446]/70">Chargement…</p>
        ) : documents.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[rgba(20,20,70,0.16)] p-4 text-sm text-[#141446]/60">
            Aucun document pour le moment.
          </p>
        ) : (
          documents.map((doc) => {
            const uploader = uploaders[doc.id];
            const size = formatSize(doc.sizeBytes);
            const isLink = doc.kind === "link";
            return (
              <article
                key={doc.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-[rgba(20,20,70,0.12)] p-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(20,20,70,0.08)] text-xs font-semibold text-[#141446]"
                    >
                      {isLink ? "↗" : "PDF"}
                    </span>
                    <h3 className="font-medium text-[#141446]">{doc.label}</h3>
                  </div>
                  <p className="text-xs text-[#141446]/70">
                    {describeUploader(doc, uploader)} · {formatDate(doc.createdAt)}
                    {size ? ` · ${size}` : ""}
                  </p>
                  <p className="flex flex-wrap gap-2 text-xs">
                    <span
                      className={`rounded-full px-2 py-0.5 ${
                        doc.visibility === "admin_only"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {doc.visibility === "admin_only" ? "Interne admin" : "Visible client"}
                    </span>
                    {isLink ? (
                      <span className="rounded-full bg-[rgba(20,20,70,0.06)] px-2 py-0.5 text-[#141446]/80">
                        Lien externe
                      </span>
                    ) : null}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {isLink && doc.externalUrl ? (
                    <a
                      href={doc.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded border border-[rgba(20,20,70,0.16)] px-3 py-1 text-sm text-[#141446]"
                    >
                      Ouvrir
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleDownload(doc.id)}
                      className="rounded border border-[rgba(20,20,70,0.16)] px-3 py-1 text-sm text-[#141446]"
                    >
                      Télécharger
                    </button>
                  )}
                  {doc.uploadedByClientProfileId ? null : (
                    <button
                      type="button"
                      onClick={() =>
                        handleToggleVisibility(
                          doc.id,
                          doc.visibility === "admin_only" ? "admin_and_client" : "admin_only"
                        )
                      }
                      className="rounded border border-[rgba(20,20,70,0.16)] px-3 py-1 text-sm text-[#141446]"
                    >
                      {doc.visibility === "admin_only" ? "Partager au client" : "Passer en interne"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(doc.id)}
                    className="rounded border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50"
                  >
                    Supprimer
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>

      {showUploadModal ? (
        <UploadDocumentModal
          propertyId={propertyId}
          onClose={() => setShowUploadModal(false)}
          onUploaded={async () => {
            setShowUploadModal(false);
            await refresh();
          }}
        />
      ) : null}

      {showLinkModal ? (
        <AddLinkModal
          propertyId={propertyId}
          onClose={() => setShowLinkModal(false)}
          onCreated={async () => {
            setShowLinkModal(false);
            await refresh();
          }}
        />
      ) : null}
    </section>
  );
}

type UploadDocumentModalProps = {
  propertyId: string;
  onClose: () => void;
  onUploaded: () => Promise<void> | void;
};

function UploadDocumentModal({ propertyId, onClose, onUploaded }: UploadDocumentModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const [adminOnly, setAdminOnly] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const onSelect = (selected: File | null) => {
    setError(null);
    if (!selected) {
      setFile(null);
      return;
    }
    if (selected.type !== "application/pdf") {
      setError("Le fichier doit être au format PDF.");
      setFile(null);
      return;
    }
    if (selected.size > MAX_FILE_BYTES) {
      setError("Le fichier dépasse 25 Mo.");
      setFile(null);
      return;
    }
    setFile(selected);
    if (!label.trim()) setLabel(selected.name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Sélectionnez un fichier PDF.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // 1) Demander une URL d'upload signee a notre API.
      const urlRes = await fetch(
        `/api/admin/properties/${propertyId}/documents/upload-url`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            sizeBytes: file.size,
            mimeType: file.type || PDF_MIME,
          }),
        }
      );
      const urlParsed = await parseApiResponse<{
        uploadUrl?: string;
        storagePath?: string;
      }>(urlRes);
      const uploadUrl = urlParsed.data?.uploadUrl;
      const storagePath = urlParsed.data?.storagePath;
      if (!urlParsed.ok || !uploadUrl || !storagePath) {
        throw new Error(urlParsed.message ?? "Préparation de l'upload impossible.");
      }

      // 2) Upload direct vers Supabase Storage (contourne la limite Vercel
      // de 4.5 Mo sur les serverless functions).
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || PDF_MIME },
        body: file,
      });
      if (!putRes.ok) {
        const text = await putRes.text().catch(() => "");
        throw new Error(
          text?.trim()
            ? `Upload Supabase echoue (${putRes.status}).`
            : `Upload Supabase echoue (${putRes.status}).`
        );
      }

      // 3) Confirmer cote API : on cree la ligne metadata.
      const createRes = await fetch(`/api/admin/properties/${propertyId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "file",
          storagePath,
          label: label.trim() || undefined,
          visibility: adminOnly ? "admin_only" : "admin_and_client",
        }),
      });
      const createParsed = await parseApiResponse(createRes);
      if (!createParsed.ok) {
        throw new Error(createParsed.message ?? "Téléversement impossible.");
      }
      await onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Téléversement impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const dropped = e.dataTransfer.files?.[0] ?? null;
    onSelect(dropped);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg space-y-4 rounded-3xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-[#141446]">Uploader un PDF</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#141446]/70 hover:bg-[rgba(20,20,70,0.06)]"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-[rgba(20,20,70,0.20)] p-6 text-center text-sm text-[#141446]/70 hover:bg-[rgba(20,20,70,0.04)]"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => onSelect(e.target.files?.[0] ?? null)}
          />
          <span className="font-medium text-[#141446]">
            {file ? file.name : "Cliquer ou glisser-déposer un PDF"}
          </span>
          <span>PDF uniquement, 25 Mo maximum.</span>
        </label>

        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Libellé du document (facultatif)"
          className="w-full rounded-xl border border-[rgba(20,20,70,0.16)] px-4 py-2 text-sm"
          maxLength={200}
        />

        <label className="flex items-center gap-2 text-sm text-[#141446]">
          <input
            type="checkbox"
            checked={adminOnly}
            onChange={(e) => setAdminOnly(e.target.checked)}
          />
          Document interne admin (non visible par le client)
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded border border-[rgba(20,20,70,0.16)] px-4 py-2 text-sm text-[#141446] disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={submitting || !file}
            className="sillage-btn rounded px-4 py-2 text-sm disabled:opacity-50"
          >
            {submitting ? "Envoi…" : "Téléverser"}
          </button>
        </div>
      </form>
    </div>
  );
}

type AddLinkModalProps = {
  propertyId: string;
  onClose: () => void;
  onCreated: () => Promise<void> | void;
};

function AddLinkModal({ propertyId, onClose, onCreated }: AddLinkModalProps) {
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
      const res = await fetch(`/api/admin/properties/${propertyId}/documents`, {
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
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg space-y-4 rounded-3xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-[#141446]">Ajouter un lien</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#141446]/70 hover:bg-[rgba(20,20,70,0.06)]"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Libellé du lien"
          className="w-full rounded-xl border border-[rgba(20,20,70,0.16)] px-4 py-2 text-sm"
          maxLength={200}
          required
        />
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          className="w-full rounded-xl border border-[rgba(20,20,70,0.16)] px-4 py-2 text-sm"
          required
        />
        <label className="flex items-center gap-2 text-sm text-[#141446]">
          <input
            type="checkbox"
            checked={adminOnly}
            onChange={(e) => setAdminOnly(e.target.checked)}
          />
          Lien interne admin (non visible par le client)
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded border border-[rgba(20,20,70,0.16)] px-4 py-2 text-sm text-[#141446] disabled:opacity-50"
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
        </div>
      </form>
    </div>
  );
}
