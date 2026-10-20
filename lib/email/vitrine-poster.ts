import "server-only";
import { sendTransactionalEmail, type EmailAttachment } from "./smtp";
import { escapeHtml, renderEmailLayout } from "./layout";

export type VitrinePosterEmailInput = {
  to: string;
  firstName: string | null;
  /** Ligne de localisation de l'affiche, ex. « NICE · ÉGLISE RUSSE (06000) ». */
  propertyLabel: string;
  priceLine: string;
  downloadUrl: string;
  expiresAt: Date;
  warnings: string[];
  attachment: EmailAttachment | null;
};

const greetingFor = (firstName: string | null) => {
  const cleaned = firstName?.trim();
  return cleaned ? `Bonjour ${cleaned},` : "Bonjour,";
};

const formatExpiry = (date: Date) =>
  new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" }).format(date);

export const sendVitrinePosterEmail = async (input: VitrinePosterEmailInput) => {
  const greeting = greetingFor(input.firstName);
  const subject = `Fiche vitrine — ${input.propertyLabel}`;
  const preheader = `Votre affiche A3 est prête : ${input.propertyLabel}, ${input.priceLine}.`;
  const expiry = formatExpiry(input.expiresAt);

  const warningsHtml =
    input.warnings.length > 0
      ? `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:18px 0 0;">
        <tr>
          <td style="background:#fff7e6;border:1px solid rgba(180,120,0,0.25);border-radius:12px;padding:14px 18px;">
            <p style="margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#8a5a00;">
              À vérifier avant impression
            </p>
            ${input.warnings
              .map((line) => `<p style="margin:0 0 4px;font-size:14px;line-height:1.5;color:#141446;">${escapeHtml(line)}</p>`)
              .join("")}
          </td>
        </tr>
      </table>`
      : "";

  const attachmentLine = input.attachment
    ? "Le PDF est en pièce jointe de ce message ; le bouton ci-dessous permet aussi de le télécharger."
    : "Le PDF est disponible via le bouton ci-dessous (trop volumineux pour une pièce jointe).";

  const bodyHtml = `
    <p style="margin:0 0 14px;">${escapeHtml(greeting)}</p>
    <p style="margin:0 0 14px;">Votre fiche vitrine A3 est prête :</p>
    <p style="margin:0 0 4px;font-weight:600;color:#141446;">${escapeHtml(input.propertyLabel)}</p>
    <p style="margin:0 0 20px;color:#141446;">${escapeHtml(input.priceLine)}</p>
    <p style="margin:0 0 6px;">${escapeHtml(attachmentLine)}</p>
    ${warningsHtml}
    <p style="margin:18px 0 0;color:#5b5b78;font-size:14px;line-height:1.6;">
      Impression : A3 paysage, bords perdus désactivés, échelle 100 %.
    </p>
  `;

  const text = [
    greeting,
    "",
    "Votre fiche vitrine A3 est prête :",
    input.propertyLabel,
    input.priceLine,
    "",
    attachmentLine,
    `Télécharger le PDF (lien valable jusqu'au ${expiry}) : ${input.downloadUrl}`,
    ...(input.warnings.length > 0 ? ["", "À vérifier avant impression :", ...input.warnings.map((line) => `- ${line}`)] : []),
    "",
    "Impression : A3 paysage, bords perdus désactivés, échelle 100 %.",
  ].join("\n");

  const html = renderEmailLayout({
    preheader,
    eyebrow: "Fiche vitrine",
    title: "Votre affiche A3 est prête",
    bodyHtml,
    cta: { label: "Télécharger le PDF", href: input.downloadUrl },
    fallbackLink: {
      intro: "Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :",
      href: input.downloadUrl,
      expirationNote: `Lien valable jusqu'au ${expiry}.`,
    },
    footerHtml: `<p style="margin:0;">Généré automatiquement par sillage-immo.com depuis la fiche du bien.</p>`,
  });

  return sendTransactionalEmail({
    to: input.to,
    subject,
    text,
    html,
    ...(input.attachment ? { attachments: [input.attachment] } : {}),
  });
};
