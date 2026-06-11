import { NextResponse } from "next/server";
import { isInternalRequest } from "@/lib/admin/auth";
import {
  getWebhookDeliveryStats,
  processPendingWebhookDeliveries,
} from "@/lib/ingestion/delivery-queue";
import { runSyncProcessor } from "@/lib/ingestion/webhook-handler";
import { syncWebhookSources } from "@/services/ingestion/registry";

// Rejoue les livraisons webhook `received` / `failed` des sources "sync"
// (Zapier, MyNotary, …), avec plafond d'attempts aligné sur l'outbox
// domain_events. SweepBright garde son cron dédié (sweepbright-sync).

const jsonError = (status: number, message: string) => {
  return NextResponse.json({ ok: false, message }, { status });
};

export const GET = async (request: Request) => {
  if (!(await isInternalRequest(request))) {
    return jsonError(401, "Unauthorized.");
  }

  const limitRaw = new URL(request.url).searchParams.get("limit");
  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : 10;

  try {
    const data: Record<string, unknown> = {};
    for (const source of syncWebhookSources) {
      const result = await processPendingWebhookDeliveries({
        provider: source.provider,
        handler: (delivery) => runSyncProcessor(source, delivery),
        limit,
      });
      const stats = await getWebhookDeliveryStats(source.provider);
      data[source.provider] = { ...result, stats };
    }
    return NextResponse.json({ ok: true, mode: "cron", data });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Webhook deliveries cron processing failed.";
    return jsonError(500, message);
  }
};
