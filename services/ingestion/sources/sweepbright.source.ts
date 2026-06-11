import "server-only";
import { NextResponse } from "next/server";
import type { AsyncWebhookSource } from "@/lib/ingestion/webhook-handler";
import { processSweepBrightDelivery } from "@/services/properties/sweepbright-sync.service";
import {
  buildSweepBrightWebhookEventKey,
  parseSweepBrightWebhookPayload,
  verifySweepBrightWebhookSignature,
} from "@/services/properties/sweepbright-webhook.service";

/**
 * Source SweepBright (webhook CRM direct).
 *
 * Mode async : le payload n'est qu'une notification (estate_id + event) ;
 * le traitement lourd (fetch estate, projection, médias, matching) tourne
 * via after() et est repris par le cron sweepbright-sync en cas d'échec.
 *
 * Les réponses HTTP reproduisent exactement le comportement historique de
 * app/api/webhooks/sweepbright/route.ts (mapping statut par message).
 */

const errorResponse = (error: unknown) => {
  const message =
    error instanceof Error ? error.message : "SweepBright webhook processing failed.";
  const status =
    message.includes("signature") || message.includes("Missing SweepBright webhook signature")
      ? 401
      : message.includes("Invalid SweepBright webhook")
        ? 400
        : 500;

  return NextResponse.json({ ok: false, message }, { status });
};

export const sweepBrightWebhookSource: AsyncWebhookSource = {
  provider: "sweepbright",
  mode: "async",

  authenticate: (request, rawBody) => {
    try {
      verifySweepBrightWebhookSignature({
        rawBody,
        signature: request.headers.get("x-hook-signature"),
      });
      return { ok: true };
    } catch (error) {
      return { ok: false, response: errorResponse(error) };
    }
  },

  parse: (rawBody, request) => {
    try {
      const payload = parseSweepBrightWebhookPayload(rawBody);
      return {
        ok: true,
        eventName: payload.event,
        eventKey: buildSweepBrightWebhookEventKey({ rawBody, payload }),
        payload: payload as unknown as Record<string, unknown>,
        signature: request.headers.get("x-hook-signature"),
        estateId: payload.estate_id,
        companyId: payload.company_id,
      };
    } catch (error) {
      return { ok: false, response: errorResponse(error) };
    }
  },

  processAsync: processSweepBrightDelivery,

  respondAccepted: (delivery) =>
    NextResponse.json({
      ok: true,
      data: { deliveryId: delivery.id, duplicate: false, accepted: true },
    }),

  respondDuplicate: (delivery) =>
    NextResponse.json({
      ok: true,
      data: { deliveryId: delivery.id, duplicate: true, accepted: true },
    }),

  respondError: errorResponse,
};
