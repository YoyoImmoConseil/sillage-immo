import "server-only";

import { extractText, getDocumentProxy } from "unpdf";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { callOpenAiChat } from "@/lib/ai/openai";
import { emitDomainEvent } from "@/lib/events/domain-events";

/**
 * AI auto-renaming of uploaded document PDFs.
 *
 * After a file document is stored, we extract its text, ask the LLM for a
 * short, professional French file name and persist it as the document label —
 * but ONLY when the uploader did not provide a custom label (autoLabel), so we
 * never overwrite a human-chosen title. When the PDF has too little extractable
 * text (e.g. a scanned image), we deliberately skip renaming to avoid an AI
 * hallucination surfacing to the buyer.
 *
 * Triggered from the upload services through `enqueueDocumentAiRename`, which
 * both schedules an immediate best-effort pass (`after()`) and persists a
 * domain event so the cron-backed outbox guarantees the work eventually runs.
 */

export type DocumentAiScope = "property_document" | "presented_document";

type DocTable = "property_documents" | "buyer_presented_property_documents";

const SCOPE_TABLE: Record<DocumentAiScope, DocTable> = {
  property_document: "property_documents",
  presented_document: "buyer_presented_property_documents",
};

const AI_MODEL = "gpt-4o-mini";
const MAX_TEXT_CHARS = 6000;
const MIN_TEXT_CHARS = 24;
const MAX_TITLE_LENGTH = 120;

type DocumentAiMetadata = {
  status?: "pending" | "processing" | "done" | "skipped" | "failed";
  autoLabel?: boolean;
  originalLabel?: string;
  model?: string;
  renamedAt?: string;
  skippedReason?: string;
};

type DocumentRow = {
  id: string;
  kind: "file" | "link";
  label: string;
  storage_bucket: string | null;
  storage_path: string | null;
  deleted_at: string | null;
  metadata: Record<string, unknown> | null;
};

const DOC_COLUMNS = "id, kind, label, storage_bucket, storage_path, deleted_at, metadata";

const readAiMetadata = (metadata: Record<string, unknown> | null): DocumentAiMetadata => {
  const ai = (metadata?.ai ?? {}) as DocumentAiMetadata;
  return ai && typeof ai === "object" ? ai : {};
};

const sanitizeTitle = (raw: string): string =>
  raw
    .replace(/[\r\n\t]+/g, " ")
    // Drop characters that make poor file names.
    .replace(/["*/:<>?\\|]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\.pdf$/i, "")
    .trim()
    .slice(0, MAX_TITLE_LENGTH)
    .trim();

const extractPdfText = async (bytes: Uint8Array): Promise<string> => {
  const pdf = await getDocumentProxy(bytes);
  const result = await extractText(pdf, { mergePages: true });
  const text = Array.isArray(result.text) ? result.text.join("\n") : result.text;
  return (text ?? "").replace(/\s+/g, " ").trim();
};

const proposeTitleFromText = async (text: string): Promise<string | null> => {
  const result = await callOpenAiChat({
    model: AI_MODEL,
    temperature: 0,
    responseFormat: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Tu nommes des documents immobiliers à partir d'un extrait de leur texte. " +
          "Propose un nom de fichier court (3 à 8 mots), clair et professionnel, en français, " +
          "sans extension de fichier, qui décrit fidèlement le document (ex. « Diagnostic de performance énergétique », " +
          "« Compromis de vente », « Plan du bien », « Justificatif de financement »). " +
          "N'invente jamais d'information : base-toi uniquement sur le texte fourni. " +
          'Réponds strictement en JSON valide : {"title": string}. ' +
          "Si le texte est insuffisant ou illisible pour identifier le document avec certitude, " +
          'renvoie {"title": null}.',
      },
      {
        role: "user",
        content: text.slice(0, MAX_TEXT_CHARS),
      },
    ],
    toolName: "documents.ai_rename",
    toolVersion: "1.0.0",
  });

  try {
    const parsed = JSON.parse(result.content) as { title?: unknown };
    if (typeof parsed.title !== "string") return null;
    const clean = sanitizeTitle(parsed.title);
    return clean.length >= 2 ? clean : null;
  } catch {
    return null;
  }
};

const setAiMetadata = async (
  table: DocTable,
  documentId: string,
  metadata: Record<string, unknown> | null,
  patch: DocumentAiMetadata,
  extra?: { label?: string }
) => {
  const nextMetadata = {
    ...(metadata ?? {}),
    ai: { ...readAiMetadata(metadata), ...patch },
  };
  const update: Record<string, unknown> = {
    metadata: nextMetadata,
    updated_at: new Date().toISOString(),
  };
  if (extra?.label) update.label = extra.label;
  await supabaseAdmin.from(table).update(update).eq("id", documentId);
};

/**
 * Idempotent analysis: claims the row (pending -> processing), extracts text,
 * asks the LLM for a clean title and renames the document. Safe to call from
 * both the immediate `after()` pass and the cron outbox.
 */
export const analyzeAndRenameDocument = async (input: {
  scope: DocumentAiScope;
  documentId: string;
}): Promise<void> => {
  const table = SCOPE_TABLE[input.scope];

  const { data, error } = await supabaseAdmin
    .from(table)
    .select(DOC_COLUMNS)
    .eq("id", input.documentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const row = data as DocumentRow | null;
  if (!row || row.deleted_at) return;
  if (row.kind !== "file" || !row.storage_bucket || !row.storage_path) return;

  const ai = readAiMetadata(row.metadata);
  if (ai.autoLabel !== true) return; // custom label: never overwrite
  if (ai.status === "done" || ai.status === "processing") return;

  // Atomic claim: only one worker transitions pending -> processing.
  const { data: claimed } = await supabaseAdmin
    .from(table)
    .update({
      metadata: { ...(row.metadata ?? {}), ai: { ...ai, status: "processing" } },
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.documentId)
    .filter("metadata->ai->>status", "eq", "pending")
    .select("id");
  if (!claimed || claimed.length === 0) return; // already claimed elsewhere

  try {
    const download = await supabaseAdmin.storage
      .from(row.storage_bucket)
      .download(row.storage_path);
    if (download.error || !download.data) {
      throw new Error(download.error?.message ?? "Téléchargement du document impossible.");
    }
    const bytes = new Uint8Array(await download.data.arrayBuffer());
    const text = await extractPdfText(bytes);

    if (text.length < MIN_TEXT_CHARS) {
      await setAiMetadata(table, input.documentId, row.metadata, {
        status: "skipped",
        skippedReason: "insufficient_text",
      });
      return;
    }

    const title = await proposeTitleFromText(text);
    if (!title) {
      await setAiMetadata(table, input.documentId, row.metadata, {
        status: "skipped",
        skippedReason: "no_confident_title",
      });
      return;
    }

    await setAiMetadata(
      table,
      input.documentId,
      row.metadata,
      {
        status: "done",
        originalLabel: row.label,
        model: AI_MODEL,
        renamedAt: new Date().toISOString(),
      },
      { label: title }
    );
  } catch (err) {
    // Reset to pending so the outbox can retry; status guard prevents loops
    // because attempts are capped by the domain_events processor.
    await setAiMetadata(table, input.documentId, row.metadata, {
      status: "pending",
      skippedReason: err instanceof Error ? err.message.slice(0, 200) : "error",
    });
    throw err;
  }
};

/**
 * Schedule the AI renaming work for a freshly inserted file document. The
 * caller must already have seeded `metadata.ai = { status: 'pending',
 * autoLabel: true }` at insert time (see `buildAiRenameSeed`).
 *
 * Best-effort and never throws: a failure here must not break the upload. We
 * persist a domain event (reliable, cron-retried) and also kick an immediate
 * `after()` pass so the rename usually appears within seconds.
 */
export const scheduleDocumentAiRename = async (input: {
  scope: DocumentAiScope;
  documentId: string;
}): Promise<void> => {
  try {
    await emitDomainEvent({
      aggregateType: "document",
      aggregateId: input.documentId,
      eventName: "document.uploaded",
      payload: { scope: input.scope, documentId: input.documentId },
    });
  } catch {
    // If the outbox insert fails we still try the immediate pass below.
  }

  try {
    const { after } = await import("next/server");
    after(async () => {
      try {
        await analyzeAndRenameDocument({ scope: input.scope, documentId: input.documentId });
      } catch {
        // Outbox will retry.
      }
    });
  } catch {
    // Not in a request scope (e.g. tests): the outbox handles it.
  }
};

/**
 * Metadata seed an upload service writes at insert time so the analysis claim
 * (status=pending) can match later. Returns null when there is nothing to do
 * (custom label provided): in that case the document keeps its label untouched.
 */
export const buildAiRenameSeed = (autoLabel: boolean): { ai: DocumentAiMetadata } | null =>
  autoLabel ? { ai: { status: "pending", autoLabel: true } } : null;
