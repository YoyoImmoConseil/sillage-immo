import "server-only";

import { renderOwnerReactivationEmail } from "@/lib/email/reactivation-owner";
import { sendTransactionalEmail } from "@/lib/email/smtp";
import {
  DEFAULT_DAILY_LIMIT,
  DEFAULT_DAILY_LIMIT_AFTER_RAMP,
  DEFAULT_RAMP_THRESHOLD,
  DEFAULT_REACTIVATION_CAMPAIGN,
  cleanFirstName,
  dailyLimitFor,
  decideNextSend,
  nextSendAtAfter,
  pickSubjectVariant,
  resolveSender,
  type SenderKey,
  senderKeyForNegotiator,
  type OwnerSubjectVariant,
} from "@/lib/reactivation/model";
import { SITE_URL } from "@/lib/seo/site";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isContactProtected } from "@/lib/reactivation/protection";
import { assertProtectionFresh, loadProtectionIndex } from "./protected-contacts.service";
import { buildOwnerLinks, type ReactivationContactRow } from "./reactivation-followup.service";

/**
 * File d'envoi de la vague propriétaires : un passage par jour ouvré (cron),
 * au plus `limit` mails, les contacts `pending` d'abord (J0, les fiches les
 * plus anciennes en premier), puis les rappels dont l'échéance est passée.
 * L'objet du J0 est attribué en rotation A/B/C ; les rappels gardent la
 * variante du contact pour que les taux restent lisibles.
 */

export type SendSummary = {
  campaign: string;
  limit: number;
  considered: number;
  /** Contacts sautés parce que protégés (mandat / compromis signé < 12 mois). */
  protected: number;
  sent: number;
  sentByStep: Record<string, number>;
  sentByVariant: Record<string, number>;
  dormant: number;
  failed: number;
  errors: string[];
};

const OWNER_SEGMENTS = ["v1_proprietaire", "a2_ancien"] as const;

const envInt = (name: string, fallback: number) => {
  const raw = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
};

/** REACTIVATION_PAUSED=1 : le cron n'envoie rien (les envois manuels restent possibles). */
export const isReactivationPaused = () => /^(1|true|on|yes)$/i.test((process.env.REACTIVATION_PAUSED ?? "").trim());

/** Plafond de départ (REACTIVATION_DAILY_LIMIT, 50 par défaut). */
export const resolveDailyLimit = () => envInt("REACTIVATION_DAILY_LIMIT", DEFAULT_DAILY_LIMIT);

/**
 * Plafond du jour avec montée en cadence (décision du 06/11) : le plafond de
 * départ jusqu'à REACTIVATION_RAMP_THRESHOLD envois (500), puis
 * REACTIVATION_DAILY_LIMIT_AFTER_RAMP (150).
 */
export const resolveDailyLimitWithRamp = (totalSentSoFar: number) =>
  dailyLimitFor(totalSentSoFar, {
    base: resolveDailyLimit(),
    afterRamp: envInt("REACTIVATION_DAILY_LIMIT_AFTER_RAMP", DEFAULT_DAILY_LIMIT_AFTER_RAMP),
    threshold: envInt("REACTIVATION_RAMP_THRESHOLD", DEFAULT_RAMP_THRESHOLD),
  });

/** Total des mails déjà partis sur la campagne (toutes étapes), pour la montée en cadence. */
export const countSentSoFar = async (campaign: string): Promise<number> => {
  // Lecture par pages : PostgREST plafonne chaque réponse à 1 000 lignes.
  const PAGE = 1000;
  let total = 0;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabaseAdmin
      .from("reactivation_contacts")
      .select("sent_count")
      .eq("campaign", campaign)
      .gt("sent_count", 0)
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    total += (data ?? []).reduce((sum, row) => sum + (row.sent_count ?? 0), 0);
    if (!data || data.length < PAGE) break;
  }
  return total;
};

export const runReactivationSendBatch = async (input: {
  campaign?: string;
  limit?: number;
  now?: Date;
  /** Adresse de test : tout part vers elle, rien n'est écrit sur les contacts, et les liens sont des liens d'aperçu. */
  dryRunTo?: string | null;
  /** Test seulement : force l'expéditeur (yoann / jordan / laura) pour relire chaque version signée. */
  dryRunSender?: SenderKey | null;
  /**
   * Ordre des J0 : `oldest` (défaut, fiches SweepBright les plus anciennes
   * d'abord) ou `newest` (les plus récentes d'abord — premiers lots, pour
   * construire la réputation d'envoi sur des adresses vivantes).
   */
  order?: "oldest" | "newest";
}): Promise<SendSummary> => {
  const campaign = input.campaign ?? DEFAULT_REACTIVATION_CAMPAIGN;
  const limit = input.limit ?? resolveDailyLimitWithRamp(await countSentSoFar(campaign));
  const now = input.now ?? new Date();
  const summary: SendSummary = {
    campaign,
    limit,
    considered: 0,
    protected: 0,
    sent: 0,
    sentByStep: {},
    sentByVariant: {},
    dormant: 0,
    failed: 0,
    errors: [],
  };

  // Protection MyNotary (règle permanente) : index des personnes ayant signé un
  // mandat / compromis dans les 12 derniers mois. L'envoi refuse de partir si
  // cet index n'est pas à jour.
  const protection = await loadProtectionIndex(now);
  assertProtectionFresh(protection, now);

  // Rappels échus d'abord (ils ont une date), puis les J0 par ancienneté
  // SweepBright. On lit plus large que le plafond pour pouvoir sauter les
  // contacts protégés sans entamer le lot.
  const fetchSize = Math.min(limit * 3 + 20, 1000);
  const { data: dueRows, error: dueError } = await supabaseAdmin
    .from("reactivation_contacts")
    .select("*")
    .eq("campaign", campaign)
    .in("segment", [...OWNER_SEGMENTS])
    .eq("status", "sent")
    .lte("next_send_at", now.toISOString())
    .order("next_send_at", { ascending: true })
    .limit(fetchSize);
  if (dueError) throw new Error(dueError.message);

  const { data: pendingRows, error: pendingError } = await supabaseAdmin
    .from("reactivation_contacts")
    .select("*")
    .eq("campaign", campaign)
    .in("segment", [...OWNER_SEGMENTS])
    .eq("status", "pending")
    .order("sweepbright_created_at", { ascending: input.order !== "newest", nullsFirst: false })
    .limit(fetchSize);
  if (pendingError) throw new Error(pendingError.message);

  const candidates = [...(dueRows ?? []), ...(pendingRows ?? [])] as ReactivationContactRow[];
  const queue: ReactivationContactRow[] = [];
  for (const contact of candidates) {
    if (queue.length >= limit) break;
    if (isContactProtected(contact, protection)) {
      summary.protected += 1;
      continue;
    }
    queue.push(contact);
  }
  summary.considered = queue.length;

  const { count: j0SentSoFar } = await supabaseAdmin
    .from("reactivation_contacts")
    .select("id", { count: "exact", head: true })
    .eq("campaign", campaign)
    .gte("sequence_step", 1);
  let rotation = j0SentSoFar ?? 0;

  for (const contact of queue) {
    const decision = decideNextSend(contact, now);
    if (decision.kind === "skip") continue;
    if (decision.kind === "dormant") {
      if (!input.dryRunTo) {
        const { error } = await supabaseAdmin
          .from("reactivation_contacts")
          .update({ status: "dormant", next_send_at: null })
          .eq("id", contact.id);
        if (error) summary.errors.push(`${contact.id}: ${error.message}`);
      }
      summary.dormant += 1;
      continue;
    }

    const variant: OwnerSubjectVariant =
      decision.step === 1 ? pickSubjectVariant(rotation) : ((contact.subject_variant as OwnerSubjectVariant | null) ?? "A");
    if (decision.step === 1) rotation += 1;

    const sender = resolveSender(input.dryRunTo && input.dryRunSender ? input.dryRunSender : senderKeyForNegotiator(contact.negotiator));
    const links = buildOwnerLinks({ contactId: contact.id, campaign, preview: Boolean(input.dryRunTo) });
    const rendered = renderOwnerReactivationEmail({
      step: decision.step,
      variant,
      firstName: cleanFirstName(contact.first_name) ?? cleanFirstName(contact.full_name?.split(/\s+/)[0]),
      links,
      bookingUrl: sender.bookingUrl,
      quartiersUrl: `${SITE_URL}/quartiers`,
      sender,
    });

    try {
      const result = await sendTransactionalEmail({
        to: input.dryRunTo ?? contact.email,
        subject: input.dryRunTo ? `[TEST ${contact.email} · ${sender.displayName}] ${rendered.subject}` : rendered.subject,
        html: rendered.html,
        text: rendered.text,
        sender: { name: `${sender.displayName} – Sillage Immo`, email: sender.email },
        replyTo: sender.email,
      });
      if (!result.sent) {
        summary.failed += 1;
        summary.errors.push(`${contact.id}: ${"reason" in result ? result.reason : "not_sent"}`);
        continue;
      }
    } catch (error) {
      summary.failed += 1;
      summary.errors.push(`${contact.id}: ${error instanceof Error ? error.message : "send failed"}`);
      continue;
    }

    summary.sent += 1;
    summary.sentByStep[String(decision.step)] = (summary.sentByStep[String(decision.step)] ?? 0) + 1;
    summary.sentByVariant[variant] = (summary.sentByVariant[variant] ?? 0) + 1;
    if (input.dryRunTo) continue;

    const sentAtIso = now.toISOString();
    const { error: updateError } = await supabaseAdmin
      .from("reactivation_contacts")
      .update({
        status: "sent",
        subject_variant: variant,
        sequence_step: decision.step,
        sent_count: contact.sent_count + 1,
        first_sent_at: contact.first_sent_at ?? sentAtIso,
        last_sent_at: sentAtIso,
        next_send_at: nextSendAtAfter(decision.step, now).toISOString(),
      })
      .eq("id", contact.id);
    if (updateError) summary.errors.push(`${contact.id}: ${updateError.message}`);
  }

  return summary;
};

export type ReactivationStats = {
  campaign: string;
  total: number;
  byStatus: Record<string, number>;
  bySegment: Record<string, number>;
  /** Contacts « à envoyer » réellement pris par l'envoi (segments propriétaires et anciens prospects). */
  pendingSendable: number;
  /** Contacts « à envoyer » d'un segment que l'envoi ne prend pas (clients acte signé, acquéreurs). */
  pendingOtherSegments: number;
  byStep: Record<string, number>;
  byVariantSent: Record<string, number>;
  byVariantResponded: Record<string, number>;
  byResponse: Record<string, number>;
  recentResponses: Array<{
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    segment: string;
    response: string | null;
    respondedAt: string | null;
    sellerLeadId: string | null;
    negotiator: string | null;
  }>;
};

/** Chiffres de la page admin « Réactivation ». */
export const getReactivationStats = async (campaign = DEFAULT_REACTIVATION_CAMPAIGN): Promise<ReactivationStats> => {
  // PostgREST plafonne chaque réponse à 1 000 lignes quel que soit `limit` :
  // on lit par pages jusqu'à épuisement.
  const PAGE = 1000;
  type StatsRow = Pick<
    ReactivationContactRow,
    "id" | "full_name" | "email" | "phone" | "segment" | "status" | "sequence_step" | "subject_variant" | "response" | "responded_at" | "seller_lead_id" | "negotiator"
  >;
  const rows: StatsRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabaseAdmin
      .from("reactivation_contacts")
      .select("id, full_name, email, phone, segment, status, sequence_step, subject_variant, response, responded_at, seller_lead_id, negotiator")
      .eq("campaign", campaign)
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as StatsRow[]));
    if (!data || data.length < PAGE) break;
  }
  const count = (key: (row: (typeof rows)[number]) => string | null | undefined) => {
    const out: Record<string, number> = {};
    for (const row of rows) {
      const value = key(row);
      if (!value) continue;
      out[value] = (out[value] ?? 0) + 1;
    }
    return out;
  };
  const recentResponses = rows
    .filter((row) => row.responded_at)
    .sort((a, b) => (b.responded_at ?? "").localeCompare(a.responded_at ?? ""))
    .slice(0, 50)
    .map((row) => ({
      id: row.id,
      fullName: row.full_name?.trim() || row.email,
      email: row.email,
      phone: row.phone,
      segment: row.segment,
      response: row.response,
      respondedAt: row.responded_at,
      sellerLeadId: row.seller_lead_id,
      negotiator: row.negotiator,
    }));
  return {
    campaign,
    total: rows.length,
    byStatus: count((row) => row.status),
    bySegment: count((row) => row.segment),
    pendingSendable: rows.filter((row) => row.status === "pending" && (OWNER_SEGMENTS as readonly string[]).includes(row.segment)).length,
    pendingOtherSegments: rows.filter((row) => row.status === "pending" && !(OWNER_SEGMENTS as readonly string[]).includes(row.segment)).length,
    byStep: count((row) => String(row.sequence_step)),
    byVariantSent: count((row) => (row.sequence_step >= 1 ? row.subject_variant : null)),
    byVariantResponded: count((row) => (row.responded_at ? row.subject_variant : null)),
    byResponse: count((row) => row.response),
    recentResponses,
  };
};
