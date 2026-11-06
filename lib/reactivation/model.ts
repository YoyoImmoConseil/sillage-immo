/**
 * Réactivation de la base dormante SweepBright — règles pures (sans I/O).
 *
 * Le tunnel : J0 la question, J+7 un rappel si aucun clic, J+21 un dernier
 * mail « on classe ? », arrêt au premier clic, puis dormant jusqu'à la vague
 * suivante. Les boutons renvoient sur /suivi/<jeton>?r=… ; le jeton est celui
 * des relances acquéreurs (lib/buyers/followup-token.ts), la campagne portant
 * le préfixe `reac-` pour distinguer un contact de réactivation d'un lead.
 */

export const REACTIVATION_CAMPAIGN_PREFIX = "reac-";
export const DEFAULT_REACTIVATION_CAMPAIGN = "reac-proprietaires-2026-11";

export const isReactivationCampaign = (campaign: string) => campaign.startsWith(REACTIVATION_CAMPAIGN_PREFIX);

export const REACTIVATION_SEGMENTS = ["v1_proprietaire", "v3_client", "a1_acquereur", "a2_ancien"] as const;
export type ReactivationSegment = (typeof REACTIVATION_SEGMENTS)[number];

export const isReactivationSegment = (value: unknown): value is ReactivationSegment =>
  typeof value === "string" && (REACTIVATION_SEGMENTS as readonly string[]).includes(value);

/** Réponses possibles d'un propriétaire (boutons du mail et de la page de confirmation). */
export const OWNER_RESPONSES = ["vendre", "valeur", "vendu", "vendu_cherche", "garde", "stop", "rappel", "cherche"] as const;
export type OwnerResponse = (typeof OWNER_RESPONSES)[number];

export const isOwnerResponse = (value: unknown): value is OwnerResponse =>
  typeof value === "string" && (OWNER_RESPONSES as readonly string[]).includes(value);

/** Réponses qui demandent une confirmation à l'écran avant d'être enregistrées (robots d'analyse de liens). */
export const OWNER_CONFIRM_RESPONSES: ReadonlySet<OwnerResponse> = new Set(["vendu", "stop"]);

/** Réponses « chaudes » : notification immédiate et promotion en lead vendeur. */
export const OWNER_HOT_RESPONSES: ReadonlySet<OwnerResponse> = new Set(["vendre", "valeur"]);

/**
 * Réponses secondaires, posées sur l'écran de confirmation : elles complètent
 * la réponse principale sans la remplacer. `rappel` = préfère être rappelé
 * plutôt que réserver ; `cherche` = cherche aussi à acheter (vente-rachat,
 * ou propriétaire qui garde mais cherche un autre bien).
 */
export const OWNER_SECONDARY_RESPONSES: ReadonlySet<OwnerResponse> = new Set(["rappel", "cherche"]);

export const OWNER_RESPONSE_LABELS: Record<OwnerResponse, string> = {
  vendre: "J'envisage de vendre, parlons-en",
  valeur: "J'aimerais connaître sa valeur aujourd'hui",
  vendu: "Je l'ai vendu",
  vendu_cherche: "Je l'ai vendu, et je cherche un autre bien",
  garde: "Je le garde, pas de projet",
  stop: "Ne plus recevoir de messages",
  rappel: "Préfère être rappelé(e)",
  cherche: "Cherche aussi à acheter",
};

export type ReactivationStatus =
  | "pending"
  | "sent"
  | "responded"
  | "dormant"
  | "excluded"
  | "bounced"
  | "unsubscribed";

/** Statut du contact après une réponse. */
export const resolveOwnerResponseStatus = (response: OwnerResponse): ReactivationStatus =>
  response === "stop" ? "unsubscribed" : "responded";

/** Objets testés sur la vague propriétaires (un tiers chacun, attribués en rotation à l'envoi J0). */
export const OWNER_SUBJECT_VARIANTS = ["A", "B", "C"] as const;
export type OwnerSubjectVariant = (typeof OWNER_SUBJECT_VARIANTS)[number];

export const OWNER_SUBJECTS: Record<OwnerSubjectVariant, string> = {
  A: "Ce que j'ignore encore de votre bien à Nice",
  B: "Votre quartier a bougé. Et votre bien ?",
  C: "Je remets mes dossiers à jour, et le vôtre ?",
};

export const OWNER_PREHEADER = "Pas de démarchage, une seule question — et votre réponse en un clic.";

/** Rotation stricte : le n-ième envoi J0 de la vague reçoit la variante n mod 3. */
export const pickSubjectVariant = (sentSoFar: number): OwnerSubjectVariant =>
  OWNER_SUBJECT_VARIANTS[((sentSoFar % 3) + 3) % 3];

export const SEQUENCE_DELAYS_DAYS = { reminder: 7, last: 14, dormant: 21 } as const;

/** Étape de séquence (0 = rien envoyé, 1 = J0, 2 = rappel J+7, 3 = dernier mail J+21). */
export type SequenceStep = 0 | 1 | 2 | 3;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Prochaine échéance après un envoi : J0 → rappel dans 7 jours ; rappel →
 * dernier mail 14 jours plus tard (J+21) ; dernier mail → passage en dormant
 * 21 jours plus tard. Le dernier mail n'est pas une relance de plus : c'est
 * la porte de sortie.
 */
export const nextSendAtAfter = (stepJustSent: 1 | 2 | 3, sentAt: Date): Date => {
  const days =
    stepJustSent === 1
      ? SEQUENCE_DELAYS_DAYS.reminder
      : stepJustSent === 2
        ? SEQUENCE_DELAYS_DAYS.last
        : SEQUENCE_DELAYS_DAYS.dormant;
  return new Date(sentAt.getTime() + days * DAY_MS);
};

export type SendDecision = { kind: "send"; step: 1 | 2 | 3 } | { kind: "dormant" } | { kind: "skip" };

/**
 * Que faire d'un contact dans la file d'envoi ? Un contact `pending` reçoit
 * J0 ; un contact `sent` dont l'échéance est passée reçoit l'étape suivante,
 * ou passe en dormant après le dernier mail. Tout autre statut est ignoré.
 */
export const decideNextSend = (
  contact: { status: string; sequence_step: number; next_send_at: string | null },
  now: Date
): SendDecision => {
  if (contact.status === "pending") return { kind: "send", step: 1 };
  if (contact.status !== "sent") return { kind: "skip" };
  if (!contact.next_send_at || new Date(contact.next_send_at).getTime() > now.getTime()) return { kind: "skip" };
  if (contact.sequence_step === 1) return { kind: "send", step: 2 };
  if (contact.sequence_step === 2) return { kind: "send", step: 3 };
  return { kind: "dormant" };
};

const PARIS_TZ = "Europe/Paris";

/** Jour ouvré (lundi à vendredi) à l'heure de Paris : on n'envoie jamais le week-end. */
export const isParisWeekday = (date: Date): boolean => {
  const day = new Intl.DateTimeFormat("en-US", { timeZone: PARIS_TZ, weekday: "short" }).format(date);
  return day !== "Sat" && day !== "Sun";
};

export const parisHourOf = (date: Date): number =>
  Number.parseInt(new Intl.DateTimeFormat("en-GB", { timeZone: PARIS_TZ, hour: "2-digit", hour12: false }).format(date), 10);

/** Créneau d'envoi quotidien : 9 h heure de Paris, jours ouvrés. */
export const isReactivationSendSlot = (date: Date): boolean => isParisWeekday(date) && parisHourOf(date) === 9;

export const DEFAULT_DAILY_LIMIT = 50;

/** Sans prénom exploitable (vide, « N/A », « firstname », e-mail…), le mail s'adresse sans prénom. */
export const cleanFirstName = (value: string | null | undefined): string | null => {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  if (raw.length > 40 || raw.includes("@") || /\d/.test(raw)) return null;
  const lowered = raw.toLowerCase();
  if (["n/a", "na", "firstname", "prenom", "prénom", "inconnu", "test", "mr", "mme", "m."].includes(lowered)) return null;
  // Première lettre en capitale, le reste tel quel (prénoms composés conservés).
  return raw.charAt(0).toUpperCase() + raw.slice(1);
};

export const normalizeEmailForReactivation = (email: string): string | null => {
  const value = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return null;
  return value;
};

// ---------------------------------------------------------------------------
// Expéditeur : le négociateur de la fiche SweepBright (décision du 06/11/2026).
// Chaque mail est signé à la première personne par Yoann, Jordan ou Laura ;
// chacun rappelle ses propres chauds. Jordan signe « Jordan S. », jamais son
// nom complet. Les fiches de Maylis (ancienne collaboratrice) et celles sans
// négociateur reviennent à Yoann.
// ---------------------------------------------------------------------------

export type SenderKey = "yoann" | "jordan" | "laura";

export type ReactivationSender = {
  key: SenderKey;
  /** Prénom utilisé dans les écrans (« Je vous appelle… » signé). */
  firstName: string;
  /** Nom affiché dans l'expéditeur et la signature. */
  displayName: string;
  /** Adresse d'envoi (doit être sur le domaine vérifié dans Resend). */
  email: string;
  /** Phrase de pont après « Nous nous sommes connus à l'occasion d'un projet immobilier à Nice. » */
  bridge: string;
  /** Ligne sous le nom dans la signature. */
  role: string;
  /** Page de réservation (vide = pas de bouton « réserver »). */
  bookingUrl: string | null;
};

const DEFAULT_SENDERS: Record<SenderKey, Omit<ReactivationSender, "bookingUrl" | "email"> & { email: string }> = {
  yoann: {
    key: "yoann",
    firstName: "Yoann",
    displayName: "Yoann Uzzan",
    email: "yu@sillage-immo.com",
    bridge: "Depuis, j'ai fondé Sillage Immo, une agence indépendante installée rue Arson, avec une idée simple : moins de mandats, mieux suivis.",
    role: "Fondateur · Sillage Immo",
  },
  jordan: {
    key: "jordan",
    firstName: "Jordan",
    displayName: "Jordan S.",
    email: "jordan@sillage-immo.com",
    bridge: "Depuis, je travaille chez Sillage Immo, l'agence indépendante fondée par Yoann Uzzan rue Arson, avec une idée simple : moins de mandats, mieux suivis.",
    role: "Conseiller · Sillage Immo",
  },
  laura: {
    key: "laura",
    firstName: "Laura",
    displayName: "Laura Zeisser",
    email: "laura@sillage-immo.com",
    bridge: "Depuis, je travaille chez Sillage Immo, l'agence indépendante fondée par Yoann Uzzan rue Arson, avec une idée simple : moins de mandats, mieux suivis.",
    role: "Conseillère · Sillage Immo",
  },
};

/** Clé d'expéditeur d'après le nom du négociateur SweepBright (insensible à la casse ; inconnu → Yoann). */
export const senderKeyForNegotiator = (negotiator: string | null | undefined): SenderKey => {
  const value = (negotiator ?? "").toLowerCase();
  if (value.includes("jordan")) return "jordan";
  if (value.includes("laura")) return "laura";
  return "yoann";
};

/**
 * Expéditeur résolu, avec les surcharges d'environnement :
 * REACTIVATION_SENDER_<KEY>_EMAIL, REACTIVATION_SENDER_<KEY>_BOOKING_URL
 * (REACTIVATION_BOOKING_URL sert de repli pour Yoann).
 */
export const resolveSender = (key: SenderKey, env: Record<string, string | undefined> = process.env): ReactivationSender => {
  const base = DEFAULT_SENDERS[key];
  const upper = key.toUpperCase();
  const email = env[`REACTIVATION_SENDER_${upper}_EMAIL`]?.trim() || base.email;
  const booking =
    env[`REACTIVATION_SENDER_${upper}_BOOKING_URL`]?.trim() || (key === "yoann" ? env.REACTIVATION_BOOKING_URL?.trim() : "") || null;
  return { ...base, email, bookingUrl: booking };
};

// ---------------------------------------------------------------------------
// Cadence : 50 par jour sur les 500 premiers envois, puis 150 (décision du 06/11).
// ---------------------------------------------------------------------------

export const DEFAULT_RAMP_THRESHOLD = 500;
export const DEFAULT_DAILY_LIMIT_AFTER_RAMP = 150;

/** Plafond du jour d'après le nombre total de mails déjà partis sur la campagne. */
export const dailyLimitFor = (
  totalSentSoFar: number,
  options: { base?: number; afterRamp?: number; threshold?: number } = {}
): number => {
  const base = options.base ?? DEFAULT_DAILY_LIMIT;
  const afterRamp = options.afterRamp ?? DEFAULT_DAILY_LIMIT_AFTER_RAMP;
  const threshold = options.threshold ?? DEFAULT_RAMP_THRESHOLD;
  return totalSentSoFar >= threshold ? Math.max(base, afterRamp) : base;
};

// ---------------------------------------------------------------------------
// Exclusions fixées le 06/11/2026 (en plus de REACTIVATION_EXCLUDED_NAMES).
// ---------------------------------------------------------------------------

/** Fragments d'adresse e-mail qui excluent la fiche (minuscules). */
export const DEFAULT_EXCLUDED_EMAIL_FRAGMENTS = ["@orpi.com", "dummy"] as const;

/** Motifs de nom (prénom + nom, insensible à la casse) exclus par défaut. */
export const DEFAULT_EXCLUDED_NAME_PATTERNS = [
  "taddei",
  "funel",
  "benjamin chiche",
  "laurent chiche",
  "reumaux",
  "raimondi",
  "charbonnel",
] as const;
