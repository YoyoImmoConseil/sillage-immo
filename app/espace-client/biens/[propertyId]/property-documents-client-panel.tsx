"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { track } from "@/lib/analytics/data-layer";
import { parseApiResponse } from "@/lib/http/parse-api-response";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const PDF_MIME = "application/pdf";

type Locale = "fr" | "en" | "es" | "ru";

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

type CopyTable = {
  title: string;
  description: string;
  empty: string;
  uploadCta: string;
  uploadHint: string;
  uploadHelp: string;
  uploadSubmit: string;
  uploadSubmitting: string;
  cancel: string;
  download: string;
  open: string;
  delete: string;
  confirmDelete: string;
  errorPdf: string;
  errorSize: string;
  errorGeneric: string;
  uploadedByAdmin: string;
  uploadedBySelf: string;
  uploadedByOther: string;
  externalLink: string;
  yourUpload: string;
  pickPdf: string;
  labelOptional: string;
};

const COPY: Record<Locale, CopyTable> = {
  fr: {
    title: "Documents partagés",
    description: "PDF et liens partagés avec votre conseiller (25 Mo maximum par fichier).",
    empty: "Aucun document pour le moment.",
    uploadCta: "Uploader un PDF",
    uploadHint: "Cliquer ou glisser-déposer un PDF",
    uploadHelp: "PDF uniquement, 25 Mo maximum.",
    uploadSubmit: "Téléverser",
    uploadSubmitting: "Envoi…",
    cancel: "Annuler",
    download: "Télécharger",
    open: "Ouvrir",
    delete: "Supprimer",
    confirmDelete: "Supprimer ce document ?",
    errorPdf: "Le fichier doit être au format PDF.",
    errorSize: "Le fichier dépasse 25 Mo.",
    errorGeneric: "Une erreur est survenue.",
    uploadedByAdmin: "Sillage Immo",
    uploadedBySelf: "Vous",
    uploadedByOther: "Co-propriétaire",
    externalLink: "Lien externe",
    yourUpload: "Votre dépôt",
    pickPdf: "Sélectionnez un fichier PDF.",
    labelOptional: "Libellé (facultatif)",
  },
  en: {
    title: "Shared documents",
    description: "PDFs and links shared with your advisor (25 MB max per file).",
    empty: "No documents yet.",
    uploadCta: "Upload a PDF",
    uploadHint: "Click or drag and drop a PDF",
    uploadHelp: "PDF only, 25 MB max.",
    uploadSubmit: "Upload",
    uploadSubmitting: "Uploading…",
    cancel: "Cancel",
    download: "Download",
    open: "Open",
    delete: "Delete",
    confirmDelete: "Delete this document?",
    errorPdf: "File must be a PDF.",
    errorSize: "File exceeds 25 MB.",
    errorGeneric: "An error occurred.",
    uploadedByAdmin: "Sillage Immo",
    uploadedBySelf: "You",
    uploadedByOther: "Co-owner",
    externalLink: "External link",
    yourUpload: "Your upload",
    pickPdf: "Pick a PDF file.",
    labelOptional: "Label (optional)",
  },
  es: {
    title: "Documentos compartidos",
    description: "PDFs y enlaces compartidos con su asesor (25 MB máx. por archivo).",
    empty: "Aún no hay documentos.",
    uploadCta: "Subir un PDF",
    uploadHint: "Haga clic o arrastre un PDF",
    uploadHelp: "Solo PDF, 25 MB máx.",
    uploadSubmit: "Subir",
    uploadSubmitting: "Enviando…",
    cancel: "Cancelar",
    download: "Descargar",
    open: "Abrir",
    delete: "Eliminar",
    confirmDelete: "¿Eliminar este documento?",
    errorPdf: "El archivo debe ser PDF.",
    errorSize: "El archivo supera 25 MB.",
    errorGeneric: "Ha ocurrido un error.",
    uploadedByAdmin: "Sillage Immo",
    uploadedBySelf: "Usted",
    uploadedByOther: "Copropietario",
    externalLink: "Enlace externo",
    yourUpload: "Su carga",
    pickPdf: "Seleccione un archivo PDF.",
    labelOptional: "Etiqueta (opcional)",
  },
  ru: {
    title: "Совместные документы",
    description: "PDF-файлы и ссылки, доступные вам и вашему консультанту (до 25 МБ).",
    empty: "Документы пока отсутствуют.",
    uploadCta: "Загрузить PDF",
    uploadHint: "Нажмите или перетащите PDF",
    uploadHelp: "Только PDF, не более 25 МБ.",
    uploadSubmit: "Загрузить",
    uploadSubmitting: "Загрузка…",
    cancel: "Отмена",
    download: "Скачать",
    open: "Открыть",
    delete: "Удалить",
    confirmDelete: "Удалить этот документ?",
    errorPdf: "Файл должен быть в формате PDF.",
    errorSize: "Файл превышает 25 МБ.",
    errorGeneric: "Произошла ошибка.",
    uploadedByAdmin: "Sillage Immo",
    uploadedBySelf: "Вы",
    uploadedByOther: "Совладелец",
    externalLink: "Внешняя ссылка",
    yourUpload: "Ваш файл",
    pickPdf: "Выберите PDF-файл.",
    labelOptional: "Название (необязательно)",
  },
};

const formatSize = (bytes: number | null) => {
  if (typeof bytes !== "number" || Number.isNaN(bytes)) return null;
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};

const formatDate = (iso: string, locale: Locale) => {
  try {
    return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

const describeUploader = (
  document: DocumentDto,
  uploader: UploaderInfo | undefined,
  clientProfileId: string,
  copy: CopyTable
) => {
  if (document.uploadedByClientProfileId === clientProfileId) {
    return copy.uploadedBySelf;
  }
  if (document.uploadedByAdminProfileId) {
    return copy.uploadedByAdmin;
  }
  if (uploader?.uploaderKind === "client") {
    return uploader.fullName ?? copy.uploadedByOther;
  }
  return copy.uploadedByOther;
};

type Props = {
  propertyId: string;
  clientProfileId: string;
  locale: Locale;
};

export function PropertyDocumentsClientPanel({ propertyId, clientProfileId, locale }: Props) {
  const copy = COPY[locale];
  const [documents, setDocuments] = useState<DocumentDto[]>([]);
  const [uploaders, setUploaders] = useState<Record<string, UploaderInfo>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/espace-client/properties/${propertyId}/documents`);
      const parsed = await parseApiResponse<{
        ok?: boolean;
        documents?: DocumentDto[];
        uploaders?: Record<string, UploaderInfo>;
      }>(res);
      if (!parsed.ok || !parsed.data || !Array.isArray(parsed.data.documents)) {
        throw new Error(parsed.message ?? copy.errorGeneric);
      }
      setDocuments(parsed.data.documents);
      setUploaders(parsed.data.uploaders ?? {});
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.errorGeneric);
    } finally {
      setLoading(false);
    }
  }, [propertyId, copy.errorGeneric]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleDelete = async (documentId: string) => {
    if (typeof window !== "undefined" && !window.confirm(copy.confirmDelete)) return;
    try {
      const res = await fetch(
        `/api/espace-client/properties/${propertyId}/documents/${documentId}`,
        { method: "DELETE" }
      );
      const parsed = await parseApiResponse(res);
      if (!parsed.ok) throw new Error(parsed.message ?? copy.errorGeneric);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.errorGeneric);
    }
  };

  const handleDownload = async (documentId: string) => {
    try {
      const res = await fetch(
        `/api/espace-client/properties/${propertyId}/documents/${documentId}/signed-url`
      );
      const parsed = await parseApiResponse<{ url?: string }>(res);
      const url = parsed.data?.url;
      if (!parsed.ok || !url) throw new Error(parsed.message ?? copy.errorGeneric);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.errorGeneric);
    }
  };

  return (
    <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-[#141446]">{copy.title}</h3>
          <p className="text-sm text-[#141446]/70">{copy.description}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowUpload(true)}
          className="rounded bg-[#141446] px-4 py-2 text-sm text-[#f4ece4]"
        >
          {copy.uploadCta}
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-5 space-y-3">
        {loading ? (
          <p className="text-sm text-[#141446]/70">…</p>
        ) : documents.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[rgba(20,20,70,0.16)] p-4 text-sm text-[#141446]/60">
            {copy.empty}
          </p>
        ) : (
          documents.map((doc) => {
            const uploader = uploaders[doc.id];
            const size = formatSize(doc.sizeBytes);
            const isLink = doc.kind === "link";
            const isOwn = doc.uploadedByClientProfileId === clientProfileId;
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
                    <h4 className="font-medium text-[#141446]">{doc.label}</h4>
                  </div>
                  <p className="text-xs text-[#141446]/70">
                    {describeUploader(doc, uploader, clientProfileId, copy)} · {formatDate(doc.createdAt, locale)}
                    {size ? ` · ${size}` : ""}
                  </p>
                  {isLink ? (
                    <p className="text-xs">
                      <span className="rounded-full bg-[rgba(20,20,70,0.06)] px-2 py-0.5 text-[#141446]/80">
                        {copy.externalLink}
                      </span>
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {isLink && doc.externalUrl ? (
                    <a
                      href={doc.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded border border-[rgba(20,20,70,0.16)] px-3 py-1 text-sm text-[#141446]"
                    >
                      {copy.open}
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleDownload(doc.id)}
                      className="rounded border border-[rgba(20,20,70,0.16)] px-3 py-1 text-sm text-[#141446]"
                    >
                      {copy.download}
                    </button>
                  )}
                  {isOwn ? (
                    <button
                      type="button"
                      onClick={() => handleDelete(doc.id)}
                      className="rounded border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50"
                    >
                      {copy.delete}
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })
        )}
      </div>

      {showUpload ? (
        <ClientUploadModal
          propertyId={propertyId}
          copy={copy}
          onClose={() => setShowUpload(false)}
          onUploaded={async () => {
            setShowUpload(false);
            await refresh();
          }}
        />
      ) : null}
    </section>
  );
}

type ClientUploadModalProps = {
  propertyId: string;
  copy: CopyTable;
  onClose: () => void;
  onUploaded: () => Promise<void> | void;
};

function ClientUploadModal({ propertyId, copy, onClose, onUploaded }: ClientUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");
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
      setError(copy.errorPdf);
      setFile(null);
      return;
    }
    if (selected.size > MAX_FILE_BYTES) {
      setError(copy.errorSize);
      setFile(null);
      return;
    }
    setFile(selected);
    if (!label.trim()) setLabel(selected.name);
  };

  const isReady = useMemo(() => !!file && !submitting, [file, submitting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError(copy.pickPdf);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const urlRes = await fetch(
        `/api/espace-client/properties/${propertyId}/documents/upload-url`,
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
        throw new Error(urlParsed.message ?? copy.errorGeneric);
      }

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || PDF_MIME },
        body: file,
      });
      if (!putRes.ok) {
        throw new Error(`${copy.errorGeneric} (${putRes.status})`);
      }

      const createRes = await fetch(`/api/espace-client/properties/${propertyId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "file",
          storagePath,
          label: label.trim() || undefined,
        }),
      });
      const createParsed = await parseApiResponse(createRes);
      if (!createParsed.ok) {
        throw new Error(createParsed.message ?? copy.errorGeneric);
      }
      track("client_document_uploaded", {
        property_id: propertyId,
        size_kb: Math.round(file.size / 1024),
        mime: file.type || PDF_MIME,
        actor: "client",
      });
      await onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.errorGeneric);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(e.dataTransfer.files?.[0] ?? null);
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
          <h3 className="text-lg font-semibold text-[#141446]">{copy.uploadCta}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#141446]/70 hover:bg-[rgba(20,20,70,0.06)]"
            aria-label="Close"
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
          <span className="font-medium text-[#141446]">{file ? file.name : copy.uploadHint}</span>
          <span>{copy.uploadHelp}</span>
        </label>

        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={copy.labelOptional}
          className="w-full rounded-xl border border-[rgba(20,20,70,0.16)] px-4 py-2 text-sm"
          maxLength={200}
        />

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded border border-[rgba(20,20,70,0.16)] px-4 py-2 text-sm text-[#141446] disabled:opacity-50"
          >
            {copy.cancel}
          </button>
          <button
            type="submit"
            disabled={!isReady}
            className="rounded bg-[#141446] px-4 py-2 text-sm text-[#f4ece4] disabled:opacity-50"
          >
            {submitting ? copy.uploadSubmitting : copy.uploadSubmit}
          </button>
        </div>
      </form>
    </div>
  );
}
