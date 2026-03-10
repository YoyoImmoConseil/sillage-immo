import { randomInt } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { hashValue } from "@/lib/audit/hash";
import { sendOtpEmail } from "@/lib/email/smtp";
import type { Database } from "@/types/db/supabase";

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
type SellerEmailVerificationRow = Database["public"]["Tables"]["seller_email_verifications"]["Row"];

const generateOtp = () => String(randomInt(100000, 999999));

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const startSellerEmailVerification = async (email: string) => {
  const normalizedEmail = normalizeEmail(email);
  const code = generateOtp();
  const codeHash = hashValue(code);
  const verificationToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();

  const { error } = await supabaseAdmin.from("seller_email_verifications").insert({
    email: normalizedEmail,
    code_hash: codeHash,
    verification_token: verificationToken,
    expires_at: expiresAt,
  });

  if (error) {
    throw new Error(error.message);
  }

  const mailResult = await sendOtpEmail(normalizedEmail, code);
  const previewCode =
    mailResult.sent || process.env.NODE_ENV === "production" ? null : code;

  return {
    sent: mailResult.sent,
    expiresAt,
    previewCode,
  };
};

export const verifySellerEmailOtp = async (email: string, code: string) => {
  const normalizedEmail = normalizeEmail(email);
  const codeHash = hashValue(code.trim());

  const { data: verification, error: readError } = await supabaseAdmin
    .from("seller_email_verifications")
    .select("*")
    .eq("email", normalizedEmail)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (readError || !verification) {
    throw new Error("Aucune verification en cours pour cet email.");
  }
  const verificationRow = verification as SellerEmailVerificationRow;

  if (verificationRow.verified_at) {
    return {
      verificationToken: verificationRow.verification_token,
      email: normalizedEmail,
    };
  }

  const isExpired = new Date(verificationRow.expires_at).getTime() < Date.now();
  if (isExpired) {
    throw new Error("Le code est expire. Merci de demander un nouveau code.");
  }

  if (verificationRow.attempts >= MAX_ATTEMPTS) {
    throw new Error("Nombre maximal de tentatives atteint. Demandez un nouveau code.");
  }

  if (verificationRow.code_hash !== codeHash) {
    await supabaseAdmin
      .from("seller_email_verifications")
      .update({ attempts: verificationRow.attempts + 1 })
      .eq("id", verificationRow.id);
    throw new Error("Code de verification incorrect.");
  }

  const { error: updateError } = await supabaseAdmin
    .from("seller_email_verifications")
    .update({ verified_at: new Date().toISOString() })
    .eq("id", verificationRow.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return {
    verificationToken: verificationRow.verification_token,
    email: normalizedEmail,
  };
};

export const consumeSellerEmailVerificationToken = async (
  email: string,
  verificationToken: string
) => {
  const normalizedEmail = normalizeEmail(email);
  const { data: verification, error } = await supabaseAdmin
    .from("seller_email_verifications")
    .select("*")
    .eq("email", normalizedEmail)
    .eq("verification_token", verificationToken)
    .is("consumed_at", null)
    .maybeSingle();

  if (error || !verification) {
    throw new Error("Token de verification invalide.");
  }
  const verificationRow = verification as SellerEmailVerificationRow;

  if (!verificationRow.verified_at) {
    throw new Error("Email non verifie.");
  }

  if (new Date(verificationRow.expires_at).getTime() < Date.now()) {
    throw new Error("Verification expiree.");
  }

  const { error: consumeError } = await supabaseAdmin
    .from("seller_email_verifications")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", verificationRow.id);

  if (consumeError) {
    throw new Error(consumeError.message);
  }
};
