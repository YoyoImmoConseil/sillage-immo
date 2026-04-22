import "server-only";
import { sendTransactionalEmail } from "./smtp";
import type { AppLocale } from "@/lib/i18n/config";

export type BuyerAlertMatchInput = {
  title: string | null;
  city: string | null;
  propertyType: string | null;
  priceAmount: number | null;
  canonicalPath: string;
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
  greeting: (name: string | null) => string;
  intro: (count: number, searchLabel: string) => string;
  viewSearchCta: string;
  openListing: string;
  footerNote: string;
  unsubscribe: string;
};

const COPY: Record<AppLocale, Copy> = {
  fr: {
    subject: (count) =>
      count === 1
        ? "Un nouveau bien correspond à votre recherche"
        : `${count} nouveaux biens correspondent à votre recherche`,
    greeting: (name) => `Bonjour${name ? ` ${name}` : ""},`,
    intro: (count, label) =>
      count === 1
        ? `Nous venons de publier un bien correspondant à votre recherche « ${label} » :`
        : `Nous venons de publier ${count} biens correspondant à votre recherche « ${label} » :`,
    viewSearchCta: "Voir toutes mes correspondances",
    openListing: "Voir le bien",
    footerNote:
      "Vous recevez cet email car vous avez sauvegardé une recherche sur Sillage Immo.",
    unsubscribe: "Mettre cette alerte en pause",
  },
  en: {
    subject: (count) =>
      count === 1
        ? "A new property matches your search"
        : `${count} new properties match your search`,
    greeting: (name) => `Hello${name ? ` ${name}` : ""},`,
    intro: (count, label) =>
      count === 1
        ? `We just published a property matching your "${label}" search:`
        : `We just published ${count} properties matching your "${label}" search:`,
    viewSearchCta: "View all my matches",
    openListing: "View property",
    footerNote: "You receive this email because you saved a search on Sillage Immo.",
    unsubscribe: "Pause this alert",
  },
  es: {
    subject: (count) =>
      count === 1
        ? "Un nuevo bien corresponde a su búsqueda"
        : `${count} nuevos bienes corresponden a su búsqueda`,
    greeting: (name) => `Hola${name ? ` ${name}` : ""},`,
    intro: (count, label) =>
      count === 1
        ? `Acabamos de publicar un bien correspondiente a su búsqueda «${label}»:`
        : `Acabamos de publicar ${count} bienes correspondientes a su búsqueda «${label}»:`,
    viewSearchCta: "Ver todas mis coincidencias",
    openListing: "Ver el bien",
    footerNote:
      "Recibe este correo porque ha guardado una búsqueda en Sillage Immo.",
    unsubscribe: "Pausar esta alerta",
  },
  ru: {
    subject: (count) =>
      count === 1
        ? "Новый объект соответствует вашему поиску"
        : `${count} новых объектов соответствуют вашему поиску`,
    greeting: (name) => `Здравствуйте${name ? `, ${name}` : ""},`,
    intro: (count, label) =>
      count === 1
        ? `Мы опубликовали объект, соответствующий вашему поиску «${label}»:`
        : `Мы опубликовали ${count} объектов, соответствующих вашему поиску «${label}»:`,
    viewSearchCta: "Посмотреть все совпадения",
    openListing: "Посмотреть объект",
    footerNote:
      "Вы получили это письмо, потому что сохранили поиск на Sillage Immo.",
    unsubscribe: "Приостановить оповещение",
  },
};

const formatPrice = (amount: number | null, locale: AppLocale) => {
  if (amount === null) return "";
  const numberLocale =
    locale === "en" ? "en-US" : locale === "es" ? "es-ES" : locale === "ru" ? "ru-RU" : "fr-FR";
  return `${amount.toLocaleString(numberLocale)} €`;
};

const renderMatchRow = (
  match: BuyerAlertMatchInput,
  copy: Copy,
  locale: AppLocale,
  baseUrl: string
) => {
  const title = match.title || match.propertyType || match.canonicalPath;
  const subtitle = [match.city, match.propertyType].filter(Boolean).join(" · ");
  const priceLine = formatPrice(match.priceAmount, locale);
  const href = `${baseUrl}${match.canonicalPath.startsWith("/") ? match.canonicalPath : `/${match.canonicalPath}`}`;

  return `
    <tr>
      <td style="padding:16px;border:1px solid rgba(20,20,70,0.12);border-radius:8px;">
        <p style="margin:0;font-weight:600;color:#141446;">${escapeHtml(title)}</p>
        ${subtitle ? `<p style="margin:4px 0 0;color:#5b5b78;font-size:14px;">${escapeHtml(subtitle)}</p>` : ""}
        ${priceLine ? `<p style="margin:8px 0 0;color:#141446;font-weight:600;">${escapeHtml(priceLine)}</p>` : ""}
        <p style="margin:12px 0 0;">
          <a href="${href}" style="color:#141446;font-weight:600;">${copy.openListing} →</a>
        </p>
      </td>
    </tr>
    <tr><td style="height:12px;"></td></tr>
  `;
};

const escapeHtml = (input: string) =>
  input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export const sendBuyerAlertEmail = async (input: BuyerAlertEmailInput) => {
  const copy = COPY[input.locale] ?? COPY.fr;
  const count = input.matches.length;
  if (count === 0) {
    return { sent: false as const, reason: "no_matches" as const };
  }

  const baseUrl = (process.env.PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  const matchesHtml = input.matches
    .slice(0, 10)
    .map((match) => renderMatchRow(match, copy, input.locale, baseUrl))
    .join("");

  const matchesText = input.matches
    .slice(0, 10)
    .map((match) => {
      const title = match.title || match.propertyType || match.canonicalPath;
      const parts = [
        `- ${title}`,
        [match.city, match.propertyType].filter(Boolean).join(" · "),
        formatPrice(match.priceAmount, input.locale),
        `${baseUrl}${match.canonicalPath}`,
      ].filter(Boolean);
      return parts.join(" | ");
    })
    .join("\n");

  const subject = copy.subject(count);
  const text = `${copy.greeting(input.firstName)}

${copy.intro(count, input.searchLabel)}

${matchesText}

${copy.viewSearchCta}: ${input.searchUrl}

${copy.footerNote}
${copy.unsubscribe}: ${input.unsubscribeUrl}
`;

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#141446;max-width:600px;margin:0 auto;">
      <p>${escapeHtml(copy.greeting(input.firstName))}</p>
      <p>${escapeHtml(copy.intro(count, input.searchLabel))}</p>
      <table role="presentation" style="width:100%;border-collapse:collapse;margin:16px 0;">
        ${matchesHtml}
      </table>
      <p style="margin:24px 0;">
        <a href="${input.searchUrl}" style="display:inline-block;padding:12px 20px;background:#141446;color:#f4ece4;text-decoration:none;border-radius:8px;font-weight:600;">
          ${copy.viewSearchCta}
        </a>
      </p>
      <p style="color:#5b5b78;font-size:13px;">${escapeHtml(copy.footerNote)}</p>
      <p style="color:#5b5b78;font-size:13px;">
        <a href="${input.unsubscribeUrl}" style="color:#5b5b78;">${copy.unsubscribe}</a>
      </p>
    </div>
  `;

  return sendTransactionalEmail({
    to: input.to,
    subject,
    text,
    html,
  });
};
