import "server-only";

import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const PRESENTED_DOCUMENTS_BUCKET = "property-documents";
export const PRESENTED_DOCUMENT_PDF_MIME = "application/pdf";
export const PRESENTED_DOCUMENT_MAX_BYTES = 25 * 1024 * 1024; // 25 MB
export const PRESENTED_DOCUMENT_SIGNED_URL_TTL_SECONDS = 60;

export type PresentedDocumentVisibility = "admin_only" | "admin_and_client";
export type PresentedDocumentKind = "file" | "link";

export type PresentedPropertyDocument = {
  id: string;
  presentedPropertyId: string;
  kind: PresentedDocumentKind;
  visibility: PresentedDocumentVisibility;
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

type PresentedDocumentRow = {
  id: string;
  presented_property_id: string;
  kind: PresentedDocumentKind;
  visibility: PresentedDocumentVisibility;
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

const DOC_COLUMNS =
  "id, presented_property_id, kind, visibility, label, external_url, storage_bucket, storage_path, mime_type, size_bytes, uploaded_by_admin_profile_id, uploaded_by_client_profile_id, created_at, updated_at, deleted_at";

const mapDocumentRow = (row: PresentedDocumentRow): PresentedPropertyDocument => ({
  id: row.id,
  presentedPropertyId: row.presented_property_id,
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

const storagePrefix = (presentedPropertyId: string) => `presented/${presentedPropertyId}`;

const buildStoragePath = (presentedPropertyId: string, fileName: string) => {
  const baseName = fileName.replace(/\.[^.]+$/, "");
  const safe = sanitizePathSegment(baseName) || "document";
  return `${storagePrefix(presentedPropertyId)}/${randomUUID()}-${safe}.pdf`;
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

const validatePdfFile = (file: File) => {
  if (file.type !== PRESENTED_DOCUMENT_PDF_MIME) {
    throw new Error("Le fichier doit être au format PDF.");
  }
  if (file.size > PRESENTED_DOCUMENT_MAX_BYTES) {
    throw new Error("Le fichier dépasse la taille maximale de 25 Mo.");
  }
  if (file.size <= 0) {
    throw new Error("Fichier vide.");
  }
};

const insertDocument = async (payload: {
  presentedPropertyId: string;
  kind: PresentedDocumentKind;
  visibility: PresentedDocumentVisibility;
  label: string;
  externalUrl?: string | null;
  storageBucket?: string | null;
  storagePath?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  uploadedByAdminProfileId?: string | null;
  uploadedByClientProfileId?: string | null;
}): Promise<PresentedPropertyDocument> => {
  const { data, error } = await supabaseAdmin
    .from("buyer_presented_property_documents")
    .insert({
      presented_property_id: payload.presentedPropertyId,
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
    })
    .select(DOC_COLUMNS)
    .single();
  if (error || !data) {
    throw error ?? new Error("Impossible de créer le document.");
  }
  return mapDocumentRow(data as PresentedDocumentRow);
};

const tryRemoveStorageObject = async (bucket: string, path: string) => {
  try {
    await supabaseAdmin.storage.from(bucket).remove([path]);
  } catch {
    // Best-effort cleanup; ignore failures.
  }
};

export const addAdminPresentedDocumentLink = async (input: {
  presentedPropertyId: string;
  adminProfileId: string;
  label: string;
  url: string;
  visibility: PresentedDocumentVisibility;
}): Promise<PresentedPropertyDocument> => {
  const trimmedLabel = input.label?.trim();
  if (!trimmedLabel) {
    throw new Error("Le libellé du lien est requis.");
  }
  const url = validateExternalUrl(input.url);
  return insertDocument({
    presentedPropertyId: input.presentedPropertyId,
    kind: "link",
    visibility: input.visibility,
    label: trimmedLabel,
    externalUrl: url,
    uploadedByAdminProfileId: input.adminProfileId,
  });
};

export type SignedUploadUrlResponse = {
  uploadUrl: string;
  token: string;
  storagePath: string;
  storageBucket: string;
  maxBytes: number;
  mimeType: typeof PRESENTED_DOCUMENT_PDF_MIME;
};

export const createSignedUploadUrlForPresentedDocument = async (input: {
  presentedPropertyId: string;
  fileName: string;
  sizeBytes: number;
  mimeType?: string | null;
}): Promise<SignedUploadUrlResponse> => {
  if (input.mimeType && input.mimeType !== PRESENTED_DOCUMENT_PDF_MIME) {
    throw new Error("Le fichier doit être au format PDF.");
  }
  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) {
    throw new Error("Taille de fichier invalide.");
  }
  if (input.sizeBytes > PRESENTED_DOCUMENT_MAX_BYTES) {
    throw new Error("Le fichier dépasse la taille maximale de 25 Mo.");
  }
  if (!input.fileName?.trim()) {
    throw new Error("Nom de fichier requis.");
  }

  const storagePath = buildStoragePath(input.presentedPropertyId, input.fileName);
  const { data, error } = await supabaseAdmin.storage
    .from(PRESENTED_DOCUMENTS_BUCKET)
    .createSignedUploadUrl(storagePath);

  if (error || !data?.signedUrl || !data?.token) {
    throw new Error(error?.message ?? "Impossible de générer l'URL d'upload.");
  }

  return {
    uploadUrl: data.signedUrl,
    token: data.token,
    storagePath: data.path ?? storagePath,
    storageBucket: PRESENTED_DOCUMENTS_BUCKET,
    maxBytes: PRESENTED_DOCUMENT_MAX_BYTES,
    mimeType: PRESENTED_DOCUMENT_PDF_MIME,
  };
};

export const registerUploadedAdminPresentedDocument = async (input: {
  presentedPropertyId: string;
  adminProfileId: string;
  storagePath: string;
  label?: string;
  visibility: PresentedDocumentVisibility;
}): Promise<PresentedPropertyDocument> => {
  if (!input.storagePath?.startsWith(`${storagePrefix(input.presentedPropertyId)}/`)) {
    throw new Error("Chemin de stockage invalide.");
  }

  const { sizeBytes, mimeType } = await confirmUploadedObject(
    PRESENTED_DOCUMENTS_BUCKET,
    input.storagePath
  );
  if (typeof sizeBytes === "number" && sizeBytes > PRESENTED_DOCUMENT_MAX_BYTES) {
    await tryRemoveStorageObject(PRESENTED_DOCUMENTS_BUCKET, input.storagePath);
    throw new Error("Le fichier dépasse la taille maximale de 25 Mo.");
  }

  const fallbackName = input.storagePath.split("/").pop() ?? "document.pdf";
  try {
    return await insertDocument({
      presentedPropertyId: input.presentedPropertyId,
      kind: "file",
      visibility: input.visibility,
      label: input.label?.trim() || fallbackName,
      storageBucket: PRESENTED_DOCUMENTS_BUCKET,
      storagePath: input.storagePath,
      mimeType: mimeType ?? PRESENTED_DOCUMENT_PDF_MIME,
      sizeBytes,
      uploadedByAdminProfileId: input.adminProfileId,
    });
  } catch (error) {
    await tryRemoveStorageObject(PRESENTED_DOCUMENTS_BUCKET, input.storagePath);
    throw error;
  }
};

export const registerUploadedClientPresentedDocument = async (input: {
  presentedPropertyId: string;
  clientProfileId: string;
  storagePath: string;
  label?: string;
}): Promise<PresentedPropertyDocument> => {
  if (!input.storagePath?.startsWith(`${storagePrefix(input.presentedPropertyId)}/`)) {
    throw new Error("Chemin de stockage invalide.");
  }

  const { sizeBytes, mimeType } = await confirmUploadedObject(
    PRESENTED_DOCUMENTS_BUCKET,
    input.storagePath
  );
  if (typeof sizeBytes === "number" && sizeBytes > PRESENTED_DOCUMENT_MAX_BYTES) {
    await tryRemoveStorageObject(PRESENTED_DOCUMENTS_BUCKET, input.storagePath);
    throw new Error("Le fichier dépasse la taille maximale de 25 Mo.");
  }

  const fallbackName = input.storagePath.split("/").pop() ?? "document.pdf";
  try {
    return await insertDocument({
      presentedPropertyId: input.presentedPropertyId,
      kind: "file",
      visibility: "admin_and_client",
      label: input.label?.trim() || fallbackName,
      storageBucket: PRESENTED_DOCUMENTS_BUCKET,
      storagePath: input.storagePath,
      mimeType: mimeType ?? PRESENTED_DOCUMENT_PDF_MIME,
      sizeBytes,
      uploadedByClientProfileId: input.clientProfileId,
    });
  } catch (error) {
    await tryRemoveStorageObject(PRESENTED_DOCUMENTS_BUCKET, input.storagePath);
    throw error;
  }
};

export const uploadAdminPresentedDocument = async (input: {
  presentedPropertyId: string;
  adminProfileId: string;
  file: File;
  visibility: PresentedDocumentVisibility;
  label?: string;
}): Promise<PresentedPropertyDocument> => {
  validatePdfFile(input.file);
  const storagePath = buildStoragePath(input.presentedPropertyId, input.file.name);
  const arrayBuffer = await input.file.arrayBuffer();

  const { error: uploadError } = await supabaseAdmin.storage
    .from(PRESENTED_DOCUMENTS_BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: PRESENTED_DOCUMENT_PDF_MIME,
      cacheControl: "private, max-age=0",
      upsert: false,
    });
  if (uploadError) {
    throw new Error(uploadError.message);
  }

  try {
    return await insertDocument({
      presentedPropertyId: input.presentedPropertyId,
      kind: "file",
      visibility: input.visibility,
      label: input.label?.trim() || input.file.name,
      storageBucket: PRESENTED_DOCUMENTS_BUCKET,
      storagePath,
      mimeType: PRESENTED_DOCUMENT_PDF_MIME,
      sizeBytes: input.file.size,
      uploadedByAdminProfileId: input.adminProfileId,
    });
  } catch (error) {
    await tryRemoveStorageObject(PRESENTED_DOCUMENTS_BUCKET, storagePath);
    throw error;
  }
};

export const uploadClientPresentedDocument = async (input: {
  presentedPropertyId: string;
  clientProfileId: string;
  file: File;
  label?: string;
}): Promise<PresentedPropertyDocument> => {
  validatePdfFile(input.file);
  const storagePath = buildStoragePath(input.presentedPropertyId, input.file.name);
  const arrayBuffer = await input.file.arrayBuffer();

  const { error: uploadError } = await supabaseAdmin.storage
    .from(PRESENTED_DOCUMENTS_BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: PRESENTED_DOCUMENT_PDF_MIME,
      cacheControl: "private, max-age=0",
      upsert: false,
    });
  if (uploadError) {
    throw new Error(uploadError.message);
  }

  try {
    return await insertDocument({
      presentedPropertyId: input.presentedPropertyId,
      kind: "file",
      visibility: "admin_and_client",
      label: input.label?.trim() || input.file.name,
      storageBucket: PRESENTED_DOCUMENTS_BUCKET,
      storagePath,
      mimeType: PRESENTED_DOCUMENT_PDF_MIME,
      sizeBytes: input.file.size,
      uploadedByClientProfileId: input.clientProfileId,
    });
  } catch (error) {
    await tryRemoveStorageObject(PRESENTED_DOCUMENTS_BUCKET, storagePath);
    throw error;
  }
};

export const listPresentedDocumentsForAdmin = async (
  presentedPropertyId: string
): Promise<PresentedPropertyDocument[]> => {
  const { data, error } = await supabaseAdmin
    .from("buyer_presented_property_documents")
    .select(DOC_COLUMNS)
    .eq("presented_property_id", presentedPropertyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapDocumentRow(row as PresentedDocumentRow));
};

export const listPresentedDocumentsForClient = async (
  presentedPropertyId: string,
  clientProfileId: string
): Promise<PresentedPropertyDocument[]> => {
  const { data, error } = await supabaseAdmin
    .from("buyer_presented_property_documents")
    .select(DOC_COLUMNS)
    .eq("presented_property_id", presentedPropertyId)
    .is("deleted_at", null)
    .or(
      `visibility.eq.admin_and_client,uploaded_by_client_profile_id.eq.${clientProfileId}`
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapDocumentRow(row as PresentedDocumentRow));
};

export type DocumentAccessor =
  | { kind: "admin"; adminProfileId: string }
  | { kind: "client"; clientProfileId: string };

const fetchDocumentForAccess = async (
  documentId: string
): Promise<PresentedPropertyDocument | null> => {
  const { data, error } = await supabaseAdmin
    .from("buyer_presented_property_documents")
    .select(DOC_COLUMNS)
    .eq("id", documentId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  if ((data as PresentedDocumentRow).deleted_at) return null;
  return mapDocumentRow(data as PresentedDocumentRow);
};

export const getPresentedDocumentById = async (
  documentId: string
): Promise<PresentedPropertyDocument | null> => fetchDocumentForAccess(documentId);

export const getSignedDownloadUrlForPresentedDocument = async (
  documentId: string,
  accessor: DocumentAccessor
): Promise<{ url: string; document: PresentedPropertyDocument }> => {
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
    .createSignedUrl(document.storagePath, PRESENTED_DOCUMENT_SIGNED_URL_TTL_SECONDS, {
      download: document.label?.endsWith(".pdf") ? document.label : `${document.label}.pdf`,
    });
  if (error || !data?.signedUrl) {
    throw error ?? new Error("Impossible de générer le lien de téléchargement.");
  }
  return { url: data.signedUrl, document };
};

export const softDeletePresentedDocument = async (
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
    .from("buyer_presented_property_documents")
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId);
  if (error) throw error;
};

export const setPresentedDocumentVisibility = async (
  documentId: string,
  visibility: PresentedDocumentVisibility
): Promise<PresentedPropertyDocument> => {
  const document = await fetchDocumentForAccess(documentId);
  if (!document) throw new Error("Document introuvable.");

  if (document.uploadedByClientProfileId && visibility === "admin_only") {
    throw new Error(
      "Un document déposé par un acquéreur ne peut pas être passé en admin_only."
    );
  }

  const { data, error } = await supabaseAdmin
    .from("buyer_presented_property_documents")
    .update({
      visibility,
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId)
    .select(DOC_COLUMNS)
    .single();
  if (error || !data) {
    throw error ?? new Error("Mise à jour de la visibilité impossible.");
  }
  return mapDocumentRow(data as PresentedDocumentRow);
};

export type PresentedDocumentUploaderInfo = {
  documentId: string;
  uploaderKind: "admin" | "client" | "unknown";
  fullName: string | null;
  email: string | null;
};

export const resolvePresentedDocumentUploaders = async (
  documents: PresentedPropertyDocument[]
): Promise<Record<string, PresentedDocumentUploaderInfo>> => {
  if (documents.length === 0) return {};
  const adminIds = new Set<string>();
  const clientIds = new Set<string>();
  for (const doc of documents) {
    if (doc.uploadedByAdminProfileId) adminIds.add(doc.uploadedByAdminProfileId);
    if (doc.uploadedByClientProfileId) clientIds.add(doc.uploadedByClientProfileId);
  }

  const emptyProfiles = {
    data: [] as Array<{
      id: string;
      first_name: string | null;
      last_name: string | null;
      full_name: string | null;
      email: string;
    }>,
  };

  const [adminProfiles, clientProfiles] = await Promise.all([
    adminIds.size > 0
      ? supabaseAdmin
          .from("admin_profiles")
          .select("id, first_name, last_name, full_name, email")
          .in("id", Array.from(adminIds))
      : Promise.resolve(emptyProfiles),
    clientIds.size > 0
      ? supabaseAdmin
          .from("client_profiles")
          .select("id, first_name, last_name, full_name, email")
          .in("id", Array.from(clientIds))
      : Promise.resolve(emptyProfiles),
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

  const result: Record<string, PresentedDocumentUploaderInfo> = {};
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
