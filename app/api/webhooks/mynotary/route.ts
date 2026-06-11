import { createWebhookHandler } from "@/lib/ingestion/webhook-handler";
import { myNotaryWebhookSource } from "@/services/ingestion/sources/mynotary.source";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = createWebhookHandler(myNotaryWebhookSource);
