import {
  SILLAGE_ADDRESS_CITY,
  SILLAGE_ADDRESS_POSTAL_CODE,
  SILLAGE_ADDRESS_STREET,
  SILLAGE_INSTAGRAM_URL,
} from "@/lib/brand/company";
import { SITE_NAME, SITE_URL } from "@/lib/seo/site";

/**
 * Cartes de visite virtuelles (/equipe/<slug>) : fonctions pures, sans accès
 * base, testées unitairement. Le slug, les numéros et la vCard se calculent
 * ici ; le service lit les profils et la page affiche.
 */

export const TEAM_CARD_BASE_PATH = "/equipe";

/** Provenances tracées dans l'URL (utm_source) selon le support utilisé. */
export type TeamCardSource = "nfc" | "qr" | "namedrop" | "og" | "vcard";

/** « Jean-Édouard » → « jean-edouard ». Retourne null si rien d'exploitable. */
export const slugifyFirstName = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") return null;
  const slug = value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : null;
};

/** Un slug fourni dans l'admin passe par les mêmes règles qu'un prénom. */
export const normalizeCardSlug = (value: string | null | undefined): string | null =>
  slugifyFirstName(value);

/**
 * Normalise un numéro français (ou déjà international) au format E.164 :
 * « 06 09 95 12 84 » → « +33609951284 », « 0033 6… » → « +336… ».
 * Retourne null si le numéro n'est pas exploitable (trop court, lettres…).
 */
export const normalizePhoneE164 = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") return null;
  let digits = value.replace(/\(0\)/g, "").replace(/[^\d+]/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) digits = `+${digits.slice(2)}`;
  if (digits.startsWith("+")) {
    const rest = digits.slice(1).replace(/\D/g, "");
    return rest.length >= 8 && rest.length <= 15 ? `+${rest}` : null;
  }
  digits = digits.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) return `+33${digits.slice(1)}`;
  if (digits.length === 9 && !digits.startsWith("0")) return `+33${digits}`;
  return null;
};

/** Affichage lisible : « 06 09 95 12 84 » pour la France, sinon « +44 … » groupé. */
export const formatPhoneDisplay = (e164: string): string => {
  if (e164.startsWith("+33") && e164.length === 12) {
    return `0${e164.slice(3)}`.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
  }
  return e164;
};

/** Lien WhatsApp universel (ouvre l'app sur mobile, WhatsApp Web sur ordinateur). */
export const buildWhatsAppUrl = (e164: string): string => `https://wa.me/${e164.replace(/\D/g, "")}`;

export const buildTeamCardPath = (slug: string) => `${TEAM_CARD_BASE_PATH}/${slug}`;

/** URL absolue de la carte, avec provenance tracée (utm) pour GA4. */
export const buildTeamCardUrl = (slug: string, source?: TeamCardSource): string => {
  const url = new URL(buildTeamCardPath(slug), `${SITE_URL}/`);
  if (source) {
    url.searchParams.set("utm_source", source);
    url.searchParams.set("utm_medium", "card");
    url.searchParams.set("utm_campaign", "carte-visite");
  }
  return url.toString();
};

/* ---------------------------------------------------------------------- */
/* vCard 3.0 — lue nativement par iOS (Contacts), Android et Outlook.       */
/* ---------------------------------------------------------------------- */

/** RFC 6350 §3.4 : antislash, virgule, point-virgule et retour à la ligne. */
export const escapeVCardText = (value: string): string =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");

/**
 * Pliage RFC 2425 : lignes de 75 octets maximum, suite indentée d'un espace.
 * On découpe sur les caractères (pas au milieu d'un code UTF-8) en comptant les
 * octets, ce qui garde les accents intacts.
 */
export const foldVCardLine = (line: string): string => {
  const encoder = new TextEncoder();
  const chunks: string[] = [];
  let current = "";
  let currentBytes = 0;
  let limit = 75;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (currentBytes + size > limit) {
      chunks.push(current);
      current = "";
      currentBytes = 0;
      limit = 74; // la suite commence par un espace
    }
    current += char;
    currentBytes += size;
  }
  if (current || chunks.length === 0) chunks.push(current);
  return chunks.map((chunk, index) => (index === 0 ? chunk : ` ${chunk}`)).join("\r\n");
};

export type TeamVCardInput = {
  firstName: string;
  lastName: string;
  /** Intitulé de poste (Directeur, Conseiller Senior…). */
  title: string | null;
  email: string;
  /** Numéro affiché, déjà au format E.164. */
  phone: string | null;
  /** Numéro WhatsApp s'il diffère ; sinon identique à `phone`. */
  whatsappPhone?: string | null;
  /** URL absolue de la carte (avec utm). */
  cardUrl: string;
  /** Photo encodée en base64 (JPEG) ; null si aucune. */
  photoBase64?: string | null;
  /** Révision ISO (REV). Par défaut : maintenant. */
  revision?: Date;
};

/**
 * Construit la vCard d'un collaborateur : nom, agence, poste, mobile, e-mail,
 * adresse de l'agence, site, carte et Instagram de l'agence, photo.
 * Version 3.0 : la plus compatible (iOS refuse certains champs 4.0).
 */
export const buildTeamVCard = (input: TeamVCardInput): string => {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  const lines: string[] = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${escapeVCardText(lastName)};${escapeVCardText(firstName)};;;`,
    `FN:${escapeVCardText(fullName)}`,
    `ORG:${escapeVCardText(SITE_NAME)}`,
  ];
  if (input.title) lines.push(`TITLE:${escapeVCardText(input.title)}`);
  if (input.phone) {
    lines.push(`TEL;TYPE=CELL,VOICE,pref:${input.phone}`);
  }
  if (input.whatsappPhone && input.whatsappPhone !== input.phone) {
    lines.push(`TEL;TYPE=CELL,VOICE:${input.whatsappPhone}`);
  }
  lines.push(`EMAIL;TYPE=INTERNET,WORK,pref:${input.email}`);
  lines.push(
    `ADR;TYPE=WORK:;;${escapeVCardText(SILLAGE_ADDRESS_STREET)};${escapeVCardText(
      SILLAGE_ADDRESS_CITY
    )};;${SILLAGE_ADDRESS_POSTAL_CODE};France`
  );
  lines.push(`URL;TYPE=WORK:${SITE_URL}`);
  lines.push(`URL;TYPE=pref:${input.cardUrl}`);
  lines.push(`X-SOCIALPROFILE;TYPE=instagram:${SILLAGE_INSTAGRAM_URL}`);
  lines.push(`NOTE:${escapeVCardText(`${SITE_NAME} — ${SILLAGE_ADDRESS_STREET}, ${SILLAGE_ADDRESS_POSTAL_CODE} ${SILLAGE_ADDRESS_CITY}. Carte : ${input.cardUrl}`)}`);
  if (input.photoBase64) {
    lines.push(`PHOTO;ENCODING=b;TYPE=JPEG:${input.photoBase64}`);
  }
  const revision = input.revision ?? new Date();
  lines.push(`REV:${revision.toISOString().replace(/\.\d{3}Z$/, "Z")}`);
  lines.push("END:VCARD");
  return `${lines.map(foldVCardLine).join("\r\n")}\r\n`;
};

/** Nom de fichier ASCII sûr : « laura-zeisser-sillage-immo.vcf ». */
export const buildVCardFileName = (firstName: string, lastName: string): string => {
  const base = slugifyFirstName(`${firstName} ${lastName}`) ?? "contact";
  return `${base}-sillage-immo.vcf`;
};
