import { after, NextResponse } from "next/server";
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

    if (!result.duplicate) {
      after(async () => {
        try {
          await processSweepBrightDelivery(result.delivery.id);
        } catch {
          // processing state is persisted in the delivery queue
        }
      });
    }

    return NextResponse.json({
      ok: true,
      data: {
        deliveryId: result.delivery.id,
        duplicate: result.duplicate,
        accepted: true,
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
