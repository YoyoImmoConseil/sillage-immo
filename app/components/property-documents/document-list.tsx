"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import type {
  PropertyDocumentApiPaths,
  PropertyDocumentDto,
  PropertyDocumentUploaderInfo,
} from "@/lib/property-documents/shared";

/**
 * État + actions communs aux panels documents (admin et espace client) :
 * chargement de la liste, suppression (avec confirmation) et téléchargement
 * via URL signée. Les textes d'erreur sont injectés par chaque panel.
 */
export function usePropertyDocuments({
  paths,
  confirmDelete,
  loadErrorText,
  deleteErrorText,
  downloadErrorText,
}: {
  paths: PropertyDocumentApiPaths;
  confirmDelete: string;
  loadErrorText: string;
  deleteErrorText: string;
  downloadErrorText: string;
}) {
  const [documents, setDocuments] = useState<PropertyDocumentDto[]>([]);
  const [uploaders, setUploaders] = useState<Record<string, PropertyDocumentUploaderInfo>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(paths.list);
      const parsed = await parseApiResponse<{
        ok?: boolean;
        documents?: PropertyDocumentDto[];
        uploaders?: Record<string, PropertyDocumentUploaderInfo>;
      }>(res);
      if (!parsed.ok || !parsed.data || !Array.isArray(parsed.data.documents)) {
        throw new Error(parsed.message ?? loadErrorText);
      }
      setDocuments(parsed.data.documents);
      setUploaders(parsed.data.uploaders ?? {});
    } catch (err) {
      setError(err instanceof Error ? err.message : loadErrorText);
    } finally {
      setLoading(false);
    }
  }, [paths.list, loadErrorText]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const deleteDocument = async (documentId: string) => {
    if (typeof window !== "undefined" && !window.confirm(confirmDelete)) return;
    try {
      const res = await fetch(paths.remove(documentId), { method: "DELETE" });
      const parsed = await parseApiResponse(res);
      if (!parsed.ok) throw new Error(parsed.message ?? deleteErrorText);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : deleteErrorText);
    }
  };

  const downloadDocument = async (documentId: string) => {
    try {
      const res = await fetch(paths.signedUrl(documentId));
      const parsed = await parseApiResponse<{ url?: string }>(res);
      const url = parsed.data?.url;
      if (!parsed.ok || !url) throw new Error(parsed.message ?? downloadErrorText);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : downloadErrorText);
    }
  };

  return {
    documents,
    uploaders,
    loading,
    error,
    setError,
    refresh,
    deleteDocument,
    downloadDocument,
  };
}

type PropertyDocumentListProps = {
  documents: PropertyDocumentDto[];
  uploaders: Record<string, PropertyDocumentUploaderInfo>;
  loading: boolean;
  loadingText: string;
  emptyText: string;
  /** "h3" côté admin, "h4" côté client (hiérarchie de titres existante). */
  headingTag?: "h3" | "h4";
  renderMeta: (
    doc: PropertyDocumentDto,
    uploader: PropertyDocumentUploaderInfo | undefined
  ) => ReactNode;
  renderBadges?: (doc: PropertyDocumentDto) => ReactNode;
  renderActions: (doc: PropertyDocumentDto) => ReactNode;
};

/** Liste des documents : états chargement / vide, puis cartes par document. */
export function PropertyDocumentList({
  documents,
  uploaders,
  loading,
  loadingText,
  emptyText,
  headingTag: Heading = "h3",
  renderMeta,
  renderBadges,
  renderActions,
}: PropertyDocumentListProps) {
  return (
    <div className="mt-5 space-y-3">
      {loading ? (
        <p className="text-sm text-[#141446]/70">{loadingText}</p>
      ) : documents.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[rgba(20,20,70,0.16)] p-4 text-sm text-[#141446]/60">
          {emptyText}
        </p>
      ) : (
        documents.map((doc) => (
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
                  {doc.kind === "link" ? "↗" : "PDF"}
                </span>
                <Heading className="font-medium text-[#141446]">{doc.label}</Heading>
              </div>
              <p className="text-xs text-[#141446]/70">{renderMeta(doc, uploaders[doc.id])}</p>
              {renderBadges?.(doc) ?? null}
            </div>
            <div className="flex flex-wrap items-center gap-2">{renderActions(doc)}</div>
          </article>
        ))
      )}
    </div>
  );
}
