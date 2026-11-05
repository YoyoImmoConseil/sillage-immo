import "server-only";

import { SILLAGE_CONTACT_EMAIL } from "@/lib/brand/company";
import { buildFollowupToken, type FollowupTokenPayload } from "@/lib/buyers/followup-token";
import { sendTransactionalEmail } from "@/lib/email/smtp";
import { escapeHtml, renderEmailLayout } from "@/lib/email/layout";
import {
  OWNER_HOT_RESPONSES,
  OWNER_RESPONSE_LABELS,
  cleanFirstName,
  resolveOwnerResponseStatus,
  type OwnerResponse,
} from "@/lib/reactivation/model";
import { SITE_URL } from "@/lib/seo/site";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getFollowupSecret } from "@/services/buyers/buyer-followup.service";
import { sendSweepBrightOwnerLead } from "@/services/properties/sweepbright-leads.service";
import { createSellerLead } from "@/services/sellers/seller-lead.service";
import type { Database } from "@/types/db/supabase";

/**
 * Réactivation SweepBright — réponses des propriétaires reçues par les liens
 * /suivi/<jeton>?r=… (campagne `reac-*`, voir lib/reactivation/model.ts).
 *
 * Un clic : fiche mise à jour (statut, réponse, historique, séquence
 * arrêtée), journal activity_events, et pour « je vends » / « sa valeur » :
 * promotion en lead vendeur (source reactivation_sweepbright), notification
 * immédiate à l'agence, et note horodatée écrite dans SweepBright par
 * l'API Website (POST /contacts/owners : met à jour le propriétaire trouvé
 * par id et ajoute la réponse en interaction ; cette API n'écrit pas de
 * label, qui reste posé à la main ou par Zapier). Un webhook sortant
 * optionnel (REACTIVATION_WEBHOOK_URL, sinon BUYER_FOLLOWUP_WEBHOOK_URL)
 * répercute aussi la réponse, pour le label.
 */

export type ReactivationContactRow = Database["public"]["Tables"]["reactivation_contacts"]["Row"];

const ACTIVITY_SOURCE = "email_reactivation";
const ACTIVITY_EVENT_TYPE = "reactivation_response";
const SELLER_LEAD_SOURCE = "reactivation_sweepbright";

export type OwnerLinks = {
  token: string;
  vendre: string;
  valeur: string;
  vendu: string;
  garde: string;
  stop: string;
};

const buildUrl = (baseUrl: string, token: string, response: OwnerResponse) => {
  const url = new URL(`/suivi/${token}`, `${baseUrl.replace(/\/+$/, "")}/`);
  url.searchParams.set("r", response);
  return url.toString();
};

/** Jeton signé + les cinq URL des boutons d'un contact. */
export const buildOwnerLinks = (input: { contactId: string; campaign: string; baseUrl?: string }): OwnerLinks => {
  const token = buildFollowupToken(
    { leadId: input.contactId, campaign: input.campaign, issuedAt: Math.floor(Date.now() / 1000) },
    getFollowupSecret()
  );
  const baseUrl = input.baseUrl ?? SITE_URL;
  return {
    token,
    vendre: buildUrl(baseUrl, token, "vendre"),
    valeur: buildUrl(baseUrl, token, "valeur"),
    vendu: buildUrl(baseUrl, token, "vendu"),
    garde: buildUrl(baseUrl, token, "garde"),
    stop: buildUrl(baseUrl, token, "stop"),
  };
};

export type ReactivationContactSummary = {
  id: string;
  campaign: string;
  segment: string;
  fullName: string;
  firstName: string | null;
  email: string;
  phone: string | null;
  status: string;
  response: string | null;
};

const toSummary = (row: ReactivationContactRow): ReactivationContactSummary => ({
  id: row.id,
  campaign: row.campaign,
  segment: row.segment,
  fullName: row.full_name?.trim() || row.email,
  firstName: cleanFirstName(row.first_name) ?? cleanFirstName(row.full_name?.trim().split(/\s+/)[0]),
  email: row.email,
  phone: row.phone,
  status: row.status,
  response: row.response,
});

export const getReactivationContact = async (contactId: string): Promise<ReactivationContactSummary | null> => {
  const { data, error } = await supabaseAdmin.from("reactivation_contacts").select("*").eq("id", contactId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toSummary(data as ReactivationContactRow) : null;
};

export type RecordOwnerResponseResult = {
  contact: ReactivationContactSummary;
  previousStatus: string;
  newStatus: string;
  sellerLeadId: string | null;
  notified: boolean;
};

/**
 * Enregistre la réponse d'un propriétaire. Un second clic réécrit la réponse
 * (le dernier mot du contact l'emporte) et ajoute une ligne d'historique ;
 * la promotion en lead vendeur n'est faite qu'une fois.
 */
export const recordOwnerResponse = async (input: {
  payload: FollowupTokenPayload;
  response: OwnerResponse;
  userAgent?: string | null;
}): Promise<RecordOwnerResponseResult | null> => {
  const { data: row, error } = await supabaseAdmin
    .from("reactivation_contacts")
    .select("*")
    .eq("id", input.payload.leadId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) return null;
  const contact = row as ReactivationContactRow;
  const nowIso = new Date().toISOString();
  const newStatus = resolveOwnerResponseStatus(input.response);
  const history = Array.isArray(contact.response_history) ? contact.response_history : [];

  let sellerLeadId = contact.seller_lead_id;
  if (OWNER_HOT_RESPONSES.has(input.response) && !sellerLeadId) {
    sellerLeadId = await promoteToSellerLead(contact, input.response);
  }

  const { error: updateError } = await supabaseAdmin
    .from("reactivation_contacts")
    .update({
      status: newStatus,
      response: input.response,
      responded_at: contact.responded_at ?? nowIso,
      next_send_at: null,
      seller_lead_id: sellerLeadId,
      response_history: [
        ...history,
        {
          response: input.response,
          at: nowIso,
          sequence_step: contact.sequence_step,
          subject_variant: contact.subject_variant,
          user_agent: input.userAgent ?? null,
        },
      ],
    })
    .eq("id", contact.id);
  if (updateError) throw new Error(updateError.message);

  const { error: activityError } = await supabaseAdmin.from("activity_events").insert({
    event_type: ACTIVITY_EVENT_TYPE,
    source: ACTIVITY_SOURCE,
    entity_type: "reactivation_contact",
    entity_id: contact.id,
    external_id: contact.sweepbright_contact_id,
    payload: {
      response: input.response,
      campaign: input.payload.campaign,
      segment: contact.segment,
      sequence_step: contact.sequence_step,
      subject_variant: contact.subject_variant,
      token_issued_at: new Date(input.payload.issuedAt * 1000).toISOString(),
      previous_status: contact.status,
      new_status: newStatus,
      seller_lead_id: sellerLeadId,
      user_agent: input.userAgent ?? null,
    },
  });
  if (activityError) {
    console.error("[reactivation] activity_events insert failed:", activityError.message);
  }

  let notified = false;
  if (OWNER_HOT_RESPONSES.has(input.response) || input.response === "vendu_cherche") {
    notified = await notifyAgency(contact, input.response, sellerLeadId);
    await writeSweepBrightNote(contact, input.response, nowIso);
  }

  await pushWebhook({ contact, response: input.response, newStatus, sellerLeadId, at: nowIso });

  return {
    contact: toSummary({ ...contact, status: newStatus, response: input.response }),
    previousStatus: contact.status,
    newStatus,
    sellerLeadId,
    notified,
  };
};

const promoteToSellerLead = async (contact: ReactivationContactRow, response: OwnerResponse): Promise<string | null> => {
  try {
    const result = await createSellerLead(
      {
        fullName: contact.full_name?.trim() || contact.email,
        email: contact.email,
        phone: contact.phone ?? undefined,
        timeline: response === "vendre" ? "envisage_de_vendre" : "souhaite_une_estimation",
        message: `Réponse à la réactivation SweepBright (${contact.campaign}) : ${OWNER_RESPONSE_LABELS[response]}.`,
        source: SELLER_LEAD_SOURCE,
        metadata: {
          reactivation: {
            contact_id: contact.id,
            campaign: contact.campaign,
            segment: contact.segment,
            sweepbright_contact_id: contact.sweepbright_contact_id,
            negotiator: contact.negotiator,
            response,
          },
        },
      },
      { actor: "system", toolName: "reactivation_followup" }
    );
    if (result.status === "failed") {
      console.error("[reactivation] seller lead promotion failed:", result.reason);
      return null;
    }
    return result.sellerLeadId;
  } catch (error) {
    console.error("[reactivation] seller lead promotion threw:", error instanceof Error ? error.message : error);
    return null;
  }
};

const notifyAgency = async (contact: ReactivationContactRow, response: OwnerResponse, sellerLeadId: string | null) => {
  const label = OWNER_RESPONSE_LABELS[response];
  const fullName = contact.full_name?.trim() || contact.email;
  const subject = response === "vendre" ? `Vendeur chaud — ${fullName}` : response === "valeur" ? `Estimation demandée — ${fullName}` : `Réactivation — ${fullName} : ${label}`;
  const phoneLine = contact.phone
    ? `<a href="tel:${escapeHtml(contact.phone.replace(/\s+/g, ""))}" style="color:#141446;">${escapeHtml(contact.phone)}</a>`
    : "non renseigné";
  const adminLink = sellerLeadId ? `${SITE_URL}/admin/seller-leads/${sellerLeadId}` : `${SITE_URL}/admin/reactivation`;
  const bodyHtml = `
    <p style="margin:0 0 12px;">${escapeHtml(fullName)} (contact SweepBright, ${escapeHtml(contact.segment)}) a répondu à la relance <strong>${escapeHtml(contact.campaign)}</strong> :</p>
    <p style="margin:0 0 18px;padding:12px 16px;background:#f4ece4;border-radius:12px;font-weight:600;">${escapeHtml(label)}</p>
    <p style="margin:0 0 6px;">E-mail : <a href="mailto:${escapeHtml(contact.email)}" style="color:#141446;">${escapeHtml(contact.email)}</a></p>
    <p style="margin:0 0 6px;">Téléphone : ${phoneLine}</p>
    <p style="margin:0;">Négociateur SweepBright : ${escapeHtml(contact.negotiator ?? "—")}</p>
  `;
  const html = renderEmailLayout({
    preheader: `${fullName} : ${label}`,
    eyebrow: "Réactivation SweepBright",
    title: subject,
    bodyHtml,
    cta: { label: sellerLeadId ? "Ouvrir le lead vendeur" : "Ouvrir la réactivation", href: adminLink },
    footerHtml: `<p style="margin:0;">Sillage Immo — suivi des relances</p>`,
  });
  const text = [
    `${fullName} a répondu à la relance ${contact.campaign} : ${label}`,
    "",
    `E-mail : ${contact.email}`,
    `Téléphone : ${contact.phone ?? "non renseigné"}`,
    `Négociateur SweepBright : ${contact.negotiator ?? "—"}`,
    "",
    adminLink,
  ].join("\n");
  try {
    const sent = await sendTransactionalEmail({ to: SILLAGE_CONTACT_EMAIL, subject, html, text });
    return sent.sent;
  } catch (error) {
    console.error("[reactivation] notification failed:", error instanceof Error ? error.message : error);
    return false;
  }
};

/**
 * Note dans SweepBright pour les réponses chaudes : l'API Website met à jour
 * le propriétaire (retrouvé par son id SweepBright) et consigne le message en
 * interaction, ce qui le fait remonter aux négociateurs. Réservé aux réponses
 * chaudes : sur « je le garde » ou « vendu », cela créerait du bruit
 * (label NOUVEAU, notification). Jamais bloquant.
 */
const writeSweepBrightNote = async (contact: ReactivationContactRow, response: OwnerResponse, atIso: string) => {
  if (process.env.REACTIVATION_SWEEPBRIGHT_NOTE === "off") return;
  const firstName = contact.first_name?.trim() || contact.full_name?.trim().split(/\s+/)[0] || "Contact";
  const lastName = contact.last_name?.trim() || contact.full_name?.trim().split(/\s+/).slice(1).join(" ") || "Sillage";
  const phone = contact.phone?.trim();
  if (!phone) return; // l'API exige un téléphone ; sans lui, le webhook et la notification suffisent
  const when = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" }).format(new Date(atIso));
  try {
    await sendSweepBrightOwnerLead({
      id: contact.sweepbright_contact_id,
      firstName,
      lastName,
      email: contact.email,
      phone,
      message: `Réactivation Sillage (${contact.campaign}) — ${when} : a cliqué « ${OWNER_RESPONSE_LABELS[response]} ». À rappeler dans la journée.`,
    });
  } catch (error) {
    console.error("[reactivation] SweepBright note failed:", error instanceof Error ? error.message : error);
  }
};

const pushWebhook = async (input: {
  contact: ReactivationContactRow;
  response: OwnerResponse;
  newStatus: string;
  sellerLeadId: string | null;
  at: string;
}) => {
  const url = (process.env.REACTIVATION_WEBHOOK_URL ?? process.env.BUYER_FOLLOWUP_WEBHOOK_URL)?.trim();
  if (!url) return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        event: ACTIVITY_EVENT_TYPE,
        campaign: input.contact.campaign,
        segment: input.contact.segment,
        response: input.response,
        response_label: OWNER_RESPONSE_LABELS[input.response],
        contact_id: input.contact.id,
        sweepbright_contact_id: input.contact.sweepbright_contact_id,
        email: input.contact.email,
        full_name: input.contact.full_name,
        phone: input.contact.phone,
        status: input.newStatus,
        seller_lead_id: input.sellerLeadId,
        answered_at: input.at,
      }),
      signal: controller.signal,
    });
    if (!response.ok) console.error(`[reactivation] webhook → ${response.status}`);
  } catch (error) {
    console.error("[reactivation] webhook failed:", error instanceof Error ? error.message : error);
  } finally {
    clearTimeout(timer);
  }
};
