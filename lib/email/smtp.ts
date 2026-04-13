import "server-only";
import nodemailer from "nodemailer";
import { Resend } from "resend";

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
  return {
    to: email,
    subject: "Code de verification Sillage Immo",
    text: `Votre code de verification est: ${code}. Il expire dans 10 minutes.`,
    html: `<p>Votre code de verification est:</p><p style="font-size:24px;font-weight:700;letter-spacing:4px;">${code}</p><p>Ce code expire dans 10 minutes.</p>`,
  };
};

const buildPortalAccessEmailPayload = (
  email: string,
  accessLink: string,
  context: "invite" | "login"
): EmailPayload => {
  const subject =
    context === "invite"
      ? "Activez votre espace client Sillage Immo"
      : "Votre lien de connexion Sillage Immo";
  const intro =
    context === "invite"
      ? "Votre espace client Sillage Immo est pret. Cliquez sur le bouton ci-dessous pour l'activer."
      : "Cliquez sur le bouton ci-dessous pour vous connecter a votre espace client Sillage Immo.";

  return {
    to: email,
    subject,
    text: `${intro}\n\n${accessLink}\n\nCe lien est personnel et expire automatiquement.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#141446;">
        <p>Bonjour,</p>
        <p>${intro}</p>
        <p style="margin:24px 0;">
          <a
            href="${accessLink}"
            style="display:inline-block;padding:12px 20px;background:#141446;color:#f4ece4;text-decoration:none;border-radius:8px;font-weight:600;"
          >
            Acceder a mon espace client
          </a>
        </p>
        <p>Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :</p>
        <p><a href="${accessLink}">${accessLink}</a></p>
        <p style="color:#5b5b78;font-size:13px;">Ce lien est personnel et expire automatiquement.</p>
        <p>L'equipe Sillage Immo</p>
      </div>
    `,
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
