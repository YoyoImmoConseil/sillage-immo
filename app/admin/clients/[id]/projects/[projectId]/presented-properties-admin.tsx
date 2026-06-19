"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Modal } from "@/app/components/modal";
import { parseApiResponse } from "@/lib/http/parse-api-response";
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
  presentedDocumentApiPaths,
  uploadPropertyDocumentPdf,
  type PropertyDocumentDto,
  type PropertyDocumentUploaderInfo,
  type PropertyDocumentVisibility,
} from "@/lib/property-documents/shared";
import { AddLinkModal } from "@/app/admin/properties/[id]/add-link-modal";

export type PresentedPropertyDto = {
  id: string;
  clientProjectId: string;
  propertyId: string | null;
  label: string;
  address: string | null;
  city: string | null;
  priceAmount: number | null;
  rooms: number | null;
  livingAreaM2: number | null;
  externalUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type PresentedPropertiesAdminProps = {
  clientId: string;
  projectId: string;
  canEdit: boolean;
};

const UPLOAD_MODAL_COPY: UploadPdfModalCopy = {
  title: "Uploader un PDF",
  hint: "Cliquer ou glisser-déposer un PDF",
  help: "PDF uniquement, 25 Mo maximum.",
  labelPlaceholder: "Libellé du document (facultatif)",
  labelAriaLabel: "Libellé du document",
  visibilityToggle: "Document interne admin (non visible par l’acquéreur)",
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
  prepareFailed: "Préparation de l’upload impossible.",
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
    return `Acquéreur — ${uploader.fullName ?? uploader.email ?? "acquéreur"}`;
  }
  if (document.uploadedByAdminProfileId) return "Sillage Immo";
  if (document.uploadedByClientProfileId) return "Acquéreur";
  return "Inconnu";
};

const describeGroup = (group: PresentedPropertyDto) => {
  const parts: string[] = [];
  if (group.address) parts.push(group.address);
  if (group.city) parts.push(group.city);
  if (typeof group.rooms === "number") parts.push(`${group.rooms} pièces`);
  if (typeof group.livingAreaM2 === "number") parts.push(`${group.livingAreaM2} m²`);
  if (typeof group.priceAmount === "number") {
    parts.push(`${group.priceAmount.toLocaleString("fr-FR")} €`);
  }
  return parts.join(" · ");
};

function PresentedGroupDocuments({
  clientId,
  projectId,
  presentedId,
  canEdit,
}: {
  clientId: string;
  projectId: string;
  presentedId: string;
  canEdit: boolean;
}) {
  const paths = useMemo(
    () => presentedDocumentApiPaths({ scope: "admin", clientId, projectId, presentedId }),
    [clientId, projectId, presentedId]
  );
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
    <div className="mt-4 rounded-2xl border border-[rgba(20,20,70,0.10)] bg-white/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-navy">Documents du bien</h4>
        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              className="sillage-btn rounded px-3 py-1.5 text-xs"
            >
              Uploader un PDF
            </button>
            <button
              type="button"
              onClick={() => setShowLinkModal(true)}
              className="rounded border border-[rgba(20,20,70,0.16)] px-3 py-1.5 text-xs text-navy"
            >
              Ajouter un lien
            </button>
          </div>
        ) : null}
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
        loadingText="Chargement…"
        emptyText="Aucun document pour ce bien."
        headingTag="h4"
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
              {doc.visibility === "admin_only" ? "Interne admin" : "Visible acquéreur"}
            </span>
            {doc.kind === "link" ? (
              <span className="rounded-full bg-[rgba(20,20,70,0.06)] px-2 py-0.5 text-navy/80">
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
                className="rounded border border-[rgba(20,20,70,0.16)] px-3 py-1 text-sm text-navy"
              >
                Ouvrir
              </a>
            ) : (
              <button
                type="button"
                onClick={() => downloadDocument(doc.id)}
                className="rounded border border-[rgba(20,20,70,0.16)] px-3 py-1 text-sm text-navy"
              >
                Télécharger
              </button>
            )}
            {canEdit && !doc.uploadedByClientProfileId ? (
              <button
                type="button"
                onClick={() =>
                  handleToggleVisibility(
                    doc.id,
                    doc.visibility === "admin_only" ? "admin_and_client" : "admin_only"
                  )
                }
                className="rounded border border-[rgba(20,20,70,0.16)] px-3 py-1 text-sm text-navy"
              >
                {doc.visibility === "admin_only" ? "Partager à l’acquéreur" : "Passer en interne"}
              </button>
            ) : null}
            {canEdit ? (
              <button
                type="button"
                onClick={() => deleteDocument(doc.id)}
                className="rounded border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50"
              >
                Supprimer
              </button>
            ) : null}
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
    </div>
  );
}

type CreateGroupModalProps = {
  onClose: () => void;
  onSubmit: (data: {
    label: string;
    address?: string;
    city?: string;
    priceAmount?: number;
    rooms?: number;
    livingAreaM2?: number;
    externalUrl?: string;
  }) => Promise<void>;
  busy: boolean;
  error: string | null;
};

function CreateGroupModal({ onClose, onSubmit, busy, error }: CreateGroupModalProps) {
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [price, setPrice] = useState("");
  const [rooms, setRooms] = useState("");
  const [area, setArea] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!label.trim()) {
      setLocalError("Le libellé est requis.");
      return;
    }
    setLocalError(null);
    const toNumber = (v: string) => {
      const n = Number(v.replace(",", ".").trim());
      return Number.isFinite(n) && v.trim() !== "" ? n : undefined;
    };
    void onSubmit({
      label: label.trim(),
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      priceAmount: toNumber(price),
      rooms: toNumber(rooms),
      livingAreaM2: toNumber(area),
      externalUrl: externalUrl.trim() || undefined,
    });
  };

  const inputClass =
    "w-full rounded-xl border border-[rgba(20,20,70,0.16)] px-4 py-2 text-sm";

  return (
    <Modal
      onClose={onClose}
      title="Présenter un bien"
      size="sm"
      closeOnOverlayClick={false}
      onSubmit={handleSubmit}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded border border-[rgba(20,20,70,0.16)] px-4 py-2 text-sm text-navy disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={busy || !label.trim()}
            className="sillage-btn rounded px-4 py-2 text-sm disabled:opacity-50"
          >
            {busy ? "Création…" : "Créer"}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Libellé (ex. Appartement Haussmannien 4P)"
          aria-label="Libellé du bien"
          className={inputClass}
          maxLength={200}
          required
        />
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Adresse (facultatif)"
          aria-label="Adresse"
          className={inputClass}
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ville"
            aria-label="Ville"
            className={inputClass}
          />
          <input
            type="text"
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Prix (€)"
            aria-label="Prix"
            className={inputClass}
          />
          <input
            type="text"
            inputMode="numeric"
            value={rooms}
            onChange={(e) => setRooms(e.target.value)}
            placeholder="Pièces"
            aria-label="Nombre de pièces"
            className={inputClass}
          />
          <input
            type="text"
            inputMode="decimal"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="Surface (m²)"
            aria-label="Surface"
            className={inputClass}
          />
        </div>
        <input
          type="url"
          value={externalUrl}
          onChange={(e) => setExternalUrl(e.target.value)}
          placeholder="Lien externe (annonce, facultatif)"
          aria-label="Lien externe"
          className={inputClass}
        />
        {(localError ?? error) ? (
          <p className="text-sm text-red-600">{localError ?? error}</p>
        ) : null}
      </div>
    </Modal>
  );
}

export function PresentedPropertiesAdmin({
  clientId,
  projectId,
  canEdit,
}: PresentedPropertiesAdminProps) {
  const listPath = `/api/admin/clients/${clientId}/projects/${projectId}/presented-properties`;
  const [groups, setGroups] = useState<PresentedPropertyDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(listPath);
      const parsed = await parseApiResponse<{
        presentedProperties?: PresentedPropertyDto[];
      }>(res);
      if (!parsed.ok || !parsed.data || !Array.isArray(parsed.data.presentedProperties)) {
        throw new Error(parsed.message ?? "Chargement impossible.");
      }
      setGroups(parsed.data.presentedProperties);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, [listPath]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleCreate = async (data: {
    label: string;
    address?: string;
    city?: string;
    priceAmount?: number;
    rooms?: number;
    livingAreaM2?: number;
    externalUrl?: string;
  }) => {
    setCreateBusy(true);
    setCreateError(null);
    try {
      const res = await fetch(listPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const parsed = await parseApiResponse(res);
      if (!parsed.ok) throw new Error(parsed.message ?? "Création impossible.");
      setShowCreate(false);
      await refresh();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Création impossible.");
    } finally {
      setCreateBusy(false);
    }
  };

  const handleDeleteGroup = async (presentedId: string) => {
    if (typeof window !== "undefined" && !window.confirm("Retirer ce bien et ses documents ?")) {
      return;
    }
    try {
      const res = await fetch(`${listPath}/${presentedId}`, { method: "DELETE" });
      const parsed = await parseApiResponse(res);
      if (!parsed.ok) throw new Error(parsed.message ?? "Suppression impossible.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible.");
    }
  };

  return (
    <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-navy">Biens présentés</h2>
          <p className="text-sm text-navy/70">
            Regroupez les documents par bien présenté à l’acquéreur (dans la base Sillage ou non).
          </p>
        </div>
        {canEdit ? (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="sillage-btn rounded px-4 py-2 text-sm"
          >
            Présenter un bien
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-5 space-y-4">
        {loading ? (
          <p className="text-sm text-navy/70">Chargement…</p>
        ) : groups.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[rgba(20,20,70,0.16)] p-4 text-sm text-navy/60">
            Aucun bien présenté pour le moment.
          </p>
        ) : (
          groups.map((group) => (
            <article
              key={group.id}
              className="rounded-2xl border border-[rgba(20,20,70,0.12)] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="font-semibold text-navy">{group.label}</h3>
                  {describeGroup(group) ? (
                    <p className="text-xs text-navy/70">{describeGroup(group)}</p>
                  ) : null}
                  {group.externalUrl ? (
                    <a
                      href={group.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs underline text-navy"
                    >
                      Voir l’annonce
                    </a>
                  ) : null}
                  {group.propertyId ? (
                    <p className="text-xs text-navy/60">
                      Bien Sillage lié :{" "}
                      <a
                        href={`/admin/properties/${group.propertyId}`}
                        className="underline"
                      >
                        fiche
                      </a>
                    </p>
                  ) : null}
                </div>
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteGroup(group.id)}
                    className="rounded border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50"
                  >
                    Retirer
                  </button>
                ) : null}
              </div>

              <PresentedGroupDocuments
                clientId={clientId}
                projectId={projectId}
                presentedId={group.id}
                canEdit={canEdit}
              />
            </article>
          ))
        )}
      </div>

      {showCreate ? (
        <CreateGroupModal
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
          busy={createBusy}
          error={createError}
        />
      ) : null}
    </section>
  );
}
