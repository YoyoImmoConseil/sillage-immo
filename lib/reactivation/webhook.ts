import { OWNER_RESPONSE_LABELS, type OwnerResponse } from "@/lib/reactivation/model";

/**
 * Webhook sortant de la réactivation (REACTIVATION_WEBHOOK_URL, sinon
 * BUYER_FOLLOWUP_WEBHOOK_URL) : chaque réponse d'un propriétaire est
 * répercutée à Zapier (Zap « reactivation-sweepbright-labels » : labels
 * SweepBright + Slack #proprietaires-chauds). Jamais bloquant : 5 s au plus,
 * erreurs loguées, rien n'est relancé.
 *
 * Partie pure (testable sans Supabase) : construction du corps et envoi.
 */

export const REACTIVATION_WEBHOOK_TIMEOUT_MS = 5000;

/** Champs de la fiche repris dans le corps du webhook (tous présents sur reactivation_contacts). */
export type ReactivationWebhookContact = {
  id: string;
  campaign: string;
  segment: string;
  sweepbright_contact_id: string;
  email: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  negotiator: string | null;
};

export type ReactivationWebhookInput = {
  event: string;
  contact: ReactivationWebhookContact;
  response: OwnerResponse;
  newStatus: string;
  sellerLeadId: string | null;
  at: string;
};

/** Corps envoyé au webhook. L'ordre des clés est stable (le Zap les lit par nom). */
export const buildReactivationWebhookPayload = (input: ReactivationWebhookInput) => ({
  event: input.event,
  campaign: input.contact.campaign,
  segment: input.contact.segment,
  response: input.response,
  response_label: OWNER_RESPONSE_LABELS[input.response],
  contact_id: input.contact.id,
  sweepbright_contact_id: input.contact.sweepbright_contact_id,
  email: input.contact.email,
  full_name: input.contact.full_name,
  first_name: input.contact.first_name,
  last_name: input.contact.last_name,
  negotiator: input.contact.negotiator,
  phone: input.contact.phone,
  status: input.newStatus,
  seller_lead_id: input.sellerLeadId,
  answered_at: input.at,
});

export type ReactivationWebhookPayload = ReturnType<typeof buildReactivationWebhookPayload>;

export const resolveReactivationWebhookUrl = (): string | null =>
  (process.env.REACTIVATION_WEBHOOK_URL ?? process.env.BUYER_FOLLOWUP_WEBHOOK_URL)?.trim() || null;

/** Envoie la réponse au webhook configuré ; sans URL, ne fait rien. Ne lève jamais. */
export const pushReactivationWebhook = async (input: ReactivationWebhookInput): Promise<void> => {
  const url = resolveReactivationWebhookUrl();
  if (!url) return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REACTIVATION_WEBHOOK_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(buildReactivationWebhookPayload(input)),
      signal: controller.signal,
    });
    if (!response.ok) console.error(`[reactivation] webhook → ${response.status}`);
  } catch (error) {
    console.error("[reactivation] webhook failed:", error instanceof Error ? error.message : error);
  } finally {
    clearTimeout(timer);
  }
};
