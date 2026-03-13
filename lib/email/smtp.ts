import "server-only";
import nodemailer from "nodemailer";
import { Resend } from "resend";

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

const buildOtpEmailPayload = (email: string, code: string) => {
  return {
    to: email,
    subject: "Code de verification Sillage Immo",
    text: `Votre code de verification est: ${code}. Il expire dans 10 minutes.`,
    html: `<p>Votre code de verification est:</p><p style="font-size:24px;font-weight:700;letter-spacing:4px;">${code}</p><p>Ce code expire dans 10 minutes.</p>`,
  };
};

const sendWithResend = async (email: string, code: string) => {
  if (!isResendConfigured()) {
    return { sent: false as const, reason: "resend_not_configured" as const };
  }

  const fromEmail = getFromEmail();
  if (!fromEmail) {
    return { sent: false as const, reason: "email_from_not_configured" as const };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const payload = buildOtpEmailPayload(email, code);
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
  if (isResendConfigured()) {
    return sendWithResend(email, code);
  }

  const transporter = getTransporter();
  if (!transporter) {
    return { sent: false as const, reason: "email_not_configured" as const };
  }

  const fromEmail = getFromEmail();
  if (!fromEmail) {
    return { sent: false as const, reason: "email_from_not_configured" as const };
  }

  const payload = buildOtpEmailPayload(email, code);

  await transporter.sendMail({
    from: `${getFromName()} <${fromEmail}>`,
    ...payload,
  });

  return { sent: true as const, provider: "smtp" as const };
};
