import "server-only";

import { SILLAGE_CONTACT_EMAIL } from "@/lib/brand/company";
import {
  buildFollowupToken,
  buildFollowupUrl,
  isFollowupTokenFreshForAutologin,
  parseFollowupToken,
  resolveFollowupTransition,
  type FollowupResponse,
  type FollowupTokenPayload,
} from "@/lib/buyers/followup-token";
import { sendBuyerFollowupNotification } from "@/lib/email/buyer-followup";
import { SITE_URL } from "@/lib/seo/site";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClientPortalAccessLink } from "@/services/clients/client-portal-magic-link.service";

/**
 * Relances acquéreurs : enregistrement des réponses reçues par les liens
 * /suivi/<jeton>?r=… (voir lib/buyers/followup-token.ts pour le jeton).
 *
 * Chaque clic est journalisé dans activity_events ; le statut du lead et de
 * ses profils de recherche suivent la réponse ; « visio » notifie l'agence ;
 * un webhook sortant optionnel (BUYER_FOLLOWUP_WEBHOOK_URL, Zapier) répercute
 * la réponse vers SweepBright, dont l'API ne porte pas de statut de projet.
 */

const ACTIVITY_SOURCE = "email_followup";
const ACTIVITY_EVENT_TYPE = "buyer_followup_response";

const getFollowupSecret = () => {
  const secret = process.env.BUYER_ALERT_HMAC_SECRET?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("Missing server env var: BUYER_ALERT_HMAC_SECRET");
  }
  return "dev-only-buyer-alert-secret";
};

export const verifyFollowupToken = (token: string): FollowupTokenPayload | null =>
  parseFollowupToken(token, getFollowupSecret());

/** Jeton + URL de chaque bouton pour un lead (génération des e-mails de relance). */
export const buildFollowupLinksForLead = (input: { leadId: string; campaign: string; baseUrl?: string }) => {
  const token = buildFollowupToken(
    { leadId: input.leadId, campaign: input.campaign, issuedAt: Math.floor(Date.now() / 1000) },
    getFollowupSecret()
  );
  const baseUrl = input.baseUrl ?? SITE_URL;
  return {
    token,
    actif: buildFollowupUrl(baseUrl, token, "actif"),
    visio: buildFollowupUrl(baseUrl, token, "visio"),
    modif: buildFollowupUrl(baseUrl, token, "modif"),
    conclu: buildFollowupUrl(baseUrl, token, "conclu"),
    abandon: buildFollowupUrl(baseUrl, token, "abandon"),
  };
};

type LeadRow = {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  status: string;
};

export type FollowupLeadSummary = {
  id: string;
  fullName: string;
  firstName: string | null;
  email: string;
  status: string;
};

const toSummary = (row: LeadRow): FollowupLeadSummary => {
  const fullName = row.full_name?.trim() || row.email;
  const firstName = row.full_name?.trim().split(/\s+/)[0] ?? null;
  return { id: row.id, fullName, firstName: firstName || null, email: row.email, status: row.status };
};

export const getFollowupLead = async (leadId: string): Promise<FollowupLeadSummary | null> => {
  const { data, error } = await supabaseAdmin
    .from("buyer_leads")
    .select("id, full_name, email, phone, status")
    .eq("id", leadId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toSummary(data as LeadRow) : null;
};

export type RecordFollowupResult = {
  lead: FollowupLeadSummary;
  previousStatus: string;
  newStatus: string;
  profilesUpdated: number;
  notified: boolean;
};

/**
 * Enregistre une réponse : journal, statut du lead, statut des profils de
 * recherche, notification et webhook. Idempotent au sens métier (un second
 * clic identique réécrit les mêmes statuts et ajoute une ligne de journal).
 */
export const recordFollowupResponse = async (input: {
  payload: FollowupTokenPayload;
  response: FollowupResponse;
  userAgent?: string | null;
}): Promise<RecordFollowupResult | null> => {
  const { data: leadRow, error: leadError } = await supabaseAdmin
    .from("buyer_leads")
    .select("id, full_name, email, phone, status")
    .eq("id", input.payload.leadId)
    .maybeSingle();
  if (leadError) throw new Error(leadError.message);
  if (!leadRow) return null;
  const lead = leadRow as LeadRow;
  const transition = resolveFollowupTransition(input.response);
  const nowIso = new Date().toISOString();

  const { error: updateError } = await supabaseAdmin
    .from("buyer_leads")
    .update({ status: transition.leadStatus, updated_at: nowIso })
    .eq("id", lead.id);
  if (updateError) throw new Error(updateError.message);

  // Profils de recherche : fermés pour conclu / abandon, réactivés sinon
  // (seuls ceux qui ne sont pas déjà dans l'état cible sont touchés).
  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from("buyer_search_profiles")
    .select("id, status")
    .eq("buyer_lead_id", lead.id)
    .neq("status", transition.profileStatus);
  if (profilesError) throw new Error(profilesError.message);
  const profileIds = (profiles ?? []).map((row) => row.id);
  if (profileIds.length > 0) {
    const { error: profileUpdateError } = await supabaseAdmin
      .from("buyer_search_profiles")
      .update({ status: transition.profileStatus, updated_at: nowIso })
      .in("id", profileIds);
    if (profileUpdateError) throw new Error(profileUpdateError.message);
  }

  const { error: activityError } = await supabaseAdmin.from("activity_events").insert({
    event_type: ACTIVITY_EVENT_TYPE,
    source: ACTIVITY_SOURCE,
    entity_type: "buyer_lead",
    entity_id: lead.id,
    external_id: input.payload.campaign,
    payload: {
      response: input.response,
      campaign: input.payload.campaign,
      token_issued_at: new Date(input.payload.issuedAt * 1000).toISOString(),
      previous_lead_status: lead.status,
      new_lead_status: transition.leadStatus,
      profile_status: transition.profileStatus,
      profiles_updated: profileIds.length,
      user_agent: input.userAgent ?? null,
    },
  });
  if (activityError) {
    // Le journal ne doit pas faire échouer la réponse du client ; on trace.
    console.error("[buyer-followup] activity_events insert failed:", activityError.message);
  }

  let notified = false;
  if (input.response === "visio") {
    try {
      const sent = await sendBuyerFollowupNotification({
        to: SILLAGE_CONTACT_EMAIL,
        response: input.response,
        campaign: input.payload.campaign,
        fullName: lead.full_name?.trim() || lead.email,
        email: lead.email,
        phone: lead.phone,
        adminDeepLink: `${SITE_URL}/admin/buyer-leads/${lead.id}`,
      });
      notified = sent.sent;
    } catch (error) {
      console.error("[buyer-followup] notification failed:", error instanceof Error ? error.message : error);
    }
  }

  await pushFollowupWebhook({
    lead,
    response: input.response,
    campaign: input.payload.campaign,
    newStatus: transition.leadStatus,
    at: nowIso,
  });

  return {
    lead: toSummary(lead),
    previousStatus: lead.status,
    newStatus: transition.leadStatus,
    profilesUpdated: profileIds.length,
    notified,
  };
};

/**
 * Webhook sortant (Zapier « catch hook » ou équivalent) : e-mail, nom,
 * réponse, statut. Absent de l'environnement → rien n'est envoyé. Jamais
 * bloquant : 5 s maximum, erreurs tracées.
 */
const pushFollowupWebhook = async (input: {
  lead: LeadRow;
  response: FollowupResponse;
  campaign: string;
  newStatus: string;
  at: string;
}) => {
  const url = process.env.BUYER_FOLLOWUP_WEBHOOK_URL?.trim();
  if (!url) return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        event: ACTIVITY_EVENT_TYPE,
        campaign: input.campaign,
        response: input.response,
        lead_id: input.lead.id,
        email: input.lead.email,
        full_name: input.lead.full_name,
        phone: input.lead.phone,
        lead_status: input.newStatus,
        answered_at: input.at,
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      console.error(`[buyer-followup] webhook → ${response.status}`);
    }
  } catch (error) {
    console.error("[buyer-followup] webhook failed:", error instanceof Error ? error.message : error);
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Lien de connexion automatique à l'espace client, sur la recherche la plus
 * récente du lead en mode modification. Null si le jeton est trop ancien
 * (voir FOLLOWUP_AUTOLOGIN_MAX_AGE_DAYS) ou si aucune recherche n'existe.
 */
export const buildFollowupPortalLink = async (input: {
  payload: FollowupTokenPayload;
  lead: FollowupLeadSummary;
  origin: string;
}): Promise<string | null> => {
  if (!isFollowupTokenFreshForAutologin(input.payload)) return null;
  const { data: profile } = await supabaseAdmin
    .from("buyer_search_profiles")
    .select("client_project_id")
    .eq("buyer_lead_id", input.lead.id)
    .not("client_project_id", "is", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const projectId = profile?.client_project_id;
  const nextPath = projectId ? `/espace-client/recherches/${projectId}?edit=1` : "/espace-client";
  try {
    const link = await createClientPortalAccessLink({
      email: input.lead.email,
      nextPath,
      origin: input.origin,
    });
    return link.ok ? link.data.link : null;
  } catch (error) {
    console.error("[buyer-followup] portal link failed:", error instanceof Error ? error.message : error);
    return null;
  }
};
