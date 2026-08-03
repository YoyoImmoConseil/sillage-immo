import { createWebhookHandler } from "@/lib/ingestion/webhook-handler";
import { sweepBrightOffersWebhookSource } from "@/services/ingestion/sources/sweepbright-offers.source";

export const runtime = "nodejs";

export const POST = createWebhookHandler(sweepBrightOffersWebhookSource);
