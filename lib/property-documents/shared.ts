/**
 * Code partagé (client-safe, PAS de "server-only") entre les panels documents
 * admin et espace client : types, constantes, endpoints et pipeline d'upload PDF.
 */

import { parseApiResponse } from "@/lib/http/parse-api-response";

export type PropertyDocumentVisibility = "admin_only" | "admin_and_client";
export type PropertyDocumentKind = "file" | "link";

export type PropertyDocumentDto = {
  id: string;
  propertyId: string;
  kind: PropertyDocumentKind;
  visibility: PropertyDocumentVisibility;
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

export type PropertyDocumentUploaderInfo = {
  documentId: string;
  uploaderKind: "admin" | "client" | "unknown";
  fullName: string | null;
  email: string | null;
};

export const PROPERTY_DOCUMENT_MAX_BYTES = 25 * 1024 * 1024;
export const PROPERTY_DOCUMENT_PDF_MIME = "application/pdf";

export type PropertyDocumentApiPaths = {
  list: string;
  uploadUrl: string;
  create: string;
  signedUrl: (documentId: string) => string;
  remove: (documentId: string) => string;
  /** Uniquement côté admin (PATCH visibilité). */
  visibility?: (documentId: string) => string;
};

export function propertyDocumentApiPaths(
  scope: "admin" | "client",
  propertyId: string
): PropertyDocumentApiPaths {
  const base =
    scope === "admin"
      ? `/api/admin/properties/${propertyId}/documents`
      : `/api/espace-client/properties/${propertyId}/documents`;
  return {
    list: base,
    uploadUrl: `${base}/upload-url`,
    create: base,
    signedUrl: (documentId) => `${base}/${documentId}/signed-url`,
    remove: (documentId) => `${base}/${documentId}`,
    ...(scope === "admin"
      ? { visibility: (documentId: string) => `${base}/${documentId}/visibility` }
      : {}),
  };
}

export function formatFileSize(bytes: number | null) {
  if (typeof bytes !== "number" || Number.isNaN(bytes)) return null;
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export type UploadPropertyDocumentPdfMessages = {
  notPdf: string;
  tooLarge: string;
  prepareFailed: string;
  putFailed: (status: number) => string;
  createFailed: string;
};

export type UploadPropertyDocumentPdfResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Pipeline d'upload PDF en 3 étapes :
 * 1) POST upload-url → URL signée Supabase ;
 * 2) PUT direct vers Supabase Storage (contourne la limite Vercel de 4.5 Mo
 *    sur les serverless functions) ;
 * 3) POST create → ligne metadata.
 */
export async function uploadPropertyDocumentPdf({
  paths,
  file,
  label,
  visibility,
  messages,
}: {
  paths: PropertyDocumentApiPaths;
  file: File;
  label: string;
  visibility?: PropertyDocumentVisibility;
  messages: UploadPropertyDocumentPdfMessages;
}): Promise<UploadPropertyDocumentPdfResult> {
  if (file.type !== PROPERTY_DOCUMENT_PDF_MIME) {
    return { ok: false, error: messages.notPdf };
  }
  if (file.size > PROPERTY_DOCUMENT_MAX_BYTES) {
    return { ok: false, error: messages.tooLarge };
  }
  try {
    const urlRes = await fetch(paths.uploadUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        sizeBytes: file.size,
        mimeType: file.type || PROPERTY_DOCUMENT_PDF_MIME,
      }),
    });
    const urlParsed = await parseApiResponse<{
      uploadUrl?: string;
      storagePath?: string;
    }>(urlRes);
    const uploadUrl = urlParsed.data?.uploadUrl;
    const storagePath = urlParsed.data?.storagePath;
    if (!urlParsed.ok || !uploadUrl || !storagePath) {
      throw new Error(urlParsed.message ?? messages.prepareFailed);
    }

    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type || PROPERTY_DOCUMENT_PDF_MIME },
      body: file,
    });
    if (!putRes.ok) {
      throw new Error(messages.putFailed(putRes.status));
    }

    const createRes = await fetch(paths.create, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "file",
        storagePath,
        label: label.trim() || undefined,
        ...(visibility ? { visibility } : {}),
      }),
    });
    const createParsed = await parseApiResponse(createRes);
    if (!createParsed.ok) {
      throw new Error(createParsed.message ?? messages.createFailed);
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : messages.createFailed,
    };
  }
}
