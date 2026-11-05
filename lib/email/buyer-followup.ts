import { escapeHtml, renderEmailLayout } from "./layout";
import { sendTransactionalEmail } from "./smtp";
import { FOLLOWUP_RESPONSE_LABELS, type FollowupResponse } from "@/lib/buyers/followup-token";

export type BuyerFollowupNotificationInput = {
  to: string;
  response: FollowupResponse;
  campaign: string;
  fullName: string;
  email: string;
  phone: string | null;
  adminDeepLink: string | null;
};

/**
 * Notification interne : un acquéreur relancé demande un point en visio
 * (ou toute autre réponse que l'on choisit de notifier). Coordonnées
 * cliquables, lien vers la fiche admin.
 */
export const renderBuyerFollowupNotification = (input: BuyerFollowupNotificationInput) => {
  const label = FOLLOWUP_RESPONSE_LABELS[input.response];
  const subject =
    input.response === "visio"
      ? `Visio demandée — ${input.fullName}`
      : `Relance acquéreur — ${input.fullName} : ${label}`;
  const phoneLine = input.phone
    ? `<a href="tel:${escapeHtml(input.phone.replace(/\s+/g, ""))}" style="color:#141446;">${escapeHtml(input.phone)}</a>`
    : "non renseigné";
  const bodyHtml = `
    <p style="margin:0 0 12px;">${escapeHtml(input.fullName)} a répondu à la relance <strong>${escapeHtml(input.campaign)}</strong> :</p>
    <p style="margin:0 0 18px;padding:12px 16px;background:#f4ece4;border-radius:12px;font-weight:600;">${escapeHtml(label)}</p>
    <p style="margin:0 0 6px;">E-mail : <a href="mailto:${escapeHtml(input.email)}" style="color:#141446;">${escapeHtml(input.email)}</a></p>
    <p style="margin:0;">Téléphone : ${phoneLine}</p>
  `;
  const text = [
    `${input.fullName} a répondu à la relance ${input.campaign} : ${label}`,
    "",
    `E-mail : ${input.email}`,
    `Téléphone : ${input.phone ?? "non renseigné"}`,
    ...(input.adminDeepLink ? ["", `Fiche admin : ${input.adminDeepLink}`] : []),
  ].join("\n");
  const html = renderEmailLayout({
    preheader: `${input.fullName} : ${label}`,
    eyebrow: "Relance acquéreurs",
    title: subject,
    bodyHtml,
    cta: input.adminDeepLink ? { label: "Ouvrir la fiche acquéreur", href: input.adminDeepLink } : undefined,
    footerHtml: `<p style="margin:0;">Sillage Immo — suivi des relances</p>`,
  });
  return { subject, text, html };
};

export const sendBuyerFollowupNotification = async (input: BuyerFollowupNotificationInput) => {
  const rendered = renderBuyerFollowupNotification(input);
  return sendTransactionalEmail({ to: input.to, ...rendered });
};
