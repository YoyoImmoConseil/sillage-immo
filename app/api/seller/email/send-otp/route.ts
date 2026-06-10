import { NextResponse } from "next/server";
import { startSellerEmailVerification } from "@/services/sellers/seller-email-verification.service";
import {
  checkIdempotency,
  persistIdempotencyResponse,
} from "@/lib/idempotency/request-idempotency";
import {
  checkPersistentRateLimit,
  extractClientIp,
  rateLimitResponseBody,
} from "@/lib/rate-limit/persistent";
import type { SellerApiErrorResponse, SellerSendOtpSuccessResponse } from "@/types/api/seller";

export const POST = async (request: Request) => {
  const idempotencyKey = request.headers.get("idempotency-key") ?? "";
  if (idempotencyKey.trim().length > 0) {
    try {
      const idempotency = await checkIdempotency("seller.email.send_otp", idempotencyKey);
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

  const clientIp = extractClientIp(request.headers);
  const [ipLimit, emailLimit] = await Promise.all([
    checkPersistentRateLimit({ key: `seller-otp-send:ip:${clientIp}`, limit: 10, windowSeconds: 600 }),
    checkPersistentRateLimit({ key: `seller-otp-send:email:${email}`, limit: 3, windowSeconds: 600 }),
  ]);
  if (!ipLimit.ok || !emailLimit.ok) {
    return NextResponse.json(rateLimitResponseBody, { status: 429 });
  }

  try {
    const result = await startSellerEmailVerification(email);
    const payload: SellerSendOtpSuccessResponse = {
      ok: true,
      data: {
        sent: result.sent,
        expiresAt: result.expiresAt,
        previewCode: result.previewCode,
      },
    };
    if (idempotencyKey.trim().length > 0) {
      try {
        await persistIdempotencyResponse("seller.email.send_otp", idempotencyKey, 200, payload);
      } catch {
        // no-op
      }
    }
    return NextResponse.json(payload);
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : "Impossible d'envoyer le code.";
    const message = rawMessage.includes("seller_email_verifications")
      ? "La table de verification email n'est pas installee. Execute la migration 20260305_007_create_seller_email_verifications.sql."
      : rawMessage;
    const payload: SellerApiErrorResponse = { ok: false, message };
    if (idempotencyKey.trim().length > 0) {
      try {
        await persistIdempotencyResponse("seller.email.send_otp", idempotencyKey, 500, payload);
      } catch {
        // no-op
      }
    }
    return NextResponse.json(payload, { status: 500 });
  }
};
