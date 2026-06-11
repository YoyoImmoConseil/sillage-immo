import { createWebhookHandler } from "@/lib/ingestion/webhook-handler";
import { sweepBrightWebhookSource } from "@/services/ingestion/sources/sweepbright.source";

export const POST = createWebhookHandler(sweepBrightWebhookSource);
