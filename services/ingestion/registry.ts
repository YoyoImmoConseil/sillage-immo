import "server-only";
import type { SyncWebhookSource } from "@/lib/ingestion/webhook-handler";
import { sweepBrightZapierWebhookSource } from "@/services/ingestion/sources/sweepbright-zapier.source";

/**
 * Sources "sync" rejouées par le cron /api/internal/cron/webhook-deliveries.
 *
 * MyNotary n'est plus une source du rail : son webhook a sa propre boîte
 * de réception (`mynotary_events`, cf. services/mynotary/event-inbox.service.ts)
 * avec déduplication par en-tête et traitement ordonné par date d'événement.
 *
 * SweepBright (mode async) n'apparaît pas ici : ses livraisons sont
 * rejouées par son cron dédié /api/internal/cron/sweepbright-sync, dont le
 * processeur gère lui-même les statuts (fenêtre d'expiration, etc.).
 *
 * Brancher une nouvelle source = créer services/ingestion/sources/<x>.source.ts
 * (auth + schéma + processeur), l'ajouter ici, et exposer la route :
 *   export const POST = createWebhookHandler(<x>WebhookSource);
 */
export const syncWebhookSources: SyncWebhookSource[] = [
  sweepBrightZapierWebhookSource,
];
