import "server-only";
import nodemailer from "nodemailer";
import { Resend } from "resend";
import { escapeHtml, renderEmailLayout } from "./layout";

type EmailPayload = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

const isSmtpConfigured = () => {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      (process.env.EMAIL_FROM_EMAIL || process.env.SMTP_FROM_EMAIL)
  );
};

const isResendConfigured = () => {
  return Boolean(process.env.RESEND_API_KEY && (process.env.EMAIL_FROM_EMAIL || process.env.SMTP_FROM_EMAIL));
};

const getTransporter = () => {
  if (!isSmtpConfigured()) return null;

  const port = Number.parseInt(process.env.SMTP_PORT as string, 10);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number.isFinite(port) ? port : 587,
    secure: Number.isFinite(port) ? port === 465 : false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const getFromName = () => {
  return process.env.EMAIL_FROM_NAME || process.env.SMTP_FROM_NAME || "Sillage Immo";
};

const getFromEmail = () => {
  const fromEmail = process.env.EMAIL_FROM_EMAIL || process.env.SMTP_FROM_EMAIL;
  return fromEmail?.trim() || null;
};

const buildOtpEmailPayload = (email: string, code: string): EmailPayload => {
  const safeCode = escapeHtml(code);
  const subject = "Votre code pour sécuriser votre estimation";
  const preheader = "Votre code est valable pendant 10 minutes.";
  const bodyHtml = `
    <p style="margin:0 0 14px;">Bonjour,</p>
    <p style="margin:0 0 20px;">
      Voici votre code pour sécuriser l'envoi de votre estimation Sillage Immo.
    </p>
    <p style="margin:24px 0;font-size:30px;font-weight:700;letter-spacing:6px;color:#141446;">
      ${safeCode}
    </p>
    <p style="margin:0 0 12px;color:#5b5b78;font-size:14px;">
      Ce code expire dans 10 minutes.
    </p>
    <p style="margin:0;color:#5b5b78;font-size:14px;">
      Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer ce message en toute sécurité.
    </p>
  `;
  const footerHtml = `
    <p style="margin:0 0 4px;">À très vite,</p>
    <p style="margin:0;">L'équipe Sillage Immo</p>
  `;
  const html = renderEmailLayout({
    preheader,
    eyebrow: "Estimation immobilière",
    title: "Votre code de vérification",
    bodyHtml,
    footerHtml,
  });
  const text = [
    "Bonjour,",
    "",
    "Voici votre code pour sécuriser l'envoi de votre estimation Sillage Immo :",
    "",
    `    ${code}`,
    "",
    "Ce code expire dans 10 minutes.",
    "Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer ce message.",
    "",
    "À très vite,",
    "L'équipe Sillage Immo",
  ].join("\n");

  return {
    to: email,
    subject,
    text,
    html,
  };
};

const buildPortalAccessEmailPayload = (
  email: string,
  accessLink: string,
  context: "invite" | "login"
): EmailPayload => {
  const isInvite = context === "invite";

  const subject = isInvite
    ? "Votre espace Sillage est prêt"
    : "Votre lien sécurisé Sillage";

  const preheader = isInvite
    ? "Activez votre espace Sillage sécurisé, sans mot de passe à retenir."
    : "Accédez à votre espace Sillage depuis un lien sécurisé.";

  const eyebrow = isInvite ? "Espace Sillage" : "Connexion sécurisée";

  const title = isInvite
    ? "Votre espace Sillage est prêt"
    : "Votre lien sécurisé Sillage";

  const bodyHtml = isInvite
    ? `
      <p style="margin:0 0 14px;">Bonjour,</p>
      <p style="margin:0 0 14px;">
        Votre espace Sillage est prêt. Vous y retrouverez votre projet, les échanges avec votre conseiller, vos documents et l'avancée de chaque étape.
      </p>
      <p style="margin:0 0 6px;">
        Pas de mot de passe à retenir : un simple clic sur le bouton ci-dessous active votre accès.
      </p>
    `
    : `
      <p style="margin:0 0 14px;">Bonjour,</p>
      <p style="margin:0 0 14px;">
        Voici votre lien sécurisé pour accéder à votre espace Sillage.
      </p>
      <p style="margin:0 0 6px;">
        Vous y retrouvez vos projets, vos recherches et les biens suivis par votre conseiller, sans mot de passe à retenir.
      </p>
    `;

  const ctaLabel = isInvite
    ? "Activer mon espace Sillage"
    : "Accéder à mon espace Sillage";

  const fallbackIntro = "Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :";
  const expirationNote = "Ce lien est personnel et expire automatiquement.";

  const footerHtml = `
    <p style="margin:0 0 4px;">À bientôt,</p>
    <p style="margin:0;">L'équipe Sillage Immo</p>
  `;

  const html = renderEmailLayout({
    preheader,
    eyebrow,
    title,
    bodyHtml,
    cta: { label: ctaLabel, href: accessLink },
    fallbackLink: {
      intro: fallbackIntro,
      href: accessLink,
      expirationNote,
    },
    footerHtml,
  });

  const introText = isInvite
    ? "Votre espace Sillage est prêt. Vous y retrouverez votre projet, les échanges avec votre conseiller, vos documents et l'avancée de chaque étape. Pas de mot de passe à retenir : un simple clic active votre accès."
    : "Voici votre lien sécurisé pour accéder à votre espace Sillage. Vous y retrouvez vos projets, vos recherches et les biens suivis par votre conseiller, sans mot de passe à retenir.";

  const text = [
    "Bonjour,",
    "",
    introText,
    "",
    `${ctaLabel} :`,
    accessLink,
    "",
    expirationNote,
    "",
    "À bientôt,",
    "L'équipe Sillage Immo",
  ].join("\n");

  return {
    to: email,
    subject,
    text,
    html,
  };
};

const sendWithResend = async (payload: EmailPayload) => {
  if (!isResendConfigured()) {
    return { sent: false as const, reason: "resend_not_configured" as const };
  }

  const fromEmail = getFromEmail();
  if (!fromEmail) {
    return { sent: false as const, reason: "email_from_not_configured" as const };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: `${getFromName()} <${fromEmail}>`,
    ...payload,
  });

  if (error) {
    throw new Error(`Resend email failed: ${error.message}`);
  }

  return { sent: true as const, provider: "resend" as const };
};

export const sendOtpEmail = async (email: string, code: string) => {
  const payload = buildOtpEmailPayload(email, code);
  if (isResendConfigured()) {
    return sendWithResend(payload);
  }

  const transporter = getTransporter();
  if (!transporter) {
    return { sent: false as const, reason: "email_not_configured" as const };
  }

  const fromEmail = getFromEmail();
  if (!fromEmail) {
    return { sent: false as const, reason: "email_from_not_configured" as const };
  }

  await transporter.sendMail({
    from: `${getFromName()} <${fromEmail}>`,
    ...payload,
  });

  return { sent: true as const, provider: "smtp" as const };
};

export const sendTransactionalEmail = async (payload: EmailPayload) => {
  if (isResendConfigured()) {
    return sendWithResend(payload);
  }

  const transporter = getTransporter();
  if (!transporter) {
    return { sent: false as const, reason: "email_not_configured" as const };
  }

  const fromEmail = getFromEmail();
  if (!fromEmail) {
    return { sent: false as const, reason: "email_from_not_configured" as const };
  }

  await transporter.sendMail({
    from: `${getFromName()} <${fromEmail}>`,
    ...payload,
  });

  return { sent: true as const, provider: "smtp" as const };
};

export const sendClientPortalAccessEmail = async (input: {
  email: string;
  accessLink: string;
  context: "invite" | "login";
}) => {
  const payload = buildPortalAccessEmailPayload(input.email, input.accessLink, input.context);

  if (isResendConfigured()) {
    return sendWithResend(payload);
  }

  const transporter = getTransporter();
  if (!transporter) {
    return { sent: false as const, reason: "email_not_configured" as const };
  }

  const fromEmail = getFromEmail();
  if (!fromEmail) {
    return { sent: false as const, reason: "email_from_not_configured" as const };
  }

  await transporter.sendMail({
    from: `${getFromName()} <${fromEmail}>`,
    ...payload,
  });

  return { sent: true as const, provider: "smtp" as const };
};
