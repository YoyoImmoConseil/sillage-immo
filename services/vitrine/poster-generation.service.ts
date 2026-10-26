import "server-only";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendVitrinePosterEmail } from "@/lib/email/vitrine-poster";
import type { VitrinePosterContent } from "@/lib/vitrine/poster-content";
import { isVitrinePosterModel, VITRINE_POSTER_MODEL_LABELS, type VitrinePosterModel } from "@/lib/vitrine/poster-status";
import type { Database } from "@/types/db/supabase";
import { buildVitrinePoster } from "./poster.service";

export const VITRINE_POSTERS_BUCKET = "vitrine-posters";
/** Lien de téléchargement du mail : 7 jours (décision validée). */
export const VITRINE_EMAIL_LINK_TTL_SECONDS = 7 * 24 * 60 * 60;
/** Liens affichés dans l'admin : régénérés à chaque chargement, 1 heure. */
export const VITRINE_ADMIN_LINK_TTL_SECONDS = 60 * 60;
/** Au-delà, le PDF n'est pas joint au mail (le lien reste). */
export const VITRINE_ATTACHMENT_MAX_BYTES = 15 * 1024 * 1024;

type PosterRow = Database["public"]["Tables"]["vitrine_posters"]["Row"];

export type VitrineGenerationRequester = {
  email: string;
  firstName: string | null;
};

export type VitrineGenerationResult =
  | {
      ok: false;
      errors: string[];
      warnings: string[];
    }
  | {
      ok: true;
      posterId: string;
      fileName: string;
      fileSize: number;
      downloadUrl: string;
      expiresAt: string;
      warnings: string[];
      email: { sent: true; to: string; attached: boolean } | { sent: false; to: string; reason: string };
    };

const createDownloadUrl = async (storagePath: string, ttlSeconds: number, fileName: string) => {
  const { data, error } = await supabaseAdmin.storage
    .from(VITRINE_POSTERS_BUCKET)
    .createSignedUrl(storagePath, ttlSeconds, { download: fileName });
  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Lien de téléchargement impossible à créer.");
  }
  return data.signedUrl;
};

/**
 * « Imprimer la fiche vitrine » : contrôles, rendu, dépôt dans le bucket,
 * trace en base, mail au collaborateur avec le PDF joint et un lien 7 jours.
 *
 * Un manque bloquant arrête tout avant le moindre téléchargement de photo :
 * la réponse liste ce qui manque. Un échec du mail n'annule pas la
 * génération : le PDF est archivé et le lien renvoyé, l'erreur est notée.
 */
export const generateVitrinePoster = async (input: {
  propertyId: string;
  requester: VitrineGenerationRequester;
  sendEmail?: boolean;
}): Promise<VitrineGenerationResult> => {
  const built = await buildVitrinePoster({ propertyId: input.propertyId, force: false });
  if (!built.pdf) {
    return { ok: false, errors: built.errors, warnings: built.warnings };
  }

  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const storagePath = `properties/${input.propertyId}/${stamp}-${randomUUID().slice(0, 8)}.pdf`;

  const upload = await supabaseAdmin.storage
    .from(VITRINE_POSTERS_BUCKET)
    .upload(storagePath, built.pdf, { contentType: "application/pdf", cacheControl: "3600", upsert: false });
  if (upload.error) {
    throw new Error(`Dépôt du PDF impossible : ${upload.error.message}`);
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("vitrine_posters")
    .insert({
      property_id: input.propertyId,
      storage_bucket: VITRINE_POSTERS_BUCKET,
      storage_path: storagePath,
      file_name: built.fileName,
      file_size: built.pdf.length,
      content: built.content as unknown as Record<string, unknown>,
      warnings: built.warnings,
      generated_by: input.requester.email,
      poster_model: built.content.model,
      availability_status: built.availabilityStatus,
    })
    .select("id")
    .single();
  if (insertError || !inserted) {
    throw new Error(insertError?.message ?? "Enregistrement de l'affiche impossible.");
  }
  const posterId = (inserted as { id: string }).id;

  const downloadUrl = await createDownloadUrl(storagePath, VITRINE_EMAIL_LINK_TTL_SECONDS, built.fileName);
  const expiresAt = new Date(now.getTime() + VITRINE_EMAIL_LINK_TTL_SECONDS * 1000);

  let email: Extract<VitrineGenerationResult, { ok: true }>["email"] = {
    sent: false,
    to: input.requester.email,
    reason: "not_requested",
  };
  if (input.sendEmail !== false) {
    const attached = built.pdf.length <= VITRINE_ATTACHMENT_MAX_BYTES;
    try {
      const result = await sendVitrinePosterEmail({
        to: input.requester.email,
        firstName: input.requester.firstName,
        propertyLabel: built.content.locationLine,
        priceLine: built.content.priceLine,
        downloadUrl,
        expiresAt,
        warnings: built.warnings,
        attachment: attached
          ? { filename: built.fileName, content: built.pdf, contentType: "application/pdf" }
          : null,
      });
      email = result.sent
        ? { sent: true, to: input.requester.email, attached }
        : { sent: false, to: input.requester.email, reason: result.reason };
    } catch (error) {
      email = {
        sent: false,
        to: input.requester.email,
        reason: error instanceof Error ? error.message : "email_failed",
      };
    }
    await supabaseAdmin
      .from("vitrine_posters")
      .update(email.sent ? { email_sent_to: email.to } : { email_error: email.reason })
      .eq("id", posterId);
  }

  return {
    ok: true,
    posterId,
    fileName: built.fileName,
    fileSize: built.pdf.length,
    downloadUrl,
    expiresAt: expiresAt.toISOString(),
    warnings: built.warnings,
    email,
  };
};

export type VitrinePosterHistoryItem = {
  id: string;
  createdAt: string;
  fileName: string;
  fileSize: number;
  generatedBy: string | null;
  emailSentTo: string | null;
  emailError: string | null;
  warnings: string[];
  priceLine: string | null;
  /** Modèle d'affiche (ruban) : null pour les affiches archivées avant le lot statuts. */
  model: VitrinePosterModel | null;
  modelLabel: string | null;
  downloadUrl: string | null;
};

/** Dernières affiches générées pour un bien, avec un lien valable 1 heure. */
export const listVitrinePosters = async (propertyId: string, limit = 5): Promise<VitrinePosterHistoryItem[]> => {
  const { data, error } = await supabaseAdmin
    .from("vitrine_posters")
    .select("*")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as PosterRow[];
  return Promise.all(
    rows.map(async (row) => {
      let downloadUrl: string | null = null;
      try {
        downloadUrl = await createDownloadUrl(row.storage_path, VITRINE_ADMIN_LINK_TTL_SECONDS, row.file_name);
      } catch {
        downloadUrl = null;
      }
      const content = row.content as Partial<VitrinePosterContent> | null;
      const model = isVitrinePosterModel(row.poster_model)
        ? row.poster_model
        : isVitrinePosterModel(content?.model)
          ? content.model
          : null;
      return {
        id: row.id,
        createdAt: row.created_at,
        fileName: row.file_name,
        fileSize: row.file_size,
        generatedBy: row.generated_by,
        emailSentTo: row.email_sent_to,
        emailError: row.email_error,
        warnings: Array.isArray(row.warnings) ? row.warnings : [],
        priceLine: typeof content?.priceLine === "string" ? content.priceLine : null,
        model,
        modelLabel: model ? VITRINE_POSTER_MODEL_LABELS[model] : null,
        downloadUrl,
      };
    })
  );
};
