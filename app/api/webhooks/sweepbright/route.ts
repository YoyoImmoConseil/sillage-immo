import { NextResponse } from "next/server";
import { processSweepBrightDelivery } from "@/services/properties/sweepbright-sync.service";
import {
  parseSweepBrightWebhookPayload,
  registerSweepBrightWebhookDelivery,
  verifySweepBrightWebhookSignature,
} from "@/services/properties/sweepbright-webhook.service";

export const POST = async (request: Request) => {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hook-signature");

  try {
    verifySweepBrightWebhookSignature({ rawBody, signature });
    const payload = parseSweepBrightWebhookPayload(rawBody);
    const result = await registerSweepBrightWebhookDelivery({ payload, rawBody, signature });
    let processed = false;

    if (!result.duplicate) {
      try {
        await processSweepBrightDelivery(result.delivery.id);
        processed = true;
      } catch {
        processed = false;
      }
    }

    return NextResponse.json({
      ok: true,
      data: {
        deliveryId: result.delivery.id,
        duplicate: result.duplicate,
        processed,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "SweepBright webhook processing failed.";
    const status =
      message.includes("signature") || message.includes("Missing SweepBright webhook signature")
        ? 401
        : message.includes("Invalid SweepBright webhook")
          ? 400
          : 500;

    return NextResponse.json({ ok: false, message }, { status });
  }
};
