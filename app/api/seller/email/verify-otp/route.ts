import { NextResponse } from "next/server";
import { verifySellerEmailOtp } from "@/services/sellers/seller-email-verification.service";

export const POST = async (request: Request) => {
  let body: { email?: string; code?: string } | null = null;
  try {
    body = (await request.json()) as { email?: string; code?: string };
  } catch {
    return NextResponse.json({ ok: false, message: "Corps JSON invalide." }, { status: 400 });
  }

  const email = body?.email?.trim().toLowerCase();
  const code = body?.code?.trim();

  if (!email || !code) {
    return NextResponse.json(
      { ok: false, message: "Email et code sont requis." },
      { status: 422 }
    );
  }

  try {
    const verification = await verifySellerEmailOtp(email, code);
    return NextResponse.json({ ok: true, data: verification });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Verification email impossible.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
};
