import "server-only";

import {
  DEFAULT_EXCLUDED_EMAIL_FRAGMENTS,
  DEFAULT_EXCLUDED_NAME_PATTERNS,
  DEFAULT_REACTIVATION_CAMPAIGN,
  isReactivationCampaign,
  isReactivationSegment,
  normalizeEmailForReactivation,
  type ReactivationSegment,
} from "@/lib/reactivation/model";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Database } from "@/types/db/supabase";

/**
 * Import des contacts SweepBright dans la file de réactivation.
 *
 * SweepBright n'expose pas la liste des contacts par son API publique : les
 * fiches sont lues depuis l'application (API interne `search-contacts`) et
 * poussées ici par lots via POST /api/admin/reactivation/import. Chaque fiche
 * arrive déjà typée (type vendor/lead, labels, préférences) ; le segment est
 * décidé ici, ainsi que les exclusions (affaire en cours, location seule,
 * e-mail invalide, noms à ne jamais contacter).
 */

export type ImportedContactInput = {
  sweepbright_contact_id: string;
  type: "vendor" | "lead" | string;
  created_at?: string | null;
  labels?: string[];
  negotiator?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  /** Préférences SweepBright résumées côté client : négociations présentes (`sale`, `let`). */
  negotiations?: string[];
  /** Segment imposé (sinon décidé ici). */
  segment?: string | null;
};

type Insert = Database["public"]["Tables"]["reactivation_contacts"]["Insert"];

const ONGOING_LABELS = ["SOUS MANDAT", "SOUS COMPROMIS"];
const CLIENT_LABEL = "SIGNE/ACTE";

const hasLabel = (labels: string[], prefix: string) => labels.some((label) => label.toUpperCase().startsWith(prefix));

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Noms à ne jamais contacter : la liste fixée le 06/11 (DEFAULT_EXCLUDED_NAME_PATTERNS)
 * plus REACTIVATION_EXCLUDED_NAMES (séparés par des virgules). Comparés au
 * « prénom nom » et à l'e-mail, sans tenir compte de la casse.
 */
export const excludedNamePatterns = (): RegExp[] =>
  [...DEFAULT_EXCLUDED_NAME_PATTERNS, ...(process.env.REACTIVATION_EXCLUDED_NAMES ?? "").split(",")]
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => new RegExp(escapeRegExp(value).replace(/\s+/g, "\\s+"), "i"));

/** Fragments d'adresse exclus : @orpi.com, adresses anonymisées « dummy », plus REACTIVATION_EXCLUDED_EMAILS. */
export const excludedEmailFragments = (): string[] =>
  [...DEFAULT_EXCLUDED_EMAIL_FRAGMENTS, ...(process.env.REACTIVATION_EXCLUDED_EMAILS ?? "").split(",")]
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

export type SegmentDecision =
  | { segment: ReactivationSegment; exclude: null }
  | { segment: ReactivationSegment; exclude: string };

/** Segment et exclusion d'une fiche. Pure, testable. */
export const decideSegment = (
  contact: ImportedContactInput,
  options: { excludedNames?: RegExp[]; excludedEmailFragments?: string[] } = {}
): SegmentDecision => {
  const labels = contact.labels ?? [];
  const negotiations = (contact.negotiations ?? []).map((value) => value.toLowerCase());
  const forced = isReactivationSegment(contact.segment) ? contact.segment : null;
  const isVendor = contact.type === "vendor";
  const segment: ReactivationSegment =
    forced ??
    (isVendor
      ? hasLabel(labels, CLIENT_LABEL)
        ? "v3_client"
        : "v1_proprietaire"
      : negotiations.includes("sale")
        ? "a1_acquereur"
        : "a2_ancien");

  const fullName = `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.replace(/\s+/g, " ").trim();
  const email = (contact.email ?? "").toLowerCase();
  const fragments = options.excludedEmailFragments ?? [];
  if (fragments.some((fragment) => email.includes(fragment))) {
    return { segment, exclude: email.includes("dummy") ? "adresse_anonymisee" : "adresse_pro" };
  }
  const excludedNames = options.excludedNames ?? [];
  if (excludedNames.some((pattern) => pattern.test(fullName) || pattern.test(email))) {
    return { segment, exclude: "nom_exclu" };
  }
  if (!contact.email || !normalizeEmailForReactivation(contact.email)) return { segment, exclude: "email_invalide" };
  if (ONGOING_LABELS.some((prefix) => hasLabel(labels, prefix))) return { segment, exclude: "affaire_en_cours" };
  if (!isVendor && negotiations.length > 0 && negotiations.every((value) => value === "let")) {
    return { segment, exclude: "location_seule" };
  }
  return { segment, exclude: null };
};

export type ImportSummary = {
  received: number;
  upserted: number;
  excluded: number;
  skippedDuplicateEmail: number;
  bySegment: Record<string, number>;
  byExclusion: Record<string, number>;
};

export const importReactivationContacts = async (input: {
  campaign?: string | null;
  contacts: ImportedContactInput[];
}): Promise<ImportSummary> => {
  const campaign = (input.campaign ?? DEFAULT_REACTIVATION_CAMPAIGN).trim().toLowerCase();
  if (!isReactivationCampaign(campaign)) throw new Error("La campagne doit commencer par « reac- ».");
  const patterns = excludedNamePatterns();
  const fragments = excludedEmailFragments();
  const summary: ImportSummary = {
    received: input.contacts.length,
    upserted: 0,
    excluded: 0,
    skippedDuplicateEmail: 0,
    bySegment: {},
    byExclusion: {},
  };
  const seenEmails = new Set<string>();
  const rows: Insert[] = [];

  // Les propriétaires passent avant les prospects : en cas de doublon d'e-mail
  // entre une fiche vendor et une fiche lead, c'est la fiche propriétaire qui
  // porte le contact.
  const ordered = [...input.contacts].sort((a, b) => (a.type === "vendor" ? 0 : 1) - (b.type === "vendor" ? 0 : 1));

  for (const contact of ordered) {
    if (!contact.sweepbright_contact_id) continue;
    const decision = decideSegment(contact, { excludedNames: patterns, excludedEmailFragments: fragments });
    const normalizedEmail = contact.email ? normalizeEmailForReactivation(contact.email) : null;
    const emailKey = normalizedEmail ?? `invalid:${contact.sweepbright_contact_id}`;
    if (seenEmails.has(emailKey)) {
      summary.skippedDuplicateEmail += 1;
      continue;
    }
    seenEmails.add(emailKey);
    summary.bySegment[decision.segment] = (summary.bySegment[decision.segment] ?? 0) + 1;
    if (decision.exclude) {
      summary.excluded += 1;
      summary.byExclusion[decision.exclude] = (summary.byExclusion[decision.exclude] ?? 0) + 1;
    }
    const fullName = `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.replace(/\s+/g, " ").trim();
    rows.push({
      campaign,
      segment: decision.segment,
      sweepbright_contact_id: contact.sweepbright_contact_id,
      sweepbright_type: contact.type ?? null,
      sweepbright_created_at: contact.created_at ?? null,
      sweepbright_labels: contact.labels ?? [],
      negotiator: contact.negotiator ?? null,
      first_name: contact.first_name ?? null,
      last_name: contact.last_name ?? null,
      full_name: fullName || null,
      email: (contact.email ?? "").trim(),
      normalized_email: emailKey,
      phone: contact.phone ?? null,
      status: decision.exclude ? "excluded" : "pending",
      exclude_reason: decision.exclude,
    });
  }

  // Un contact déjà importé garde son statut, sa séquence et ses réponses :
  // seuls les champs descriptifs sont rafraîchis. Les nouveaux sont insérés,
  // un e-mail déjà présent dans la campagne (autre fiche SweepBright) est ignoré.
  const ids = rows.map((row) => row.sweepbright_contact_id);
  const existing = new Set<string>();
  for (let index = 0; index < ids.length; index += 500) {
    const { data, error } = await supabaseAdmin
      .from("reactivation_contacts")
      .select("sweepbright_contact_id")
      .eq("campaign", campaign)
      .in("sweepbright_contact_id", ids.slice(index, index + 500));
    if (error) throw new Error(error.message);
    (data ?? []).forEach((row) => existing.add(row.sweepbright_contact_id));
  }
  const toInsert = rows.filter((row) => !existing.has(row.sweepbright_contact_id));
  const toRefresh = rows.filter((row) => existing.has(row.sweepbright_contact_id));

  for (let index = 0; index < toInsert.length; index += 200) {
    const chunk = toInsert.slice(index, index + 200);
    const { error } = await supabaseAdmin
      .from("reactivation_contacts")
      .upsert(chunk, { onConflict: "campaign,normalized_email", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
    summary.upserted += chunk.length;
  }
  for (const row of toRefresh) {
    const { error } = await supabaseAdmin
      .from("reactivation_contacts")
      .update({
        sweepbright_labels: row.sweepbright_labels,
        negotiator: row.negotiator,
        first_name: row.first_name,
        last_name: row.last_name,
        full_name: row.full_name,
        phone: row.phone,
      })
      .eq("campaign", campaign)
      .eq("sweepbright_contact_id", row.sweepbright_contact_id);
    if (error) throw new Error(error.message);
    summary.upserted += 1;
  }
  return summary;
};
