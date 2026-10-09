import "server-only";
import { Buffer } from "node:buffer";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env/server";
import { getFileDownloadUrl } from "@/lib/mynotary/client";
import type { MyNotaryFile } from "@/lib/mynotary/types";
import type { MyNotaryFileKind } from "@/types/db/supabase";

/**
 * Archivage des fichiers signés MyNotary.
 *
 * Règles (validées le 09/10/2026) :
 *  - on ne persiste que l'identifiant permanent du fichier (`signedFileId`),
 *    jamais une URL signée ; le lien de téléchargement est régénéré à la
 *    demande par `GET /files/{fileId}` ;
 *  - chaque fichier a une ligne dans `mynotary_files` avec son échéance
 *    d'archivage (`signed_at` + 9 ans 6 mois, rétention MyNotary = 10 ans) ;
 *  - une copie est faite dès réception dans le bucket privé
 *    `mynotary-archives` (coût négligeable, sécurité en cas de résiliation) ;
 *    si elle échoue, la ligne reste sans `archived_at` et la tâche mensuelle
 *    (`archiveDueMyNotaryFiles`) la reprend à l'échéance.
 *
 * Tout est best-effort : un échec est consigné sur la ligne du fichier et ne
 * bloque jamais la projection du document.
 *
 * Taille max par fichier : 20 Mo (politique du bucket, migration 038).
 */

const MAX_BYTES = 20 * 1024 * 1024;
const TIMEOUT_MS = 30_000;

export type ArchiveResult = {
  signedDocumentPath: string | null;
  signatureProofPath: string | null;
  archived: number;
  skipped: number;
  errors: Array<{ name: string; reason: string }>;
};

const sanitizePathSegment = (input: string): string =>
  input
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120) || "document";

export const looksLikeProofFile = (name: string): boolean => {
  const lower = name.toLowerCase();
  return (
    lower.includes("preuve") ||
    lower.includes("proof") ||
    lower.includes("certificat") ||
    lower.includes("certificate") ||
    lower.includes("audit") ||
    lower.includes("eidas")
  );
};

/**
 * Télécharge un fichier par son identifiant : lien frais via l'API, puis
 * GET direct sur le stockage MyNotary (le lien signé n'a pas besoin de la
 * clé d'API).
 */
export const downloadMyNotaryFile = async (
  fileId: string
): Promise<{ bytes: Buffer; contentType: string }> => {
  const url = await getFileDownloadUrl(fileId);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: ctrl.signal, redirect: "follow" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_BYTES) {
      throw new Error(`file too large (${contentLength} bytes > ${MAX_BYTES})`);
    }
    const arrayBuf = await response.arrayBuffer();
    if (arrayBuf.byteLength > MAX_BYTES) {
      throw new Error(`file too large (${arrayBuf.byteLength} bytes > ${MAX_BYTES})`);
    }
    return {
      bytes: Buffer.from(arrayBuf),
      contentType: response.headers.get("content-type") ?? "application/pdf",
    };
  } finally {
    clearTimeout(timer);
  }
};

const buildObjectPath = (contractId: string, kind: MyNotaryFileKind, name: string, index: number) => {
  const safeName = sanitizePathSegment(
    name ? `${name}.pdf`.replace(/\.pdf\.pdf$/i, ".pdf") : `document_${index + 1}.pdf`
  );
  const prefix = kind === "proof" ? "proof_" : kind === "validated" ? "validated_" : "signed_";
  return [contractId, `${prefix}${safeName}`].join("/");
};

/** Copie un fichier dans le bucket et met à jour sa ligne `mynotary_files`. */
export const copyMyNotaryFileToBucket = async (input: {
  fileId: string;
  objectPath: string;
}): Promise<void> => {
  const bucket = serverEnv.MYNOTARY_ARCHIVE_BUCKET;
  const now = new Date().toISOString();
  try {
    const { bytes, contentType } = await downloadMyNotaryFile(input.fileId);
    const upload = await supabaseAdmin.storage
      .from(bucket)
      .upload(input.objectPath, bytes, { contentType, cacheControl: "31536000", upsert: true });
    if (upload.error) {
      throw new Error(upload.error.message);
    }
    await supabaseAdmin
      .from("mynotary_files")
      .update({
        archived_at: now,
        storage_bucket: bucket,
        storage_path: input.objectPath,
        last_error: null,
        last_attempt_at: now,
      })
      .eq("file_id", input.fileId);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    const { data: current } = await supabaseAdmin
      .from("mynotary_files")
      .select("archive_attempts")
      .eq("file_id", input.fileId)
      .maybeSingle();
    await supabaseAdmin
      .from("mynotary_files")
      .update({
        archive_attempts: (current?.archive_attempts ?? 0) + 1,
        last_error: reason.slice(0, 1000),
        last_attempt_at: now,
      })
      .eq("file_id", input.fileId);
    throw err;
  }
};

export type ArchiveSignedDocumentInput = {
  documentId: string;
  mynotaryContractId: string;
  mynotaryOperationId?: string | null;
  signedAt: string;
  files: MyNotaryFile[];
};

export const archiveSignedDocument = async (
  input: ArchiveSignedDocumentInput
): Promise<ArchiveResult> => {
  const result: ArchiveResult = {
    signedDocumentPath: null,
    signatureProofPath: null,
    archived: 0,
    skipped: 0,
    errors: [],
  };
  if (!Array.isArray(input.files) || input.files.length === 0) {
    return result;
  }

  for (let i = 0; i < input.files.length; i += 1) {
    const file = input.files[i];
    if (!file?.signedFileId) {
      result.skipped += 1;
      continue;
    }
    const isProof = looksLikeProofFile(file.name ?? "");
    const kind: MyNotaryFileKind = isProof ? "proof" : "signed";
    const objectPath = buildObjectPath(input.mynotaryContractId, kind, file.name ?? "", i);

    // 1. Registre du fichier (idempotent sur file_id) — même si la copie échoue.
    const { error: upsertError } = await supabaseAdmin.from("mynotary_files").upsert(
      {
        file_id: file.signedFileId,
        signed_document_id: input.documentId,
        mynotary_contract_id: input.mynotaryContractId,
        mynotary_operation_id: input.mynotaryOperationId ?? null,
        name: file.name ?? null,
        kind,
        signed_at: input.signedAt,
      },
      { onConflict: "file_id", ignoreDuplicates: false }
    );
    if (upsertError) {
      result.errors.push({ name: file.name ?? `file_${i + 1}`, reason: upsertError.message });
    }

    // 2. Copie immédiate de chaque fichier (contrat, annexes, preuve). Le
    //    document ne référence qu'un « signé » et une « preuve » (premier
    //    de chaque) ; les autres restent accessibles via `mynotary_files`.
    try {
      await copyMyNotaryFileToBucket({ fileId: file.signedFileId, objectPath });
      if (isProof && !result.signatureProofPath) result.signatureProofPath = objectPath;
      else if (!isProof && !result.signedDocumentPath) result.signedDocumentPath = objectPath;
      result.archived += 1;
    } catch (err) {
      result.errors.push({
        name: file.name ?? `file_${i + 1}`,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return result;
};

/**
 * Tâche mensuelle : copie les fichiers dont l'échéance d'archivage est
 * atteinte (ou dépassée) et qui n'ont pas encore de copie locale. Un échec
 * reste en attente (ligne sans archived_at, last_error renseigné) et sera
 * repris le mois suivant ; il remonte dans la vue « Aujourd'hui ».
 */
export const archiveDueMyNotaryFiles = async (
  input: { limit?: number; horizonDays?: number } = {}
) => {
  const limit = Math.max(1, Math.min(input.limit ?? 50, 200));
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + (input.horizonDays ?? 0));

  const { data: due, error } = await supabaseAdmin
    .from("mynotary_files")
    .select("file_id, mynotary_contract_id, name, kind")
    .is("archived_at", null)
    .lte("archive_due_at", horizon.toISOString())
    .order("archive_due_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(`mynotary_files due query failed: ${error.message}`);

  const summary = { due: due?.length ?? 0, archived: 0, failed: 0, errors: [] as string[] };
  for (const [index, file] of (due ?? []).entries()) {
    const objectPath = buildObjectPath(
      file.mynotary_contract_id ?? "sans-contrat",
      file.kind,
      file.name ?? "",
      index
    );
    try {
      await copyMyNotaryFileToBucket({ fileId: file.file_id, objectPath });
      summary.archived += 1;
    } catch (err) {
      summary.failed += 1;
      summary.errors.push(`${file.file_id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return summary;
};

/** Fichiers en attente (échéance atteinte sans copie) — vue « Aujourd'hui ». */
export const listOverdueMyNotaryFiles = async () => {
  const { data } = await supabaseAdmin
    .from("mynotary_files")
    .select("file_id, name, mynotary_contract_id, archive_due_at, last_error, archive_attempts")
    .is("archived_at", null)
    .lte("archive_due_at", new Date().toISOString())
    .order("archive_due_at", { ascending: true });
  return data ?? [];
};

// Mints a short-lived signed URL the admin UI can hand to a browser
// for download. Validity defaults to 5 min.
export const createArchiveDownloadUrl = async (
  path: string,
  expiresInSeconds = 300
): Promise<string | null> => {
  if (!path) return null;
  const { data, error } = await supabaseAdmin.storage
    .from(serverEnv.MYNOTARY_ARCHIVE_BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
};
