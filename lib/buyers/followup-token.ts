import crypto from "node:crypto";

/**
 * Liens de suivi des relances acquéreurs (/suivi/<jeton>?r=…).
 *
 * Le jeton lie une réponse à un lead sans rien exposer de personnel dans
 * l'URL : identifiant du lead, identifiant de campagne et date d'émission,
 * encodés en base64url puis signés (HMAC-SHA256). Pas d'expiration pour
 * l'enregistrement d'une réponse (un acquéreur peut répondre des semaines
 * plus tard) ; la connexion automatique à l'espace client, elle, est limitée
 * dans le temps par le service (voir FOLLOWUP_AUTOLOGIN_MAX_AGE_DAYS).
 */

export const FOLLOWUP_RESPONSES = ["actif", "visio", "modif", "conclu", "abandon"] as const;
export type FollowupResponse = (typeof FOLLOWUP_RESPONSES)[number];

export const isFollowupResponse = (value: unknown): value is FollowupResponse =>
  typeof value === "string" && (FOLLOWUP_RESPONSES as readonly string[]).includes(value);

/** Réponses qui ferment le projet : confirmation explicite demandée sur la page. */
export const FOLLOWUP_CLOSING_RESPONSES: ReadonlySet<FollowupResponse> = new Set(["conclu", "abandon"]);

export type FollowupClosingResponse = "conclu" | "abandon";

export const isClosingResponse = (response: FollowupResponse): response is FollowupClosingResponse =>
  FOLLOWUP_CLOSING_RESPONSES.has(response);

/** Au-delà, un clic « mes critères ont changé » ne connecte plus automatiquement. */
export const FOLLOWUP_AUTOLOGIN_MAX_AGE_DAYS = 60;

export type FollowupTokenPayload = {
  leadId: string;
  campaign: string;
  /** Secondes Unix. */
  issuedAt: number;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CAMPAIGN_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;

const toBase64Url = (value: string) => Buffer.from(value, "utf8").toString("base64url");
const fromBase64Url = (value: string) => Buffer.from(value, "base64url").toString("utf8");

const sign = (payload: string, secret: string) =>
  crypto.createHmac("sha256", secret).update(payload).digest("base64url");

export const buildFollowupToken = (payload: FollowupTokenPayload, secret: string): string => {
  if (!UUID_RE.test(payload.leadId)) throw new Error("Identifiant de lead invalide.");
  if (!CAMPAIGN_RE.test(payload.campaign)) {
    throw new Error("Identifiant de campagne invalide (minuscules, chiffres, tirets).");
  }
  const encoded = toBase64Url(`${payload.leadId}|${payload.campaign}|${Math.floor(payload.issuedAt)}`);
  return `${encoded}.${sign(encoded, secret)}`;
};

/** Null si le jeton est mal formé ou si la signature ne correspond pas. */
export const parseFollowupToken = (token: string, secret: string): FollowupTokenPayload | null => {
  if (typeof token !== "string" || token.length > 400) return null;
  const [encoded, signature, ...rest] = token.split(".");
  if (!encoded || !signature || rest.length > 0) return null;
  let expected: Buffer;
  let provided: Buffer;
  try {
    expected = Buffer.from(sign(encoded, secret), "base64url");
    provided = Buffer.from(signature, "base64url");
  } catch {
    return null;
  }
  if (expected.length === 0 || expected.length !== provided.length) return null;
  if (!crypto.timingSafeEqual(expected, provided)) return null;
  const [leadId, campaign, issuedAtRaw] = fromBase64Url(encoded).split("|");
  const issuedAt = Number.parseInt(issuedAtRaw ?? "", 10);
  if (!leadId || !UUID_RE.test(leadId) || !campaign || !CAMPAIGN_RE.test(campaign)) return null;
  if (!Number.isFinite(issuedAt) || issuedAt <= 0) return null;
  return { leadId: leadId.toLowerCase(), campaign, issuedAt };
};

export const isFollowupTokenFreshForAutologin = (payload: FollowupTokenPayload, now = new Date()) =>
  now.getTime() / 1000 - payload.issuedAt <= FOLLOWUP_AUTOLOGIN_MAX_AGE_DAYS * 24 * 60 * 60;

/** URL absolue d'un bouton de relance. */
export const buildFollowupUrl = (baseUrl: string, token: string, response: FollowupResponse): string => {
  const url = new URL(`/suivi/${token}`, `${baseUrl.replace(/\/+$/, "")}/`);
  url.searchParams.set("r", response);
  return url.toString();
};

export type FollowupTransition = {
  leadStatus: "active_search" | "lost";
  /** Statut appliqué aux profils de recherche du lead (null = inchangé). */
  profileStatus: "active" | "closed";
};

/**
 * Effet d'une réponse : actif / visio / modif → recherche active (et profils
 * fermés ou en pause réactivés, un clic « abandon » par erreur restant
 * rattrapable) ; conclu / abandon → lead perdu, profils fermés.
 */
export const resolveFollowupTransition = (response: FollowupResponse): FollowupTransition =>
  isClosingResponse(response)
    ? { leadStatus: "lost", profileStatus: "closed" }
    : { leadStatus: "active_search", profileStatus: "active" };

export const FOLLOWUP_RESPONSE_LABELS: Record<FollowupResponse, string> = {
  actif: "Mon projet est toujours actif",
  visio: "Mon projet est actif, je souhaite un point en visio",
  modif: "Mon projet continue, mais mes critères ont changé",
  conclu: "J'ai conclu ailleurs",
  abandon: "J'abandonne mon projet",
};
