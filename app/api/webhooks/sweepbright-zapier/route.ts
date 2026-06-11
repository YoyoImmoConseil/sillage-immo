import { createWebhookHandler } from "@/lib/ingestion/webhook-handler";
import { sweepBrightZapierWebhookSource } from "@/services/ingestion/sources/sweepbright-zapier.source";

export const runtime = "nodejs";

export const POST = createWebhookHandler(sweepBrightZapierWebhookSource);
