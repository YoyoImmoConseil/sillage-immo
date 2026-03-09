import { NextResponse } from "next/server";
import { startSellerEmailVerification } from "@/services/sellers/seller-email-verification.service";

export const POST = async (request: Request) => {
  let body: { email?: string } | null = null;
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    return NextResponse.json({ ok: false, message: "Corps JSON invalide." }, { status: 400 });
  }

  const email = body?.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ ok: false, message: "Email invalide." }, { status: 422 });
  }

  try {
    const result = await startSellerEmailVerification(email);
    return NextResponse.json({
      ok: true,
      sent: result.sent,
      expiresAt: result.expiresAt,
      previewCode: result.previewCode,
    });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : "Impossible d'envoyer le code.";
    const message = rawMessage.includes("seller_email_verifications")
      ? "La table de verification email n'est pas installee. Execute la migration 20260305_007_create_seller_email_verifications.sql."
      : rawMessage;
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
};
