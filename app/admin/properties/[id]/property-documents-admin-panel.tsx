"use client";

import { useMemo, useState } from "react";
import {
  PropertyDocumentList,
  usePropertyDocuments,
} from "@/app/components/property-documents/document-list";
import {
  UploadPdfModal,
  type UploadPdfModalCopy,
} from "@/app/components/property-documents/upload-pdf-modal";
import {
  formatFileSize,
  propertyDocumentApiPaths,
  uploadPropertyDocumentPdf,
  type PropertyDocumentDto,
  type PropertyDocumentUploaderInfo,
  type PropertyDocumentVisibility,
} from "@/lib/property-documents/shared";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { AddLinkModal } from "./add-link-modal";

type PropertyDocumentsAdminPanelProps = {
  propertyId: string;
};

const UPLOAD_MODAL_COPY: UploadPdfModalCopy = {
  title: "Uploader un PDF",
  hint: "Cliquer ou glisser-déposer un PDF",
  help: "PDF uniquement, 25 Mo maximum.",
  labelPlaceholder: "Libellé du document (facultatif)",
  labelAriaLabel: "Libellé du document",
  visibilityToggle: "Document interne admin (non visible par le client)",
  cancel: "Annuler",
  submit: "Téléverser",
  submitting: "Envoi…",
  errorPdf: "Le fichier doit être au format PDF.",
  errorSize: "Le fichier dépasse 25 Mo.",
  pickPdf: "Sélectionnez un fichier PDF.",
};

const UPLOAD_MESSAGES = {
  notPdf: "Le fichier doit être au format PDF.",
  tooLarge: "Le fichier dépasse 25 Mo.",
  prepareFailed: "Préparation de l'upload impossible.",
  putFailed: (status: number) => `Upload Supabase echoue (${status}).`,
  createFailed: "Téléversement impossible.",
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
  document: PropertyDocumentDto,
  uploader: PropertyDocumentUploaderInfo | undefined
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
  const paths = useMemo(() => propertyDocumentApiPaths("admin", propertyId), [propertyId]);
  const {
    documents,
    uploaders,
    loading,
    error,
    setError,
    refresh,
    deleteDocument,
    downloadDocument,
  } = usePropertyDocuments({
    paths,
    confirmDelete: "Supprimer ce document ?",
    loadErrorText: "Chargement impossible.",
    deleteErrorText: "Suppression impossible.",
    downloadErrorText: "Lien indisponible.",
  });
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleToggleVisibility = async (
    documentId: string,
    nextVisibility: PropertyDocumentVisibility
  ) => {
    try {
      const res = await fetch(paths.visibility!(documentId), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: nextVisibility }),
      });
      const parsed = await parseApiResponse(res);
      if (!parsed.ok) throw new Error(parsed.message ?? "Mise à jour impossible.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mise à jour impossible.");
    }
  };

  const handleUpload = async (file: File, label: string, adminOnly?: boolean) => {
    setUploadBusy(true);
    setUploadError(null);
    const result = await uploadPropertyDocumentPdf({
      paths,
      file,
      label,
      visibility: adminOnly ? "admin_only" : "admin_and_client",
      messages: UPLOAD_MESSAGES,
    });
    setUploadBusy(false);
    if (!result.ok) {
      setUploadError(result.error);
      return;
    }
    setShowUploadModal(false);
    await refresh();
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

      <PropertyDocumentList
        documents={documents}
        uploaders={uploaders}
        loading={loading}
        loadingText="Chargement…"
        emptyText="Aucun document pour le moment."
        headingTag="h3"
        renderMeta={(doc, uploader) => {
          const size = formatFileSize(doc.sizeBytes);
          return `${describeUploader(doc, uploader)} · ${formatDate(doc.createdAt)}${size ? ` · ${size}` : ""}`;
        }}
        renderBadges={(doc) => (
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
            {doc.kind === "link" ? (
              <span className="rounded-full bg-[rgba(20,20,70,0.06)] px-2 py-0.5 text-[#141446]/80">
                Lien externe
              </span>
            ) : null}
          </p>
        )}
        renderActions={(doc) => (
          <>
            {doc.kind === "link" && doc.externalUrl ? (
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
                onClick={() => downloadDocument(doc.id)}
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
              onClick={() => deleteDocument(doc.id)}
              className="rounded border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50"
            >
              Supprimer
            </button>
          </>
        )}
      />

      {showUploadModal ? (
        <UploadPdfModal
          copy={UPLOAD_MODAL_COPY}
          showVisibilityToggle
          busy={uploadBusy}
          error={uploadError}
          onClose={() => setShowUploadModal(false)}
          onSubmit={handleUpload}
        />
      ) : null}

      {showLinkModal ? (
        <AddLinkModal
          createPath={paths.create}
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
