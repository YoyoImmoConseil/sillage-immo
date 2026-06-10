"use client";

import { useRef, useState, type FormEvent } from "react";
import { Modal } from "@/app/components/modal";
import {
  PROPERTY_DOCUMENT_MAX_BYTES,
  PROPERTY_DOCUMENT_PDF_MIME,
} from "@/lib/property-documents/shared";

export type UploadPdfModalCopy = {
  title: string;
  hint: string;
  help: string;
  labelPlaceholder: string;
  labelAriaLabel?: string;
  /** Libellé de la case à cocher visibilité (admin uniquement). */
  visibilityToggle?: string;
  cancel: string;
  submit: string;
  submitting: string;
  errorPdf: string;
  errorSize: string;
  pickPdf: string;
};

type UploadPdfModalProps = {
  copy: UploadPdfModalCopy;
  /** Affiche la case "interne admin" (admin uniquement). */
  showVisibilityToggle?: boolean;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (file: File, label: string, adminOnly?: boolean) => void | Promise<void>;
  submitClassName?: string;
};

/**
 * Modale d'upload PDF partagée (admin + espace client) : drag-drop ou clic,
 * validation PDF / 25 Mo à la sélection, libellé facultatif.
 */
export function UploadPdfModal({
  copy,
  showVisibilityToggle = false,
  busy,
  error,
  onClose,
  onSubmit,
  submitClassName = "sillage-btn rounded px-4 py-2 text-sm disabled:opacity-50",
}: UploadPdfModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const [adminOnly, setAdminOnly] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const onSelect = (selected: File | null) => {
    setLocalError(null);
    if (!selected) {
      setFile(null);
      return;
    }
    if (selected.type !== PROPERTY_DOCUMENT_PDF_MIME) {
      setLocalError(copy.errorPdf);
      setFile(null);
      return;
    }
    if (selected.size > PROPERTY_DOCUMENT_MAX_BYTES) {
      setLocalError(copy.errorSize);
      setFile(null);
      return;
    }
    setFile(selected);
    if (!label.trim()) setLabel(selected.name);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(e.dataTransfer.files?.[0] ?? null);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      setLocalError(copy.pickPdf);
      return;
    }
    setLocalError(null);
    void onSubmit(file, label, showVisibilityToggle ? adminOnly : undefined);
  };

  const displayedError = localError ?? error;

  return (
    <Modal
      onClose={onClose}
      title={copy.title}
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
            {copy.cancel}
          </button>
          <button type="submit" disabled={busy || !file} className={submitClassName}>
            {busy ? copy.submitting : copy.submit}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-[rgba(20,20,70,0.20)] p-6 text-center text-sm text-navy/70 hover:bg-[rgba(20,20,70,0.04)]"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => onSelect(e.target.files?.[0] ?? null)}
          />
          <span className="font-medium text-navy">
            {file ? file.name : copy.hint}
          </span>
          <span>{copy.help}</span>
        </label>

        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={copy.labelPlaceholder}
          aria-label={copy.labelAriaLabel}
          className="w-full rounded-xl border border-[rgba(20,20,70,0.16)] px-4 py-2 text-sm"
          maxLength={200}
        />

        {showVisibilityToggle ? (
          <label className="flex items-center gap-2 text-sm text-navy">
            <input
              type="checkbox"
              checked={adminOnly}
              onChange={(e) => setAdminOnly(e.target.checked)}
            />
            {copy.visibilityToggle}
          </label>
        ) : null}

        {displayedError ? <p className="text-sm text-red-600">{displayedError}</p> : null}
      </div>
    </Modal>
  );
}
