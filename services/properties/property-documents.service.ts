import "server-only";

import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  notifyAssignedAdvisorOfClientUploadedDocument,
  notifyOwnersOfNewPropertyDocument,
} from "./property-document-notification.service";
import {
  buildAiRenameSeed,
  scheduleDocumentAiRename,
} from "@/services/documents/document-ai-rename.service";

export const PROPERTY_DOCUMENTS_BUCKET = "property-documents";
export const PROPERTY_DOCUMENT_PDF_MIME = "application/pdf";
export const PROPERTY_DOCUMENT_MAX_BYTES = 25 * 1024 * 1024; // 25 MB
export const PROPERTY_DOCUMENT_SIGNED_URL_TTL_SECONDS = 60;

export type PropertyDocumentVisibility = "admin_only" | "admin_and_client";
export type PropertyDocumentKind = "file" | "link";

export type PropertyDocument = {
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

type PropertyDocumentRow = {
  id: string;
  property_id: string;
  kind: PropertyDocumentKind;
  visibility: PropertyDocumentVisibility;
  label: string;
  external_url: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by_admin_profile_id: string | null;
  uploaded_by_client_profile_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

const mapDocumentRow = (row: PropertyDocumentRow): PropertyDocument => ({
  id: row.id,
  propertyId: row.property_id,
  kind: row.kind,
  visibility: row.visibility,
  label: row.label,
  externalUrl: row.external_url,
  storageBucket: row.storage_bucket,
  storagePath: row.storage_path,
  mimeType: row.mime_type,
  sizeBytes: row.size_bytes,
  uploadedByAdminProfileId: row.uploaded_by_admin_profile_id,
  uploadedByClientProfileId: row.uploaded_by_client_profile_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const sanitizePathSegment = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const validatePdfFile = (file: File) => {
  if (file.type !== PROPERTY_DOCUMENT_PDF_MIME) {
    throw new Error("Le fichier doit être au format PDF.");
  }
  if (file.size > PROPERTY_DOCUMENT_MAX_BYTES) {
    throw new Error("Le fichier dépasse la taille maximale de 25 Mo.");
  }
  if (file.size <= 0) {
    throw new Error("Fichier vide.");
  }
};

const buildStoragePath = (propertyId: string, fileName: string) => {
  const baseName = fileName.replace(/\.[^.]+$/, "");
  const safe = sanitizePathSegment(baseName) || "document";
  return `${propertyId}/${randomUUID()}-${safe}.pdf`;
};

/**
 * Confirm via Supabase Storage that an object physically exists at the given
 * path inside the private bucket, and return its real size / mime type as
 * reported by Storage. Used to validate a direct-upload performed by the
 * browser against a signed upload URL before inserting the metadata row.
 */
const confirmUploadedObject = async (
  bucket: string,
  storagePath: string
): Promise<{ sizeBytes: number | null; mimeType: string | null }> => {
  const lastSlash = storagePath.lastIndexOf("/");
  const folder = lastSlash >= 0 ? storagePath.slice(0, lastSlash) : "";
  const fileName = lastSlash >= 0 ? storagePath.slice(lastSlash + 1) : storagePath;

  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .list(folder, { search: fileName, limit: 1 });

  if (error) {
    throw new Error(error.message);
  }
  const entry = data?.find((item) => item.name === fileName);
  if (!entry) {
    throw new Error("Fichier introuvable dans le storage. L'upload n'a pas abouti.");
  }
  const size =
    entry.metadata && typeof (entry.metadata as { size?: number }).size === "number"
      ? (entry.metadata as { size: number }).size
      : null;
  const mime =
    entry.metadata && typeof (entry.metadata as { mimetype?: string }).mimetype === "string"
      ? (entry.metadata as { mimetype: string }).mimetype
      : null;
  return { sizeBytes: size, mimeType: mime };
};

const validateExternalUrl = (url: string) => {
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("L'URL doit utiliser http ou https.");
    }
    return parsed.toString();
  } catch {
    throw new Error("URL invalide.");
  }
};

const insertDocument = async (
  payload: {
    propertyId: string;
    kind: PropertyDocumentKind;
    visibility: PropertyDocumentVisibility;
    label: string;
    externalUrl?: string | null;
    storageBucket?: string | null;
    storagePath?: string | null;
    mimeType?: string | null;
    sizeBytes?: number | null;
    uploadedByAdminProfileId?: string | null;
    uploadedByClientProfileId?: string | null;
    /** True when no custom label was provided: eligible for AI auto-rename. */
    aiAutoLabel?: boolean;
  }
): Promise<PropertyDocument> => {
  const seed = payload.kind === "file" ? buildAiRenameSeed(payload.aiAutoLabel === true) : null;
  const { data, error } = await supabaseAdmin
    .from("property_documents")
    .insert({
      property_id: payload.propertyId,
      kind: payload.kind,
      visibility: payload.visibility,
      label: payload.label,
      external_url: payload.externalUrl ?? null,
      storage_bucket: payload.storageBucket ?? null,
      storage_path: payload.storagePath ?? null,
      mime_type: payload.mimeType ?? null,
      size_bytes: payload.sizeBytes ?? null,
      uploaded_by_admin_profile_id: payload.uploadedByAdminProfileId ?? null,
      uploaded_by_client_profile_id: payload.uploadedByClientProfileId ?? null,
      ...(seed ? { metadata: seed } : {}),
    })
    .select(
      "id, property_id, kind, visibility, label, external_url, storage_bucket, storage_path, mime_type, size_bytes, uploaded_by_admin_profile_id, uploaded_by_client_profile_id, created_at, updated_at, deleted_at"
    )
    .single();
  if (error || !data) {
    throw error ?? new Error("Impossible de créer le document.");
  }
  const document = mapDocumentRow(data as PropertyDocumentRow);
  if (seed) {
    await scheduleDocumentAiRename({ scope: "property_document", documentId: document.id });
  }
  return document;
};

const tryRemoveStorageObject = async (bucket: string, path: string) => {
  try {
    await supabaseAdmin.storage.from(bucket).remove([path]);
  } catch {
    // Best-effort cleanup; ignore failures.
  }
};

export const uploadAdminPropertyDocument = async (input: {
  propertyId: string;
  adminProfileId: string;
  file: File;
  visibility: PropertyDocumentVisibility;
  label?: string;
}): Promise<PropertyDocument> => {
  validatePdfFile(input.file);
  const storagePath = buildStoragePath(input.propertyId, input.file.name);
  const arrayBuffer = await input.file.arrayBuffer();

  const { error: uploadError } = await supabaseAdmin.storage
    .from(PROPERTY_DOCUMENTS_BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: PROPERTY_DOCUMENT_PDF_MIME,
      cacheControl: "private, max-age=0",
      upsert: false,
    });
  if (uploadError) {
    throw new Error(uploadError.message);
  }

  let document: PropertyDocument;
  try {
    document = await insertDocument({
      propertyId: input.propertyId,
      kind: "file",
      visibility: input.visibility,
      label: input.label?.trim() || input.file.name,
      storageBucket: PROPERTY_DOCUMENTS_BUCKET,
      storagePath,
      mimeType: PROPERTY_DOCUMENT_PDF_MIME,
      sizeBytes: input.file.size,
      uploadedByAdminProfileId: input.adminProfileId,
      aiAutoLabel: !input.label?.trim(),
    });
  } catch (error) {
    await tryRemoveStorageObject(PROPERTY_DOCUMENTS_BUCKET, storagePath);
    throw error;
  }
  await notifyOwnersOfNewPropertyDocument({
    propertyId: input.propertyId,
    document,
    adminProfileId: input.adminProfileId,
  });
  return document;
};

export const addAdminPropertyDocumentLink = async (input: {
  propertyId: string;
  adminProfileId: string;
  label: string;
  url: string;
  visibility: PropertyDocumentVisibility;
}): Promise<PropertyDocument> => {
  const trimmedLabel = input.label?.trim();
  if (!trimmedLabel) {
    throw new Error("Le libellé du lien est requis.");
  }
  const url = validateExternalUrl(input.url);
  const document = await insertDocument({
    propertyId: input.propertyId,
    kind: "link",
    visibility: input.visibility,
    label: trimmedLabel,
    externalUrl: url,
    uploadedByAdminProfileId: input.adminProfileId,
  });
  await notifyOwnersOfNewPropertyDocument({
    propertyId: input.propertyId,
    document,
    adminProfileId: input.adminProfileId,
  });
  return document;
};

export type SignedUploadUrlResponse = {
  uploadUrl: string;
  token: string;
  storagePath: string;
  storageBucket: string;
  maxBytes: number;
  mimeType: typeof PROPERTY_DOCUMENT_PDF_MIME;
};

/**
 * Issue a short-lived signed upload URL that the browser uses to PUT the PDF
 * directly to Supabase Storage. This bypasses Vercel's 4.5 MB serverless
 * function body limit so we can really honour the 25 MB cap announced by
 * the UI.
 *
 * The returned `storagePath` is server-generated (UUID + sanitized base
 * name) so a malicious caller cannot overwrite arbitrary objects.
 */
export const createSignedUploadUrlForPropertyDocument = async (input: {
  propertyId: string;
  fileName: string;
  sizeBytes: number;
  mimeType?: string | null;
}): Promise<SignedUploadUrlResponse> => {
  if (input.mimeType && input.mimeType !== PROPERTY_DOCUMENT_PDF_MIME) {
    throw new Error("Le fichier doit être au format PDF.");
  }
  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) {
    throw new Error("Taille de fichier invalide.");
  }
  if (input.sizeBytes > PROPERTY_DOCUMENT_MAX_BYTES) {
    throw new Error("Le fichier dépasse la taille maximale de 25 Mo.");
  }
  if (!input.fileName?.trim()) {
    throw new Error("Nom de fichier requis.");
  }

  const storagePath = buildStoragePath(input.propertyId, input.fileName);
  const { data, error } = await supabaseAdmin.storage
    .from(PROPERTY_DOCUMENTS_BUCKET)
    .createSignedUploadUrl(storagePath);

  if (error || !data?.signedUrl || !data?.token) {
    throw new Error(error?.message ?? "Impossible de générer l'URL d'upload.");
  }

  return {
    uploadUrl: data.signedUrl,
    token: data.token,
    storagePath: data.path ?? storagePath,
    storageBucket: PROPERTY_DOCUMENTS_BUCKET,
    maxBytes: PROPERTY_DOCUMENT_MAX_BYTES,
    mimeType: PROPERTY_DOCUMENT_PDF_MIME,
  };
};

/**
 * Confirm an admin direct-upload: verify the file landed in the private
 * bucket, then create the property_documents metadata row. The recorded
 * size is the one reported by Supabase (not the client) for trust.
 */
export const registerUploadedAdminPropertyDocument = async (input: {
  propertyId: string;
  adminProfileId: string;
  storagePath: string;
  label?: string;
  visibility: PropertyDocumentVisibility;
}): Promise<PropertyDocument> => {
  if (!input.storagePath?.startsWith(`${input.propertyId}/`)) {
    throw new Error("Chemin de stockage invalide.");
  }

  const { sizeBytes, mimeType } = await confirmUploadedObject(
    PROPERTY_DOCUMENTS_BUCKET,
    input.storagePath
  );
  if (typeof sizeBytes === "number" && sizeBytes > PROPERTY_DOCUMENT_MAX_BYTES) {
    await tryRemoveStorageObject(PROPERTY_DOCUMENTS_BUCKET, input.storagePath);
    throw new Error("Le fichier dépasse la taille maximale de 25 Mo.");
  }

  const fallbackName = input.storagePath.split("/").pop() ?? "document.pdf";
  let document: PropertyDocument;
  try {
    document = await insertDocument({
      propertyId: input.propertyId,
      kind: "file",
      visibility: input.visibility,
      label: input.label?.trim() || fallbackName,
      storageBucket: PROPERTY_DOCUMENTS_BUCKET,
      storagePath: input.storagePath,
      mimeType: mimeType ?? PROPERTY_DOCUMENT_PDF_MIME,
      sizeBytes,
      uploadedByAdminProfileId: input.adminProfileId,
      aiAutoLabel: !input.label?.trim(),
    });
  } catch (error) {
    await tryRemoveStorageObject(PROPERTY_DOCUMENTS_BUCKET, input.storagePath);
    throw error;
  }
  await notifyOwnersOfNewPropertyDocument({
    propertyId: input.propertyId,
    document,
    adminProfileId: input.adminProfileId,
  });
  return document;
};

/**
 * Confirm a client direct-upload (espace-client). Visibility is forced to
 * `admin_and_client` because clients cannot push admin-only documents.
 */
export const registerUploadedClientPropertyDocument = async (input: {
  propertyId: string;
  clientProfileId: string;
  storagePath: string;
  label?: string;
}): Promise<PropertyDocument> => {
  if (!input.storagePath?.startsWith(`${input.propertyId}/`)) {
    throw new Error("Chemin de stockage invalide.");
  }

  const { sizeBytes, mimeType } = await confirmUploadedObject(
    PROPERTY_DOCUMENTS_BUCKET,
    input.storagePath
  );
  if (typeof sizeBytes === "number" && sizeBytes > PROPERTY_DOCUMENT_MAX_BYTES) {
    await tryRemoveStorageObject(PROPERTY_DOCUMENTS_BUCKET, input.storagePath);
    throw new Error("Le fichier dépasse la taille maximale de 25 Mo.");
  }

  const fallbackName = input.storagePath.split("/").pop() ?? "document.pdf";
  let document: PropertyDocument;
  try {
    document = await insertDocument({
      propertyId: input.propertyId,
      kind: "file",
      visibility: "admin_and_client",
      label: input.label?.trim() || fallbackName,
      storageBucket: PROPERTY_DOCUMENTS_BUCKET,
      storagePath: input.storagePath,
      mimeType: mimeType ?? PROPERTY_DOCUMENT_PDF_MIME,
      sizeBytes,
      uploadedByClientProfileId: input.clientProfileId,
      aiAutoLabel: !input.label?.trim(),
    });
  } catch (error) {
    await tryRemoveStorageObject(PROPERTY_DOCUMENTS_BUCKET, input.storagePath);
    throw error;
  }
  await notifyAssignedAdvisorOfClientUploadedDocument({
    propertyId: input.propertyId,
    document,
  });
  return document;
};

export const uploadClientPropertyDocument = async (input: {
  propertyId: string;
  clientProfileId: string;
  file: File;
  label?: string;
}): Promise<PropertyDocument> => {
  validatePdfFile(input.file);
  const storagePath = buildStoragePath(input.propertyId, input.file.name);
  const arrayBuffer = await input.file.arrayBuffer();

  const { error: uploadError } = await supabaseAdmin.storage
    .from(PROPERTY_DOCUMENTS_BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: PROPERTY_DOCUMENT_PDF_MIME,
      cacheControl: "private, max-age=0",
      upsert: false,
    });
  if (uploadError) {
    throw new Error(uploadError.message);
  }

  let document: PropertyDocument;
  try {
    document = await insertDocument({
      propertyId: input.propertyId,
      kind: "file",
      visibility: "admin_and_client",
      label: input.label?.trim() || input.file.name,
      storageBucket: PROPERTY_DOCUMENTS_BUCKET,
      storagePath,
      mimeType: PROPERTY_DOCUMENT_PDF_MIME,
      sizeBytes: input.file.size,
      uploadedByClientProfileId: input.clientProfileId,
      aiAutoLabel: !input.label?.trim(),
    });
  } catch (error) {
    await tryRemoveStorageObject(PROPERTY_DOCUMENTS_BUCKET, storagePath);
    throw error;
  }
  await notifyAssignedAdvisorOfClientUploadedDocument({
    propertyId: input.propertyId,
    document,
  });
  return document;
};

export const listPropertyDocumentsForAdmin = async (
  propertyId: string
): Promise<PropertyDocument[]> => {
  const { data, error } = await supabaseAdmin
    .from("property_documents")
    .select(
      "id, property_id, kind, visibility, label, external_url, storage_bucket, storage_path, mime_type, size_bytes, uploaded_by_admin_profile_id, uploaded_by_client_profile_id, created_at, updated_at, deleted_at"
    )
    .eq("property_id", propertyId)
    .is("deleted_at", null);
  if (error) throw error;
  return (data ?? [])
    .map((row) => mapDocumentRow(row as PropertyDocumentRow))
    .sort((a, b) => a.label.localeCompare(b.label, "fr", { sensitivity: "base", numeric: true }));
};

export const listPropertyDocumentsForClient = async (
  propertyId: string,
  clientProfileId: string
): Promise<PropertyDocument[]> => {
  // Show: shared documents (visibility=admin_and_client) + the client's own
  // uploads (whatever their visibility, although clients can only push
  // admin_and_client per the DB constraint).
  const { data, error } = await supabaseAdmin
    .from("property_documents")
    .select(
      "id, property_id, kind, visibility, label, external_url, storage_bucket, storage_path, mime_type, size_bytes, uploaded_by_admin_profile_id, uploaded_by_client_profile_id, created_at, updated_at, deleted_at"
    )
    .eq("property_id", propertyId)
    .is("deleted_at", null)
    .or(
      `visibility.eq.admin_and_client,uploaded_by_client_profile_id.eq.${clientProfileId}`
    );
  if (error) throw error;
  return (data ?? [])
    .map((row) => mapDocumentRow(row as PropertyDocumentRow))
    .sort((a, b) => a.label.localeCompare(b.label, "fr", { sensitivity: "base", numeric: true }));
};

export type DocumentAccessor =
  | { kind: "admin"; adminProfileId: string }
  | { kind: "client"; clientProfileId: string };

const fetchDocumentForAccess = async (documentId: string): Promise<PropertyDocument | null> => {
  const { data, error } = await supabaseAdmin
    .from("property_documents")
    .select(
      "id, property_id, kind, visibility, label, external_url, storage_bucket, storage_path, mime_type, size_bytes, uploaded_by_admin_profile_id, uploaded_by_client_profile_id, created_at, updated_at, deleted_at"
    )
    .eq("id", documentId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  if ((data as PropertyDocumentRow).deleted_at) return null;
  return mapDocumentRow(data as PropertyDocumentRow);
};

export const getPropertyDocumentById = async (
  documentId: string
): Promise<PropertyDocument | null> => fetchDocumentForAccess(documentId);

export const getSignedDownloadUrlForDocument = async (
  documentId: string,
  accessor: DocumentAccessor
): Promise<{ url: string; document: PropertyDocument }> => {
  const document = await fetchDocumentForAccess(documentId);
  if (!document) throw new Error("Document introuvable.");

  if (accessor.kind === "client") {
    const clientCanRead =
      document.visibility === "admin_and_client" ||
      document.uploadedByClientProfileId === accessor.clientProfileId;
    if (!clientCanRead) {
      throw new Error("Document non disponible pour ce compte.");
    }
  }

  if (document.kind === "link") {
    if (!document.externalUrl) throw new Error("Lien externe manquant.");
    return { url: document.externalUrl, document };
  }

  if (!document.storageBucket || !document.storagePath) {
    throw new Error("Document sans fichier associé.");
  }

  const { data, error } = await supabaseAdmin.storage
    .from(document.storageBucket)
    .createSignedUrl(document.storagePath, PROPERTY_DOCUMENT_SIGNED_URL_TTL_SECONDS, {
      download: document.label?.endsWith(".pdf") ? document.label : `${document.label}.pdf`,
    });
  if (error || !data?.signedUrl) {
    throw error ?? new Error("Impossible de générer le lien de téléchargement.");
  }
  return { url: data.signedUrl, document };
};

export const softDeletePropertyDocument = async (
  documentId: string,
  accessor: DocumentAccessor
): Promise<void> => {
  const document = await fetchDocumentForAccess(documentId);
  if (!document) throw new Error("Document introuvable.");

  if (accessor.kind === "client") {
    if (document.uploadedByClientProfileId !== accessor.clientProfileId) {
      throw new Error("Vous ne pouvez supprimer que vos propres documents.");
    }
  }

  const { error } = await supabaseAdmin
    .from("property_documents")
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId);
  if (error) throw error;
};

export const setPropertyDocumentVisibility = async (
  documentId: string,
  visibility: PropertyDocumentVisibility,
  adminProfileId: string
): Promise<PropertyDocument> => {
  const document = await fetchDocumentForAccess(documentId);
  if (!document) throw new Error("Document introuvable.");

  if (document.uploadedByClientProfileId && visibility === "admin_only") {
    throw new Error(
      "Un document déposé par un client ne peut pas être passé en admin_only."
    );
  }

  const { data, error } = await supabaseAdmin
    .from("property_documents")
    .update({
      visibility,
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId)
    .select(
      "id, property_id, kind, visibility, label, external_url, storage_bucket, storage_path, mime_type, size_bytes, uploaded_by_admin_profile_id, uploaded_by_client_profile_id, created_at, updated_at, deleted_at"
    )
    .single();
  if (error || !data) {
    throw error ?? new Error("Mise à jour de la visibilité impossible.");
  }
  const updated = mapDocumentRow(data as PropertyDocumentRow);

  // Notify co-owners only when an admin reveals a previously admin-only
  // document to the client side. We deliberately do not re-notify when the
  // document was already visible (no transition) nor when it is being
  // hidden again.
  const becameClientVisible =
    document.visibility === "admin_only" && updated.visibility === "admin_and_client";
  if (becameClientVisible && updated.uploadedByAdminProfileId) {
    await notifyOwnersOfNewPropertyDocument({
      propertyId: updated.propertyId,
      document: updated,
      adminProfileId: adminProfileId ?? updated.uploadedByAdminProfileId,
    });
  }

  return updated;
};

export type PropertyDocumentUploaderInfo = {
  documentId: string;
  uploaderKind: "admin" | "client" | "unknown";
  fullName: string | null;
  email: string | null;
};

/**
 * Resolve human-readable uploader information for a list of documents.
 * Used by the admin and the client UI to display "Sillage Immo / firstname".
 */
export const resolveDocumentUploaders = async (
  documents: PropertyDocument[]
): Promise<Record<string, PropertyDocumentUploaderInfo>> => {
  if (documents.length === 0) return {};
  const adminIds = new Set<string>();
  const clientIds = new Set<string>();
  for (const doc of documents) {
    if (doc.uploadedByAdminProfileId) adminIds.add(doc.uploadedByAdminProfileId);
    if (doc.uploadedByClientProfileId) clientIds.add(doc.uploadedByClientProfileId);
  }

  const [adminProfiles, clientProfiles] = await Promise.all([
    adminIds.size > 0
      ? supabaseAdmin
          .from("admin_profiles")
          .select("id, first_name, last_name, full_name, email")
          .in("id", Array.from(adminIds))
      : Promise.resolve({ data: [] as Array<{ id: string; first_name: string | null; last_name: string | null; full_name: string | null; email: string }> }),
    clientIds.size > 0
      ? supabaseAdmin
          .from("client_profiles")
          .select("id, first_name, last_name, full_name, email")
          .in("id", Array.from(clientIds))
      : Promise.resolve({ data: [] as Array<{ id: string; first_name: string | null; last_name: string | null; full_name: string | null; email: string }> }),
  ]);

  const adminMap = new Map(
    (adminProfiles.data ?? []).map((a) => [
      a.id,
      {
        fullName:
          a.full_name ||
          [a.first_name, a.last_name].filter(Boolean).join(" ").trim() ||
          a.email,
        email: a.email,
      },
    ])
  );
  const clientMap = new Map(
    (clientProfiles.data ?? []).map((c) => [
      c.id,
      {
        fullName:
          c.full_name ||
          [c.first_name, c.last_name].filter(Boolean).join(" ").trim() ||
          c.email,
        email: c.email,
      },
    ])
  );

  const result: Record<string, PropertyDocumentUploaderInfo> = {};
  for (const doc of documents) {
    if (doc.uploadedByAdminProfileId) {
      const profile = adminMap.get(doc.uploadedByAdminProfileId);
      result[doc.id] = {
        documentId: doc.id,
        uploaderKind: "admin",
        fullName: profile?.fullName ?? null,
        email: profile?.email ?? null,
      };
      continue;
    }
    if (doc.uploadedByClientProfileId) {
      const profile = clientMap.get(doc.uploadedByClientProfileId);
      result[doc.id] = {
        documentId: doc.id,
        uploaderKind: "client",
        fullName: profile?.fullName ?? null,
        email: profile?.email ?? null,
      };
      continue;
    }
    result[doc.id] = {
      documentId: doc.id,
      uploaderKind: "unknown",
      fullName: null,
      email: null,
    };
  }
  return result;
};
