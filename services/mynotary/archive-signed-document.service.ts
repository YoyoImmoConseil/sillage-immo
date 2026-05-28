import "server-only";
import { Buffer } from "node:buffer";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env/server";
import type { MyNotaryFile } from "@/lib/mynotary/types";

// Downloads the signed PDF(s) delivered in the
// `signature_completed` webhook (`files[].url`) and pushes them into
// our private Supabase Storage bucket so we keep a copy even if the
// MyNotary signed URL expires.
//
// The function is best-effort: any failure is logged in the document
// row (`raw_payload.archive_errors`) but does not break the webhook
// pipeline, so an outage on MyNotary's CDN cannot block the rest of
// the ingestion.
//
// Per-file size cap: 20 MB (bucket policy, cf. migration 038). Files
// larger than that are skipped and reported.

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

const looksLikeProofFile = (name: string): boolean => {
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

// MyNotary's signed-document URLs are **not** time-limited (confirmed
// by their dev team, Q3 2026) but they DO require our application
// `x-api-key` header to authorize the download — without it the CDN
// returns 401/403. We therefore re-use the same key as the rest of
// the MyNotary client (`MYNOTARY_API_KEY`).
const downloadFile = async (
  url: string
): Promise<{ bytes: Buffer; contentType: string }> => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const apiKey = process.env.MYNOTARY_API_KEY ?? "";
  try {
    const headers: Record<string, string> = {};
    if (apiKey) headers["x-api-key"] = apiKey;
    const response = await fetch(url, { signal: ctrl.signal, headers });
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
      contentType:
        response.headers.get("content-type") ?? "application/pdf",
    };
  } finally {
    clearTimeout(timer);
  }
};

export type ArchiveSignedDocumentInput = {
  documentId: string;
  mynotaryContractId: string;
  files: MyNotaryFile[];
};

export const archiveSignedDocument = async (
  input: ArchiveSignedDocumentInput
): Promise<ArchiveResult> => {
  const bucket = serverEnv.MYNOTARY_ARCHIVE_BUCKET;
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

  // Partition between "main signed document" and "signature proof":
  // we treat the first file as the main signed document by default,
  // and any file whose name looks like an audit/proof file goes to
  // `signature_proof_path`. Both columns stay nullable when MyNotary
  // does not deliver the corresponding artifact.
  for (let i = 0; i < input.files.length; i += 1) {
    const file = input.files[i];
    if (!file?.url || typeof file.url !== "string") {
      result.skipped += 1;
      continue;
    }
    const isProof = looksLikeProofFile(file.name ?? "");
    if (isProof && result.signatureProofPath) {
      result.skipped += 1;
      continue;
    }
    if (!isProof && result.signedDocumentPath) {
      result.skipped += 1;
      continue;
    }

    const safeName = sanitizePathSegment(
      file.name ? `${file.name}.pdf`.replace(/\.pdf\.pdf$/i, ".pdf") : `document_${i + 1}.pdf`
    );
    const objectPath = [
      input.mynotaryContractId,
      isProof ? `proof_${safeName}` : `signed_${safeName}`,
    ].join("/");

    try {
      const { bytes, contentType } = await downloadFile(file.url);
      const upload = await supabaseAdmin.storage
        .from(bucket)
        .upload(objectPath, bytes, {
          contentType,
          cacheControl: "31536000",
          upsert: true,
        });
      if (upload.error) {
        throw new Error(upload.error.message);
      }
      if (isProof) {
        result.signatureProofPath = objectPath;
      } else {
        result.signedDocumentPath = objectPath;
      }
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
