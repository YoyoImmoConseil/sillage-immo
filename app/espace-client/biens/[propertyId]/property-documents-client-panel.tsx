"use client";

import { useMemo, useState } from "react";
import {
  PropertyDocumentList,
  usePropertyDocuments,
} from "@/app/components/property-documents/document-list";
import { UploadPdfModal } from "@/app/components/property-documents/upload-pdf-modal";
import { track } from "@/lib/analytics/data-layer";
import {
  PROPERTY_DOCUMENT_PDF_MIME,
  formatFileSize,
  propertyDocumentApiPaths,
  uploadPropertyDocumentPdf,
  type PropertyDocumentDto,
  type PropertyDocumentUploaderInfo,
} from "@/lib/property-documents/shared";

type Locale = "fr" | "en" | "es" | "ru";

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
  document: PropertyDocumentDto,
  uploader: PropertyDocumentUploaderInfo | undefined,
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
  const paths = useMemo(() => propertyDocumentApiPaths("client", propertyId), [propertyId]);
  const { documents, uploaders, loading, error, refresh, deleteDocument, downloadDocument } =
    usePropertyDocuments({
      paths,
      confirmDelete: copy.confirmDelete,
      loadErrorText: copy.errorGeneric,
      deleteErrorText: copy.errorGeneric,
      downloadErrorText: copy.errorGeneric,
    });
  const [showUpload, setShowUpload] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUpload = async (file: File, label: string) => {
    setUploadBusy(true);
    setUploadError(null);
    const result = await uploadPropertyDocumentPdf({
      paths,
      file,
      label,
      messages: {
        notPdf: copy.errorPdf,
        tooLarge: copy.errorSize,
        prepareFailed: copy.errorGeneric,
        putFailed: (status) => `${copy.errorGeneric} (${status})`,
        createFailed: copy.errorGeneric,
      },
    });
    setUploadBusy(false);
    if (!result.ok) {
      setUploadError(result.error);
      return;
    }
    track("client_document_uploaded", {
      property_id: propertyId,
      size_kb: Math.round(file.size / 1024),
      mime: file.type || PROPERTY_DOCUMENT_PDF_MIME,
      actor: "client",
    });
    setShowUpload(false);
    await refresh();
  };

  return (
    <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-navy">{copy.title}</h3>
          <p className="text-sm text-navy/70">{copy.description}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowUpload(true)}
          className="rounded bg-navy px-4 py-2 text-sm text-sand"
        >
          {copy.uploadCta}
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <PropertyDocumentList
        documents={documents}
        uploaders={uploaders}
        loading={loading}
        loadingText="…"
        emptyText={copy.empty}
        headingTag="h4"
        renderMeta={(doc, uploader) => {
          const size = formatFileSize(doc.sizeBytes);
          return `${describeUploader(doc, uploader, clientProfileId, copy)} · ${formatDate(doc.createdAt, locale)}${size ? ` · ${size}` : ""}`;
        }}
        renderBadges={(doc) =>
          doc.kind === "link" ? (
            <p className="text-xs">
              <span className="rounded-full bg-[rgba(20,20,70,0.06)] px-2 py-0.5 text-navy/80">
                {copy.externalLink}
              </span>
            </p>
          ) : null
        }
        renderActions={(doc) => (
          <>
            {doc.kind === "link" && doc.externalUrl ? (
              <a
                href={doc.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded border border-[rgba(20,20,70,0.16)] px-3 py-1 text-sm text-navy"
              >
                {copy.open}
              </a>
            ) : (
              <button
                type="button"
                onClick={() => downloadDocument(doc.id)}
                className="rounded border border-[rgba(20,20,70,0.16)] px-3 py-1 text-sm text-navy"
              >
                {copy.download}
              </button>
            )}
            {doc.uploadedByClientProfileId === clientProfileId ? (
              <button
                type="button"
                onClick={() => deleteDocument(doc.id)}
                className="rounded border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50"
              >
                {copy.delete}
              </button>
            ) : null}
          </>
        )}
      />

      {showUpload ? (
        <UploadPdfModal
          copy={{
            title: copy.uploadCta,
            hint: copy.uploadHint,
            help: copy.uploadHelp,
            labelPlaceholder: copy.labelOptional,
            cancel: copy.cancel,
            submit: copy.uploadSubmit,
            submitting: copy.uploadSubmitting,
            errorPdf: copy.errorPdf,
            errorSize: copy.errorSize,
            pickPdf: copy.pickPdf,
          }}
          busy={uploadBusy}
          error={uploadError}
          onClose={() => setShowUpload(false)}
          onSubmit={handleUpload}
          submitClassName="rounded bg-navy px-4 py-2 text-sm text-sand disabled:opacity-50"
        />
      ) : null}
    </section>
  );
}
