import "server-only";
import { sendTransactionalEmail } from "./smtp";
import { escapeHtml, renderEmailLayout } from "./layout";
import type { AppLocale } from "@/lib/i18n/config";
import { formatPropertyTypeLabel } from "@/lib/properties/property-type-label";

export type BuyerAlertMatchInput = {
  title: string | null;
  city: string | null;
  /** Type SweepBright brut (`apartment`, `house`…) ; libellé traduit au rendu. */
  propertyType: string | null;
  priceAmount: number | null;
  canonicalPath: string;
  /** Photo principale (copie Supabase, URL stable), affichée en vignette dans la carte. */
  coverImageUrl?: string | null;
};

export type BuyerAlertEmailInput = {
  to: string;
  locale: AppLocale;
  firstName: string | null;
  matches: BuyerAlertMatchInput[];
  searchLabel: string;
  searchUrl: string;
  unsubscribeUrl: string;
};

type Copy = {
  subject: (count: number) => string;
  preheader: string;
  eyebrow: string;
  greeting: (name: string | null) => string;
  intro: (count: number, searchLabel: string) => string;
  advisorNote: string;
  viewSearchCta: string;
  openListing: string;
  footerNote: string;
  unsubscribe: string;
};

const COPY: Record<AppLocale, Copy> = {
  fr: {
    subject: (count) =>
      count === 1
        ? "Un nouveau bien correspond à votre recherche Sillage"
        : `${count} nouveaux biens correspondent à votre recherche Sillage`,
    preheader: "Sélection personnalisée par votre conseiller Sillage.",
    eyebrow: "Recherche Sillage",
    greeting: (name) => `Bonjour${name ? ` ${name}` : ""},`,
    intro: (count, label) =>
      count === 1
        ? `Voici un nouveau bien sélectionné pour votre recherche « ${label} ».`
        : `Voici ${count} nouveaux biens sélectionnés pour votre recherche « ${label} ».`,
    advisorNote:
      "Votre conseiller Sillage reste disponible pour organiser une visite ou affiner vos critères.",
    viewSearchCta: "Voir mes biens sélectionnés",
    openListing: "Voir le bien",
    footerNote:
      "Vous recevez cet email car vous avez créé une recherche sur Sillage Immo.",
    unsubscribe: "Se désabonner de cette recherche",
  },
  en: {
    subject: (count) =>
      count === 1
        ? "A new property matches your Sillage search"
        : `${count} new properties match your Sillage search`,
    preheader: "Hand-picked selection from your Sillage advisor.",
    eyebrow: "Sillage search",
    greeting: (name) => `Hello${name ? ` ${name}` : ""},`,
    intro: (count, label) =>
      count === 1
        ? `Here is a new property selected for your "${label}" search.`
        : `Here are ${count} new properties selected for your "${label}" search.`,
    advisorNote:
      "Your Sillage advisor remains available to arrange a viewing or refine your criteria.",
    viewSearchCta: "View my selected properties",
    openListing: "View property",
    footerNote: "You receive this email because you created a search on Sillage Immo.",
    unsubscribe: "Unsubscribe from this search",
  },
  es: {
    subject: (count) =>
      count === 1
        ? "Un nuevo bien corresponde a su búsqueda Sillage"
        : `${count} nuevos bienes corresponden a su búsqueda Sillage`,
    preheader: "Selección personalizada por su asesor Sillage.",
    eyebrow: "Búsqueda Sillage",
    greeting: (name) => `Hola${name ? ` ${name}` : ""},`,
    intro: (count, label) =>
      count === 1
        ? `Aquí tiene un nuevo bien seleccionado para su búsqueda «${label}».`
        : `Aquí tiene ${count} nuevos bienes seleccionados para su búsqueda «${label}».`,
    advisorNote:
      "Su asesor Sillage queda a su disposición para organizar una visita o afinar sus criterios.",
    viewSearchCta: "Ver mis bienes seleccionados",
    openListing: "Ver el bien",
    footerNote:
      "Recibe este correo porque ha creado una búsqueda en Sillage Immo.",
    unsubscribe: "Cancelar la suscripción a esta búsqueda",
  },
  ru: {
    subject: (count) =>
      count === 1
        ? "Новый объект соответствует вашему поиску Sillage"
        : `${count} новых объектов соответствуют вашему поиску Sillage`,
    preheader: "Подборка, отобранная вашим консультантом Sillage.",
    eyebrow: "Поиск Sillage",
    greeting: (name) => `Здравствуйте${name ? `, ${name}` : ""},`,
    intro: (count, label) =>
      count === 1
        ? `Вот новый объект, отобранный для вашего поиска «${label}».`
        : `Вот ${count} новых объектов, отобранных для вашего поиска «${label}».`,
    advisorNote:
      "Ваш консультант Sillage готов организовать показ или уточнить критерии поиска.",
    viewSearchCta: "Посмотреть мою подборку",
    openListing: "Посмотреть объект",
    footerNote:
      "Вы получили это письмо, поскольку создали поиск на Sillage Immo.",
    unsubscribe: "Отписаться от этого поиска",
  },
};

const formatPrice = (amount: number | null, locale: AppLocale) => {
  if (amount === null) return "";
  const numberLocale =
    locale === "en" ? "en-US" : locale === "es" ? "es-ES" : locale === "ru" ? "ru-RU" : "fr-FR";
  return `${amount.toLocaleString(numberLocale)} €`;
};

const propertyTypeLabel = (match: BuyerAlertMatchInput, locale: AppLocale) =>
  match.propertyType ? formatPropertyTypeLabel(match.propertyType, locale) : null;

const listingHref = (baseUrl: string, canonicalPath: string) =>
  `${baseUrl}${canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`}`;

/**
 * Vignette servie par l'optimiseur d'images du site (`/_next/image`, 1 200 px,
 * qualité 75, la seule admise par la configuration) : la copie Supabase fait 1 à 2 Mo, trop lourd pour un mail. Seules
 * des URL https absolues sont acceptées (jamais une donnée brute).
 */
const thumbnailUrl = (value: string | null | undefined, baseUrl: string) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^https:\/\/[^\s"'<>]+$/i.test(trimmed)) return null;
  if (!baseUrl) return trimmed;
  return `${baseUrl}/_next/image?url=${encodeURIComponent(trimmed)}&w=1200&q=75`;
};

const renderMatchCard = (
  match: BuyerAlertMatchInput,
  copy: Copy,
  locale: AppLocale,
  baseUrl: string
) => {
  const typeLabel = propertyTypeLabel(match, locale);
  const title = match.title || typeLabel || match.canonicalPath;
  const subtitle = [match.city, typeLabel].filter(Boolean).join(" · ");
  const priceLine = formatPrice(match.priceAmount, locale);
  const href = listingHref(baseUrl, match.canonicalPath);
  const imageUrl = thumbnailUrl(match.coverImageUrl, baseUrl);

  // Vignette : pleine largeur de la carte, ratio 16:9 forcé par la hauteur
  // (les clients mail ignorent object-fit ; l'image est servie en 1 200 px de
  // large, la hauteur fixe évite les cartes de tailles différentes).
  const imageHtml = imageUrl
    ? `
          <a href="${href}" style="display:block;text-decoration:none;">
            <img src="${escapeHtml(imageUrl)}" alt="" width="560" height="315"
              style="display:block;width:100%;height:auto;max-height:315px;border:0;border-radius:12px 12px 0 0;object-fit:cover;" />
          </a>`
    : "";

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 14px;">
      <tr>
        <td style="background:#ffffff;border:1px solid rgba(20,20,70,0.12);border-radius:14px;padding:0;overflow:hidden;">
          ${imageHtml}
          <div style="padding:18px 20px;">
          <p style="margin:0;font-size:16px;font-weight:600;color:#141446;line-height:1.35;">
            ${escapeHtml(title)}
          </p>
          ${
            subtitle
              ? `<p style="margin:6px 0 0;color:#5b5b78;font-size:14px;line-height:1.45;">${escapeHtml(subtitle)}</p>`
              : ""
          }
          ${
            priceLine
              ? `<p style="margin:10px 0 0;color:#141446;font-size:15px;font-weight:600;">${escapeHtml(priceLine)}</p>`
              : ""
          }
          <p style="margin:14px 0 0;font-size:14px;">
            <a href="${href}" style="color:#141446;text-decoration:none;font-weight:600;">
              ${escapeHtml(copy.openListing)} &rarr;
            </a>
          </p>
          </div>
        </td>
      </tr>
    </table>
  `;
};

/** Rendu pur (sujet, texte, HTML), testable sans envoi. */
export const renderBuyerAlertEmail = (input: BuyerAlertEmailInput): { subject: string; text: string; html: string } => {
  const copy = COPY[input.locale] ?? COPY.fr;
  const count = input.matches.length;
  const baseUrl = (process.env.PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  const visibleMatches = input.matches.slice(0, 10);

  const matchesHtml = visibleMatches
    .map((match) => renderMatchCard(match, copy, input.locale, baseUrl))
    .join("");

  const matchesText = visibleMatches
    .map((match) => {
      const typeLabel = propertyTypeLabel(match, input.locale);
      const title = match.title || typeLabel || match.canonicalPath;
      const parts = [
        `- ${title}`,
        [match.city, typeLabel].filter(Boolean).join(" · "),
        formatPrice(match.priceAmount, input.locale),
        listingHref(baseUrl, match.canonicalPath),
      ].filter(Boolean);
      return parts.join(" | ");
    })
    .join("\n");

  const subject = copy.subject(count);
  const text = [
    copy.greeting(input.firstName),
    "",
    copy.intro(count, input.searchLabel),
    "",
    matchesText,
    "",
    copy.advisorNote,
    "",
    `${copy.viewSearchCta}: ${input.searchUrl}`,
    "",
    copy.footerNote,
    `${copy.unsubscribe}: ${input.unsubscribeUrl}`,
  ].join("\n");

  const bodyHtml = `
    <p style="margin:0 0 12px;">${escapeHtml(copy.greeting(input.firstName))}</p>
    <p style="margin:0 0 22px;">${escapeHtml(copy.intro(count, input.searchLabel))}</p>
    ${matchesHtml}
    <p style="margin:18px 0 0;color:#5b5b78;font-size:14px;line-height:1.6;">
      ${escapeHtml(copy.advisorNote)}
    </p>
  `;

  const footerHtml = `
    <p style="margin:0 0 8px;">${escapeHtml(copy.footerNote)}</p>
    <p style="margin:0;">
      <a href="${input.unsubscribeUrl}" style="color:#5b5b78;text-decoration:underline;">
        ${escapeHtml(copy.unsubscribe)}
      </a>
    </p>
  `;

  const html = renderEmailLayout({
    preheader: copy.preheader,
    eyebrow: copy.eyebrow,
    title: subject,
    bodyHtml,
    cta: { label: copy.viewSearchCta, href: input.searchUrl },
    footerHtml,
  });

  return { subject, text, html };
};

export const sendBuyerAlertEmail = async (input: BuyerAlertEmailInput) => {
  if (input.matches.length === 0) {
    return { sent: false as const, reason: "no_matches" as const };
  }
  const { subject, text, html } = renderBuyerAlertEmail(input);
  return sendTransactionalEmail({
    to: input.to,
    subject,
    text,
    html,
  });
};
