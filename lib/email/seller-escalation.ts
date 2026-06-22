import "server-only";
import { sendTransactionalEmail } from "./smtp";
import { escapeHtml, renderEmailLayout } from "./layout";

export type SellerEscalationEmailInput = {
  to: string;
  advisorName: string | null;
  sellerFirstName: string | null;
  sellerCity: string | null;
  propertyType: string | null;
  lastUserMessage: string | null;
  adminDeepLink: string | null;
};

const truncate = (value: string, max: number) =>
  value.length > max ? `${value.slice(0, max)}…` : value;

export const sendSellerEscalationEmail = async (
  input: SellerEscalationEmailInput
) => {
  const subjectWho = input.sellerFirstName
    ? `${input.sellerFirstName}${input.sellerCity ? ` (${input.sellerCity})` : ""}`
    : "Un vendeur";
  const subject = `Demande de rappel prioritaire — ${subjectWho}`;

  const contextLines = [
    input.propertyType ? `Type de bien : ${input.propertyType}` : null,
    input.sellerCity ? `Secteur : ${input.sellerCity}` : null,
  ].filter(Boolean) as string[];

  const lastMessage = input.lastUserMessage
    ? truncate(input.lastUserMessage.trim(), 600)
    : null;

  const bodyHtml = `
    <p style="margin:0 0 14px;">${escapeHtml(
      input.advisorName ? `Bonjour ${input.advisorName},` : "Bonjour,"
    )}</p>
    <p style="margin:0 0 16px;">
      L'assistant Sillage a détecté un échange vendeur qui mérite un contact humain prioritaire.
    </p>
    ${
      contextLines.length > 0
        ? `<p style="margin:0 0 16px;color:#5b5b78;font-size:14px;line-height:1.6;">${contextLines
            .map((line) => escapeHtml(line))
            .join("<br/>")}</p>`
        : ""
    }
    ${
      lastMessage
        ? `<p style="margin:0 0 6px;color:#141446;font-weight:600;font-size:14px;">Dernier message du vendeur :</p>
           <blockquote style="margin:0 0 16px;padding:12px 16px;background:#f4ece4;border-radius:12px;color:#141446;font-size:14px;line-height:1.55;">${escapeHtml(
             lastMessage
           )}</blockquote>`
        : ""
    }
    <p style="margin:0;color:#5b5b78;font-size:14px;line-height:1.6;">
      Merci de planifier un rappel dès que possible.
    </p>
  `;

  const text = [
    input.advisorName ? `Bonjour ${input.advisorName},` : "Bonjour,",
    "",
    "L'assistant Sillage a détecté un échange vendeur qui mérite un contact humain prioritaire.",
    ...(contextLines.length > 0 ? ["", ...contextLines] : []),
    ...(lastMessage ? ["", "Dernier message du vendeur :", lastMessage] : []),
    "",
    "Merci de planifier un rappel dès que possible.",
    ...(input.adminDeepLink ? ["", `Ouvrir la fiche : ${input.adminDeepLink}`] : []),
  ].join("\n");

  const html = renderEmailLayout({
    preheader: "Un vendeur attend un contact humain prioritaire.",
    eyebrow: "Escalade vendeur",
    title: subject,
    bodyHtml,
    cta: input.adminDeepLink
      ? { label: "Ouvrir la fiche vendeur", href: input.adminDeepLink }
      : undefined,
    footerHtml: `<p style="margin:0;">Assistant Sillage Immo</p>`,
  });

  return sendTransactionalEmail({ to: input.to, subject, text, html });
};
