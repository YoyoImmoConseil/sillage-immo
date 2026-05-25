import "server-only";
import { sendTransactionalEmail } from "./smtp";
import { escapeHtml, renderEmailLayout } from "./layout";

export type NewPropertyDocumentEmailInput = {
  to: string;
  recipientFirstName: string | null;
  propertyLabel: string;
  propertyAddress: string | null;
  documentLabel: string;
  documentKind: "file" | "link";
  uploaderName: string | null;
  propertyUrl: string;
};

export type NewPropertyDocumentProspectEmailInput = {
  to: string;
  recipientFirstName: string | null;
  propertyLabel: string;
  propertyAddress: string | null;
  documentLabel: string;
  documentKind: "file" | "link";
  uploaderName: string | null;
  activationLink: string;
};

export type ClientUploadedDocumentAdvisorEmailInput = {
  to: string;
  advisorFirstName: string | null;
  propertyLabel: string;
  propertyAddress: string | null;
  documentLabel: string;
  documentKind: "file" | "link";
  clientName: string | null;
  clientEmail: string | null;
  adminPropertyUrl: string;
};

const buildSubject = (input: NewPropertyDocumentEmailInput) => {
  const kindWord = input.documentKind === "link" ? "lien" : "document";
  return `Sillage Immo - un nouveau ${kindWord} pour votre bien`;
};

const buildPreheader = (input: NewPropertyDocumentEmailInput) => {
  return input.propertyAddress
    ? `Nouveau document disponible pour ${input.propertyAddress}.`
    : "Un nouveau document est disponible dans votre espace Sillage.";
};

const buildGreeting = (firstName: string | null): string => {
  if (!firstName) return "Bonjour,";
  const cleaned = firstName.trim();
  if (!cleaned) return "Bonjour,";
  return `Bonjour ${cleaned},`;
};

export const sendNewPropertyDocumentEmail = async (
  input: NewPropertyDocumentEmailInput
) => {
  const greeting = buildGreeting(input.recipientFirstName);
  const subject = buildSubject(input);
  const preheader = buildPreheader(input);

  const propertyLine = input.propertyAddress
    ? `${input.propertyLabel} — ${input.propertyAddress}`
    : input.propertyLabel;

  const uploaderLine = input.uploaderName
    ? `Déposé par ${input.uploaderName} (équipe Sillage Immo).`
    : "Déposé par votre conseiller Sillage Immo.";

  const documentKindLabel = input.documentKind === "link" ? "Lien" : "Document";

  const bodyHtml = `
    <p style="margin:0 0 14px;">${escapeHtml(greeting)}</p>
    <p style="margin:0 0 14px;">
      Votre conseiller Sillage Immo vient d'ajouter un nouveau document dans la fiche
      de votre bien :
    </p>
    <p style="margin:0 0 20px;font-weight:600;color:#141446;">
      ${escapeHtml(propertyLine)}
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px;">
      <tr>
        <td style="background:#ffffff;border:1px solid rgba(20,20,70,0.12);border-radius:14px;padding:18px 20px;">
          <p style="margin:0;color:#5b5b78;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;">
            ${escapeHtml(documentKindLabel)}
          </p>
          <p style="margin:8px 0 0;font-size:16px;font-weight:600;color:#141446;line-height:1.4;">
            ${escapeHtml(input.documentLabel)}
          </p>
          <p style="margin:10px 0 0;color:#5b5b78;font-size:13px;line-height:1.5;">
            ${escapeHtml(uploaderLine)}
          </p>
        </td>
      </tr>
    </table>
    <p style="margin:18px 0 0;color:#5b5b78;font-size:14px;line-height:1.6;">
      Retrouvez ce document à tout moment depuis votre espace Sillage, dans la fiche
      du bien. Votre conseiller reste à votre disposition pour toute question.
    </p>
  `;

  const text = [
    greeting,
    "",
    "Votre conseiller Sillage Immo vient d'ajouter un nouveau document dans la fiche de votre bien :",
    propertyLine,
    "",
    `${documentKindLabel} : ${input.documentLabel}`,
    uploaderLine,
    "",
    `Consulter ce document dans votre espace Sillage : ${input.propertyUrl}`,
    "",
    "À très vite,",
    "L'équipe Sillage Immo",
  ].join("\n");

  const footerHtml = `
    <p style="margin:0 0 4px;">À très vite,</p>
    <p style="margin:0;">L'équipe Sillage Immo</p>
  `;

  const html = renderEmailLayout({
    preheader,
    eyebrow: "Espace Sillage — Nouveau document",
    title: "Un nouveau document est à votre disposition",
    bodyHtml,
    cta: { label: "Consulter dans mon espace Sillage", href: input.propertyUrl },
    fallbackLink: {
      intro: "Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :",
      href: input.propertyUrl,
    },
    footerHtml,
  });

  return sendTransactionalEmail({
    to: input.to,
    subject,
    text,
    html,
  });
};

export const sendNewPropertyDocumentToProspectEmail = async (
  input: NewPropertyDocumentProspectEmailInput
) => {
  const greeting = buildGreeting(input.recipientFirstName);
  const kindWord = input.documentKind === "link" ? "lien" : "document";
  const subject = `Sillage Immo - un nouveau ${kindWord} vous attend dans votre espace`;
  const preheader = input.propertyAddress
    ? `Activez votre espace Sillage pour consulter ce ${kindWord} sur ${input.propertyAddress}.`
    : `Activez votre espace Sillage pour consulter ce ${kindWord}.`;

  const propertyLine = input.propertyAddress
    ? `${input.propertyLabel} — ${input.propertyAddress}`
    : input.propertyLabel;

  const uploaderLine = input.uploaderName
    ? `Déposé par ${input.uploaderName} (équipe Sillage Immo).`
    : "Déposé par votre conseiller Sillage Immo.";

  const documentKindLabel = input.documentKind === "link" ? "Lien" : "Document";

  const bodyHtml = `
    <p style="margin:0 0 14px;">${escapeHtml(greeting)}</p>
    <p style="margin:0 0 14px;">
      Votre conseiller Sillage Immo vient d'ajouter un nouveau document concernant
      votre bien :
    </p>
    <p style="margin:0 0 20px;font-weight:600;color:#141446;">
      ${escapeHtml(propertyLine)}
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px;">
      <tr>
        <td style="background:#ffffff;border:1px solid rgba(20,20,70,0.12);border-radius:14px;padding:18px 20px;">
          <p style="margin:0;color:#5b5b78;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;">
            ${escapeHtml(documentKindLabel)}
          </p>
          <p style="margin:8px 0 0;font-size:16px;font-weight:600;color:#141446;line-height:1.4;">
            ${escapeHtml(input.documentLabel)}
          </p>
          <p style="margin:10px 0 0;color:#5b5b78;font-size:13px;line-height:1.5;">
            ${escapeHtml(uploaderLine)}
          </p>
        </td>
      </tr>
    </table>
    <p style="margin:18px 0 0;">
      Pour le consulter, activez votre espace client Sillage en un clic — pas de mot
      de passe à retenir. Vous serez directement redirigé vers la fiche de votre
      bien.
    </p>
  `;

  const text = [
    greeting,
    "",
    "Votre conseiller Sillage Immo vient d'ajouter un nouveau document concernant votre bien :",
    propertyLine,
    "",
    `${documentKindLabel} : ${input.documentLabel}`,
    uploaderLine,
    "",
    "Pour le consulter, activez votre espace client Sillage (pas de mot de passe à retenir) en suivant ce lien :",
    input.activationLink,
    "",
    "Ce lien est personnel et expire automatiquement.",
    "",
    "À très vite,",
    "L'équipe Sillage Immo",
  ].join("\n");

  const footerHtml = `
    <p style="margin:0 0 4px;">À très vite,</p>
    <p style="margin:0;">L'équipe Sillage Immo</p>
  `;

  const html = renderEmailLayout({
    preheader,
    eyebrow: "Espace Sillage — Activation",
    title: "Un nouveau document vous attend",
    bodyHtml,
    cta: { label: "Activer mon espace et consulter le document", href: input.activationLink },
    fallbackLink: {
      intro: "Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :",
      href: input.activationLink,
      expirationNote: "Ce lien est personnel et expire automatiquement.",
    },
    footerHtml,
  });

  return sendTransactionalEmail({
    to: input.to,
    subject,
    text,
    html,
  });
};

export const sendClientUploadedDocumentAdvisorEmail = async (
  input: ClientUploadedDocumentAdvisorEmailInput
) => {
  const greeting = buildGreeting(input.advisorFirstName);
  const kindWord = input.documentKind === "link" ? "lien" : "document";
  const subject = `Sillage Immo - votre client a déposé un nouveau ${kindWord}`;
  const preheader = input.clientName
    ? `${input.clientName} vient d'ajouter un ${kindWord} sur la fiche du bien.`
    : `Un client vient d'ajouter un ${kindWord} sur la fiche du bien.`;

  const propertyLine = input.propertyAddress
    ? `${input.propertyLabel} — ${input.propertyAddress}`
    : input.propertyLabel;

  const clientLine = (() => {
    const name = input.clientName?.trim();
    const email = input.clientEmail?.trim();
    if (name && email) return `${name} (${email})`;
    if (name) return name;
    if (email) return email;
    return "Un co-propriétaire";
  })();

  const documentKindLabel = input.documentKind === "link" ? "Lien" : "Document";

  const bodyHtml = `
    <p style="margin:0 0 14px;">${escapeHtml(greeting)}</p>
    <p style="margin:0 0 14px;">
      ${escapeHtml(clientLine)} vient de déposer un nouveau document dans la fiche
      du bien dont vous êtes le conseiller :
    </p>
    <p style="margin:0 0 20px;font-weight:600;color:#141446;">
      ${escapeHtml(propertyLine)}
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px;">
      <tr>
        <td style="background:#ffffff;border:1px solid rgba(20,20,70,0.12);border-radius:14px;padding:18px 20px;">
          <p style="margin:0;color:#5b5b78;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;">
            ${escapeHtml(documentKindLabel)}
          </p>
          <p style="margin:8px 0 0;font-size:16px;font-weight:600;color:#141446;line-height:1.4;">
            ${escapeHtml(input.documentLabel)}
          </p>
        </td>
      </tr>
    </table>
    <p style="margin:18px 0 0;color:#5b5b78;font-size:14px;line-height:1.6;">
      Vous pouvez consulter ce document immédiatement depuis la fiche du bien dans
      l'admin Sillage Immo.
    </p>
  `;

  const text = [
    greeting,
    "",
    `${clientLine} vient de déposer un nouveau document dans la fiche du bien dont vous êtes le conseiller :`,
    propertyLine,
    "",
    `${documentKindLabel} : ${input.documentLabel}`,
    "",
    `Ouvrir la fiche du bien : ${input.adminPropertyUrl}`,
    "",
    "L'équipe Sillage Immo",
  ].join("\n");

  const footerHtml = `
    <p style="margin:0 0 4px;">Bonne réception,</p>
    <p style="margin:0;">L'équipe Sillage Immo</p>
  `;

  const html = renderEmailLayout({
    preheader,
    eyebrow: "Admin Sillage — Nouveau document client",
    title: "Votre client a déposé un nouveau document",
    bodyHtml,
    cta: { label: "Ouvrir la fiche du bien", href: input.adminPropertyUrl },
    fallbackLink: {
      intro: "Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :",
      href: input.adminPropertyUrl,
    },
    footerHtml,
  });

  return sendTransactionalEmail({
    to: input.to,
    subject,
    text,
    html,
  });
};
