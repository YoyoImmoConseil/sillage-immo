import { SILLAGE_ADDRESS_DISPLAY, SILLAGE_CONTACT_EMAIL, SILLAGE_PHONE_DISPLAY } from "@/lib/brand/company";
import { OWNER_PREHEADER, OWNER_SUBJECTS, resolveSender, type OwnerSubjectVariant, type ReactivationSender } from "@/lib/reactivation/model";
import { escapeHtml } from "./layout";

/**
 * Mails de la vague propriétaires (BAT validé par Yoann le 06/11/2026).
 *
 * Trois temps : J0 la question (objet A/B/C testé), J+7 un rappel de 60 mots,
 * J+21 le dernier mail « on classe ? ». Rendu pur (testable sans envoi),
 * HTML en tableaux et styles en ligne, un seul bleu (navy de la charte),
 * texte brut joint pour les clients qui ne lisent pas le HTML.
 */

export type OwnerEmailLinks = {
  vendre: string;
  valeur: string;
  vendu: string;
  garde: string;
  stop: string;
};

export type OwnerEmailInput = {
  step: 1 | 2 | 3;
  variant: OwnerSubjectVariant;
  firstName: string | null;
  links: OwnerEmailLinks;
  /** Page de réservation (Google Agenda). Absente → la phrase « réservez 15 minutes » n'apparaît pas. */
  bookingUrl: string | null;
  quartiersUrl: string;
  /** Expéditeur (négociateur de la fiche). Absent → Yoann. */
  sender?: ReactivationSender;
};

const NAVY = "#141446";
const SAND = "#f4ece4";
const INK = "#1C1C1E";
const MUTED = "#5b5b78";
const FONT = "Helvetica,Arial,sans-serif";

const greeting = (firstName: string | null) => (firstName ? `Bonjour ${firstName},` : "Bonjour,");

const primaryButton = (label: string, href: string) => `
        <tr><td style="padding:0 0 10px 0;">
          <a href="${href}" style="display:block;background:${NAVY};color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:700;line-height:20px;padding:14px 20px;border-radius:6px;text-align:center;">${escapeHtml(label)}</a>
        </td></tr>`;

const secondaryButton = (label: string, href: string) => `
        <tr><td style="padding:0 0 10px 0;">
          <a href="${href}" style="display:block;border:1.5px solid ${NAVY};color:${NAVY};text-decoration:none;font-size:15px;font-weight:600;line-height:20px;padding:12px 20px;border-radius:6px;text-align:center;">${escapeHtml(label)}</a>
        </td></tr>`;

const quietLink = (label: string, href: string) => `
        <tr><td style="padding:0 0 4px 0;text-align:center;">
          <a href="${href}" style="font-size:13px;color:${MUTED};text-decoration:underline;">${escapeHtml(label)}</a>
        </td></tr>`;

const paragraph = (html: string, extra = "") =>
  `<p style="margin:0 0 16px 0;font-size:15px;line-height:24px;${extra}">${html}</p>`;

const bookingBlock = (bookingUrl: string | null) =>
  bookingUrl
    ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${SAND};border-radius:6px;">
        <tr><td style="padding:16px 20px;font-size:14px;line-height:22px;color:${INK};">
          Vous préférez en parler de vive voix&nbsp;?
          <a href="${bookingUrl}" style="color:${NAVY};font-weight:600;text-decoration:underline;">Réservez 15 minutes avec moi</a>,
          par téléphone ou en visio, au créneau qui vous arrange.
        </td></tr>
      </table>`
    : "";

const shell = (input: { preheader: string; title: string; bodyHtml: string; buttonsHtml: string; afterHtml: string; stopUrl: string }) => `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(input.title)}</title>
</head>
<body style="margin:0;padding:0;background:${SAND};">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:${SAND};">${escapeHtml(input.preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${SAND};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:8px;overflow:hidden;font-family:${FONT};color:${INK};">
  <tr>
    <td style="padding:28px 40px 20px 40px;border-bottom:1px solid #E6E8EC;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="font-size:18px;font-weight:700;letter-spacing:2px;color:${NAVY};white-space:nowrap;">SILLAGE IMMO</td></tr>
        <tr><td style="padding-top:4px;font-size:12px;color:${MUTED};">Nice · Accompagnement &amp; expertise immobilière</td></tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:32px 40px 8px 40px;">
      <p style="margin:0 0 20px 0;font-size:22px;line-height:30px;font-weight:700;color:${NAVY};">${escapeHtml(input.title)}</p>
      ${input.bodyHtml}
    </td>
  </tr>
  <tr>
    <td style="padding:0 40px 8px 40px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${input.buttonsHtml}
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:20px 40px 28px 40px;">
      ${input.afterHtml}
    </td>
  </tr>
  <tr>
    <td style="padding:20px 40px;background:${NAVY};color:#FFFFFF;font-size:12px;line-height:18px;">
      <strong>Sillage Immo</strong> · ${escapeHtml(SILLAGE_ADDRESS_DISPLAY)} · ${escapeHtml(SILLAGE_PHONE_DISPLAY)} · ${escapeHtml(SILLAGE_CONTACT_EMAIL)}<br>
      <span style="color:#C9D2E0;">Vous recevez ce message parce que nous avons été en contact pour un projet immobilier. Pour ne plus recevoir nos messages&nbsp;:
      <a href="${input.stopUrl}" style="color:#FFFFFF;text-decoration:underline;">me désinscrire</a>.</span>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`;

const signature = (sender: ReactivationSender) => `
      <p style="margin:24px 0 0 0;font-size:15px;line-height:24px;">
        À bientôt,<br>
        <strong>${escapeHtml(sender.displayName)}</strong><br>
        <span style="color:${MUTED};">${escapeHtml(sender.role)}</span>
      </p>`;

const quartiersLine = (quartiersUrl: string) => `
      <p style="margin:16px 0 0 0;font-size:13px;line-height:20px;color:${MUTED};">
        Les prix de votre quartier, mis à jour chaque mois&nbsp;: <a href="${quartiersUrl}" style="color:${NAVY};">sillage-immo.com/quartiers</a>
      </p>`;

const textFooter = (links: OwnerEmailLinks, bookingUrl: string | null, quartiersUrl: string, sender: ReactivationSender) =>
  [
    ...(bookingUrl ? ["", `Vous préférez en parler de vive voix ? Réservez 15 minutes avec moi : ${bookingUrl}`] : []),
    "",
    "À bientôt,",
    sender.displayName,
    sender.role,
    "",
    `Les prix de votre quartier, mis à jour chaque mois : ${quartiersUrl}`,
    "",
    `Sillage Immo · ${SILLAGE_ADDRESS_DISPLAY} · ${SILLAGE_PHONE_DISPLAY} · ${SILLAGE_CONTACT_EMAIL}`,
    `Pour ne plus recevoir nos messages : ${links.stop}`,
  ].join("\n");

const renderJ0 = (input: OwnerEmailInput) => {
  const sender = input.sender ?? resolveSender("yoann");
  const subject = OWNER_SUBJECTS[input.variant];
  const marketSentence =
    input.variant === "B"
      ? " Les prix de votre quartier ont évolué depuis, et votre projet aussi, peut-être."
      : "";
  const bodyHtml = [
    paragraph(escapeHtml(greeting(input.firstName))),
    paragraph(
      `Nous nous sommes connus à l'occasion d'un projet immobilier à Nice. ${sender.bridge.replace("Sillage Immo", "<strong>Sillage Immo</strong>").replace(" : ", "&nbsp;: ")}${escapeHtml(marketSentence)}`
    ),
    paragraph(
      `Je remets mes dossiers à jour et je préfère vous poser la question plutôt que de deviner&nbsp;: <strong>où en êtes-vous aujourd'hui avec votre bien&nbsp;?</strong>`
    ),
    paragraph("Un seul clic suffit, je n'ai pas besoin d'autre chose.", "margin-bottom:24px;"),
  ].join("");
  const buttonsHtml =
    primaryButton("J'envisage de vendre, parlons-en", input.links.vendre) +
    secondaryButton("J'aimerais connaître sa valeur aujourd'hui", input.links.valeur) +
    secondaryButton("Je l'ai vendu", input.links.vendu) +
    quietLink("Je le garde, pas de projet", input.links.garde);
  const afterHtml = bookingBlock(input.bookingUrl) + signature(sender) + quartiersLine(input.quartiersUrl);
  const html = shell({
    preheader: OWNER_PREHEADER,
    title: "Votre bien à Nice : où en êtes-vous ?",
    bodyHtml,
    buttonsHtml,
    afterHtml,
    stopUrl: input.links.stop,
  });
  const text = [
    greeting(input.firstName),
    "",
    `Nous nous sommes connus à l'occasion d'un projet immobilier à Nice. ${sender.bridge}${marketSentence}`,
    "",
    "Je remets mes dossiers à jour et je préfère vous poser la question plutôt que de deviner : où en êtes-vous aujourd'hui avec votre bien ?",
    "",
    "Un seul clic suffit, je n'ai pas besoin d'autre chose.",
    "",
    `J'envisage de vendre, parlons-en : ${input.links.vendre}`,
    `J'aimerais connaître sa valeur aujourd'hui : ${input.links.valeur}`,
    `Je l'ai vendu : ${input.links.vendu}`,
    `Je le garde, pas de projet : ${input.links.garde}`,
    textFooter(input.links, input.bookingUrl, input.quartiersUrl, sender),
  ].join("\n");
  return { subject, html, text };
};

const renderReminder = (input: OwnerEmailInput) => {
  const sender = input.sender ?? resolveSender("yoann");
  const subject = "Un clic suffit";
  const bodyHtml = [
    paragraph(escapeHtml(greeting(input.firstName))),
    paragraph(
      "Je vous ai écrit la semaine dernière au sujet de votre bien à Nice, sans vouloir vous relancer plus que nécessaire. Si vous n'avez pas eu le temps, voici la même question&nbsp;: <strong>où en êtes-vous aujourd'hui&nbsp;?</strong>"
    ),
    paragraph("Un clic, et je mets votre dossier à jour.", "margin-bottom:24px;"),
  ].join("");
  const buttonsHtml =
    primaryButton("J'envisage de vendre, parlons-en", input.links.vendre) +
    secondaryButton("J'aimerais connaître sa valeur aujourd'hui", input.links.valeur) +
    secondaryButton("Je l'ai vendu", input.links.vendu) +
    quietLink("Je le garde, pas de projet", input.links.garde);
  const afterHtml = bookingBlock(input.bookingUrl) + signature(sender) + quartiersLine(input.quartiersUrl);
  const html = shell({
    preheader: "La même question qu'il y a une semaine, et votre réponse en un clic.",
    title: "Un clic suffit",
    bodyHtml,
    buttonsHtml,
    afterHtml,
    stopUrl: input.links.stop,
  });
  const text = [
    greeting(input.firstName),
    "",
    "Je vous ai écrit la semaine dernière au sujet de votre bien à Nice, sans vouloir vous relancer plus que nécessaire. Si vous n'avez pas eu le temps, voici la même question : où en êtes-vous aujourd'hui ?",
    "",
    "Un clic, et je mets votre dossier à jour.",
    "",
    `J'envisage de vendre, parlons-en : ${input.links.vendre}`,
    `J'aimerais connaître sa valeur aujourd'hui : ${input.links.valeur}`,
    `Je l'ai vendu : ${input.links.vendu}`,
    `Je le garde, pas de projet : ${input.links.garde}`,
    textFooter(input.links, input.bookingUrl, input.quartiersUrl, sender),
  ].join("\n");
  return { subject, html, text };
};

const renderLast = (input: OwnerEmailInput) => {
  const sender = input.sender ?? resolveSender("yoann");
  const subject = "On classe votre dossier ?";
  const bodyHtml = [
    paragraph(escapeHtml(greeting(input.firstName))),
    paragraph(
      "Sans réponse de votre part, je vais classer votre dossier et ne plus vous écrire. Si vous souhaitez simplement suivre les prix de votre quartier, un clic suffit et je vous garde dans ma veille&nbsp;: un point par trimestre, rien de plus."
    ),
    paragraph("Et si votre projet évolue un jour, mes coordonnées restent les mêmes.", "margin-bottom:24px;"),
  ].join("");
  const buttonsHtml =
    primaryButton("Gardez-moi dans votre veille de quartier", input.links.garde) +
    secondaryButton("Classez mon dossier", input.links.stop);
  const afterHtml = signature(sender) + quartiersLine(input.quartiersUrl);
  const html = shell({
    preheader: "Dernier message : je garde votre dossier ouvert, ou je le classe.",
    title: "On classe votre dossier ?",
    bodyHtml,
    buttonsHtml,
    afterHtml,
    stopUrl: input.links.stop,
  });
  const text = [
    greeting(input.firstName),
    "",
    "Sans réponse de votre part, je vais classer votre dossier et ne plus vous écrire. Si vous souhaitez simplement suivre les prix de votre quartier, un clic suffit et je vous garde dans ma veille : un point par trimestre, rien de plus.",
    "",
    "Et si votre projet évolue un jour, mes coordonnées restent les mêmes.",
    "",
    `Gardez-moi dans votre veille de quartier : ${input.links.garde}`,
    `Classez mon dossier : ${input.links.stop}`,
    textFooter(input.links, null, input.quartiersUrl, sender),
  ].join("\n");
  return { subject, html, text };
};

export const renderOwnerReactivationEmail = (input: OwnerEmailInput): { subject: string; html: string; text: string } => {
  if (input.step === 1) return renderJ0(input);
  if (input.step === 2) return renderReminder(input);
  return renderLast(input);
};
