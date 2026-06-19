"use client";

import { useMemo, useState } from "react";
import {
  PropertyDocumentList,
  usePropertyDocuments,
} from "@/app/components/property-documents/document-list";
import { UploadPdfModal } from "@/app/components/property-documents/upload-pdf-modal";
import {
  formatFileSize,
  presentedDocumentApiPaths,
  uploadPropertyDocumentPdf,
  type PropertyDocumentDto,
  type PropertyDocumentUploaderInfo,
} from "@/lib/property-documents/shared";

type Locale = "fr" | "en" | "es" | "ru";

export type PresentedPropertyClientDto = {
  id: string;
  label: string;
  address: string | null;
  city: string | null;
  priceAmount: number | null;
  rooms: number | null;
  livingAreaM2: number | null;
  externalUrl: string | null;
};

type CopyTable = {
  sectionTitle: string;
  sectionDescription: string;
  documentsTitle: string;
  empty: string;
  uploadCta: string;
  uploadHint: string;
  uploadHelp: string;
  uploadSubmit: string;
  uploadSubmitting: string;
  cancel: string;
  download: string;
  open: string;
  openListing: string;
  delete: string;
  confirmDelete: string;
  errorPdf: string;
  errorSize: string;
  errorGeneric: string;
  uploadedByAdmin: string;
  uploadedBySelf: string;
  uploadedByOther: string;
  externalLink: string;
  pickPdf: string;
  labelOptional: string;
};

const COPY: Record<Locale, CopyTable> = {
  fr: {
    sectionTitle: "Biens présentés par votre conseiller",
    sectionDescription:
      "Les biens que votre conseiller vous présente et leurs documents. Vous pouvez aussi y déposer vos documents (justificatif de financement, etc.).",
    documentsTitle: "Documents",
    empty: "Aucun document pour ce bien.",
    uploadCta: "Ajouter un document",
    uploadHint: "Cliquer ou glisser-déposer un PDF",
    uploadHelp: "PDF uniquement, 25 Mo maximum.",
    uploadSubmit: "Téléverser",
    uploadSubmitting: "Envoi…",
    cancel: "Annuler",
    download: "Télécharger",
    open: "Ouvrir",
    openListing: "Voir l’annonce",
    delete: "Supprimer",
    confirmDelete: "Supprimer ce document ?",
    errorPdf: "Le fichier doit être au format PDF.",
    errorSize: "Le fichier dépasse 25 Mo.",
    errorGeneric: "Une erreur est survenue.",
    uploadedByAdmin: "Sillage Immo",
    uploadedBySelf: "Vous",
    uploadedByOther: "Co-acquéreur",
    externalLink: "Lien externe",
    pickPdf: "Sélectionnez un fichier PDF.",
    labelOptional: "Libellé (facultatif)",
  },
  en: {
    sectionTitle: "Properties presented by your advisor",
    sectionDescription:
      "Properties your advisor presents to you and their documents. You can also add your own documents (proof of financing, etc.).",
    documentsTitle: "Documents",
    empty: "No documents for this property.",
    uploadCta: "Add a document",
    uploadHint: "Click or drag and drop a PDF",
    uploadHelp: "PDF only, 25 MB max.",
    uploadSubmit: "Upload",
    uploadSubmitting: "Uploading…",
    cancel: "Cancel",
    download: "Download",
    open: "Open",
    openListing: "View listing",
    delete: "Delete",
    confirmDelete: "Delete this document?",
    errorPdf: "File must be a PDF.",
    errorSize: "File exceeds 25 MB.",
    errorGeneric: "An error occurred.",
    uploadedByAdmin: "Sillage Immo",
    uploadedBySelf: "You",
    uploadedByOther: "Co-buyer",
    externalLink: "External link",
    pickPdf: "Pick a PDF file.",
    labelOptional: "Label (optional)",
  },
  es: {
    sectionTitle: "Inmuebles presentados por su asesor",
    sectionDescription:
      "Los inmuebles que su asesor le presenta y sus documentos. También puede añadir sus propios documentos (justificante de financiación, etc.).",
    documentsTitle: "Documentos",
    empty: "Sin documentos para este inmueble.",
    uploadCta: "Añadir un documento",
    uploadHint: "Haga clic o arrastre un PDF",
    uploadHelp: "Solo PDF, 25 MB máx.",
    uploadSubmit: "Subir",
    uploadSubmitting: "Enviando…",
    cancel: "Cancelar",
    download: "Descargar",
    open: "Abrir",
    openListing: "Ver anuncio",
    delete: "Eliminar",
    confirmDelete: "¿Eliminar este documento?",
    errorPdf: "El archivo debe ser PDF.",
    errorSize: "El archivo supera 25 MB.",
    errorGeneric: "Ha ocurrido un error.",
    uploadedByAdmin: "Sillage Immo",
    uploadedBySelf: "Usted",
    uploadedByOther: "Cocomprador",
    externalLink: "Enlace externo",
    pickPdf: "Seleccione un archivo PDF.",
    labelOptional: "Etiqueta (opcional)",
  },
  ru: {
    sectionTitle: "Объекты, предложенные вашим консультантом",
    sectionDescription:
      "Объекты, которые предлагает ваш консультант, и их документы. Вы также можете загрузить свои документы (подтверждение финансирования и т. д.).",
    documentsTitle: "Документы",
    empty: "Нет документов по этому объекту.",
    uploadCta: "Добавить документ",
    uploadHint: "Нажмите или перетащите PDF",
    uploadHelp: "Только PDF, не более 25 МБ.",
    uploadSubmit: "Загрузить",
    uploadSubmitting: "Загрузка…",
    cancel: "Отмена",
    download: "Скачать",
    open: "Открыть",
    openListing: "Открыть объявление",
    delete: "Удалить",
    confirmDelete: "Удалить этот документ?",
    errorPdf: "Файл должен быть в формате PDF.",
    errorSize: "Файл превышает 25 МБ.",
    errorGeneric: "Произошла ошибка.",
    uploadedByAdmin: "Sillage Immo",
    uploadedBySelf: "Вы",
    uploadedByOther: "Созаёмщик",
    externalLink: "Внешняя ссылка",
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
  if (document.uploadedByClientProfileId === clientProfileId) return copy.uploadedBySelf;
  if (document.uploadedByAdminProfileId) return copy.uploadedByAdmin;
  if (uploader?.uploaderKind === "client") return uploader.fullName ?? copy.uploadedByOther;
  return copy.uploadedByOther;
};

const describeGroup = (group: PresentedPropertyClientDto, locale: Locale) => {
  const parts: string[] = [];
  if (group.address) parts.push(group.address);
  if (group.city) parts.push(group.city);
  if (typeof group.rooms === "number") parts.push(`${group.rooms} P`);
  if (typeof group.livingAreaM2 === "number") parts.push(`${group.livingAreaM2} m²`);
  if (typeof group.priceAmount === "number") {
    parts.push(`${group.priceAmount.toLocaleString(locale === "fr" ? "fr-FR" : locale)} €`);
  }
  return parts.join(" · ");
};

function PresentedGroupClient({
  group,
  clientProfileId,
  locale,
  copy,
}: {
  group: PresentedPropertyClientDto;
  clientProfileId: string;
  locale: Locale;
  copy: CopyTable;
}) {
  const paths = useMemo(
    () => presentedDocumentApiPaths({ scope: "client", presentedId: group.id }),
    [group.id]
  );
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
    setShowUpload(false);
    await refresh();
  };

  return (
    <article className="rounded-2xl border border-[rgba(20,20,70,0.12)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h4 className="font-semibold text-navy">{group.label}</h4>
          {describeGroup(group, locale) ? (
            <p className="text-xs text-navy/70">{describeGroup(group, locale)}</p>
          ) : null}
          {group.externalUrl ? (
            <a
              href={group.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs underline text-navy"
            >
              {copy.openListing}
            </a>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setShowUpload(true)}
          className="rounded bg-navy px-3 py-1.5 text-xs text-sand"
        >
          {copy.uploadCta}
        </button>
      </div>

      {error ? (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
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
    </article>
  );
}

type Props = {
  groups: PresentedPropertyClientDto[];
  clientProfileId: string;
  locale: Locale;
};

export function PresentedPropertiesClient({ groups, clientProfileId, locale }: Props) {
  const copy = COPY[locale];
  if (groups.length === 0) return null;

  return (
    <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
      <div>
        <h3 className="text-xl font-semibold text-navy">{copy.sectionTitle}</h3>
        <p className="text-sm text-navy/70">{copy.sectionDescription}</p>
      </div>
      <div className="mt-5 space-y-4">
        {groups.map((group) => (
          <PresentedGroupClient
            key={group.id}
            group={group}
            clientProfileId={clientProfileId}
            locale={locale}
            copy={copy}
          />
        ))}
      </div>
    </section>
  );
}
