import "server-only";
import nodemailer from "nodemailer";

const isEmailConfigured = () => {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.SMTP_FROM_EMAIL
  );
};

const getTransporter = () => {
  if (!isEmailConfigured()) return null;

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

export const sendOtpEmail = async (email: string, code: string) => {
  const transporter = getTransporter();
  if (!transporter) {
    return { sent: false as const, reason: "smtp_not_configured" as const };
  }

  const fromName = process.env.SMTP_FROM_NAME || "Sillage Immo";
  const fromEmail = process.env.SMTP_FROM_EMAIL as string;

  await transporter.sendMail({
    from: `${fromName} <${fromEmail}>`,
    to: email,
    subject: "Code de verification Sillage Immo",
    text: `Votre code de verification est: ${code}. Il expire dans 10 minutes.`,
    html: `<p>Votre code de verification est:</p><p style="font-size:24px;font-weight:700;letter-spacing:4px;">${code}</p><p>Ce code expire dans 10 minutes.</p>`,
  });

  return { sent: true as const };
};
