import { NextResponse } from "next/server";
import { verifySellerEmailOtp } from "@/services/sellers/seller-email-verification.service";
import {
  checkIdempotency,
  persistIdempotencyResponse,
} from "@/lib/idempotency/request-idempotency";
import type { SellerApiErrorResponse, SellerVerifyOtpSuccessResponse } from "@/types/api/seller";

export const POST = async (request: Request) => {
  const idempotencyKey = request.headers.get("idempotency-key") ?? "";
  if (idempotencyKey.trim().length > 0) {
    try {
      const idempotency = await checkIdempotency("seller.email.verify_otp", idempotencyKey);
      if (idempotency.kind === "replay") {
        return NextResponse.json(idempotency.payload, {
          status: idempotency.statusCode,
          headers: { "x-idempotent-replay": "true" },
        });
      }
      if (idempotency.kind === "in_progress") {
        return NextResponse.json(
          { ok: false, message: "Une requete identique est deja en cours." },
          { status: 409 }
        );
      }
    } catch {
      // no-op: idempotency is best-effort if table is not migrated yet
    }
  }

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
    const payload: SellerVerifyOtpSuccessResponse = { ok: true, data: verification };
    if (idempotencyKey.trim().length > 0) {
      try {
        await persistIdempotencyResponse("seller.email.verify_otp", idempotencyKey, 200, payload);
      } catch {
        // no-op
      }
    }
    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Verification email impossible.";
    const payload: SellerApiErrorResponse = { ok: false, message };
    if (idempotencyKey.trim().length > 0) {
      try {
        await persistIdempotencyResponse("seller.email.verify_otp", idempotencyKey, 400, payload);
      } catch {
        // no-op
      }
    }
    return NextResponse.json(payload, { status: 400 });
  }
};
