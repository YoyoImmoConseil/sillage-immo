import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Database } from "@/types/db/supabase";

/**
 * Rail d'ingestion — file de livraison persistée.
 *
 * Toutes les sources webhook (SweepBright, Zapier, MyNotary, futures)
 * partagent la table `crm_webhook_deliveries` :
 *   - idempotence garantie par UNIQUE(provider, event_key) ;
 *   - statuts `received → processing → processed | failed | ignored` ;
 *   - retry plafonné (cohérent avec l'outbox domain_events) ;
 *   - réponse HTTP persistée (`response_status` / `response_payload`)
 *     pour pouvoir rejouer la même réponse sur un doublon.
 */

export type WebhookDeliveryRow =
  Database["public"]["Tables"]["crm_webhook_deliveries"]["Row"];

type DeliveryUpdate =
  Database["public"]["Tables"]["crm_webhook_deliveries"]["Update"];

/** Même plafond que l'outbox domain_events (MAX_ATTEMPTS = 5). */
export const WEBHOOK_DELIVERY_MAX_ATTEMPTS = 5;

const POSTGRES_UNIQUE_VIOLATION = "23505";

export type RegisterWebhookDeliveryInput = {
  provider: string;
  eventName: string;
  /** Clé d'idempotence, stable pour un même événement logique. */
  eventKey: string;
  payload: Record<string, unknown>;
  signature?: string | null;
  estateId?: string | null;
  companyId?: string | null;
};

export type RegisterWebhookDeliveryResult =
  | { duplicate: false; delivery: WebhookDeliveryRow }
  | { duplicate: true; delivery: WebhookDeliveryRow };

/**
 * Enregistre une livraison. Race-safe : on tente l'insert d'abord et on
 * laisse la contrainte UNIQUE détecter le doublon (pas de fenêtre
 * select-then-insert).
 */
export const registerWebhookDelivery = async (
  input: RegisterWebhookDeliveryInput
): Promise<RegisterWebhookDeliveryResult> => {
  const { data, error } = await supabaseAdmin
    .from("crm_webhook_deliveries")
    .insert({
      provider: input.provider,
      event_name: input.eventName,
      event_key: input.eventKey,
      estate_id: input.estateId ?? null,
      company_id: input.companyId ?? null,
      payload: input.payload,
      signature: input.signature ?? null,
      status: "received",
    })
    .select("*")
    .single();

  if (!error && data) {
    return { duplicate: false, delivery: data as WebhookDeliveryRow };
  }

  if (error && error.code === POSTGRES_UNIQUE_VIOLATION) {
    const { data: existing, error: readError } = await supabaseAdmin
      .from("crm_webhook_deliveries")
      .select("*")
      .eq("provider", input.provider)
      .eq("event_key", input.eventKey)
      .single();

    if (readError || !existing) {
      throw new Error(
        readError?.message ?? "Unable to load duplicate webhook delivery."
      );
    }
    return { duplicate: true, delivery: existing as WebhookDeliveryRow };
  }

  throw new Error(error?.message ?? "Unable to register webhook delivery.");
};

const updateDelivery = async (deliveryId: string, values: DeliveryUpdate) => {
  const { error } = await supabaseAdmin
    .from("crm_webhook_deliveries")
    .update(values)
    .eq("id", deliveryId);
  if (error) {
    throw new Error(error.message);
  }
};

export const markDeliveryProcessing = async (
  deliveryId: string,
  currentAttempts: number
) => {
  await updateDelivery(deliveryId, {
    status: "processing",
    attempts: currentAttempts + 1,
  });
};

export const markDeliveryProcessed = async (
  deliveryId: string,
  response?: { status: number; payload: Record<string, unknown> }
) => {
  await updateDelivery(deliveryId, {
    status: "processed",
    processed_at: new Date().toISOString(),
    last_error: null,
    ...(response
      ? { response_status: response.status, response_payload: response.payload }
      : {}),
  });
};

export const markDeliveryIgnored = async (
  deliveryId: string,
  reason: string,
  response?: { status: number; payload: Record<string, unknown> }
) => {
  await updateDelivery(deliveryId, {
    status: "ignored",
    processed_at: new Date().toISOString(),
    last_error: reason,
    ...(response
      ? { response_status: response.status, response_payload: response.payload }
      : {}),
  });
};

export const markDeliveryFailed = async (deliveryId: string, message: string) => {
  await updateDelivery(deliveryId, {
    status: "failed",
    last_error: message.slice(0, 500),
  });
};

export const getWebhookDelivery = async (
  deliveryId: string
): Promise<WebhookDeliveryRow> => {
  const { data, error } = await supabaseAdmin
    .from("crm_webhook_deliveries")
    .select("*")
    .eq("id", deliveryId)
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message ?? "Webhook delivery not found.");
  }
  return data as WebhookDeliveryRow;
};

export type ProcessPendingDeliveriesResult = {
  scanned: number;
  processed: number;
  failed: number;
  ignored: number;
};

/**
 * Boucle de retry générique : rejoue les livraisons `received` / `failed`
 * d'un provider, plus anciennes d'abord, tant que attempts < maxAttempts.
 * Le `handler` est le processeur de la source ; il doit être idempotent.
 */
export const processPendingWebhookDeliveries = async (input: {
  provider: string;
  handler: (delivery: WebhookDeliveryRow) => Promise<unknown>;
  limit?: number;
  maxAttempts?: number;
}): Promise<ProcessPendingDeliveriesResult> => {
  const limit = input.limit ?? 10;
  const safeLimit = Number.isFinite(limit)
    ? Math.min(Math.max(Math.trunc(limit), 1), 100)
    : 10;
  const maxAttempts = input.maxAttempts ?? WEBHOOK_DELIVERY_MAX_ATTEMPTS;

  const { data, error } = await supabaseAdmin
    .from("crm_webhook_deliveries")
    .select("*")
    .eq("provider", input.provider)
    .in("status", ["received", "failed"])
    .lt("attempts", maxAttempts)
    .order("created_at", { ascending: true })
    .limit(safeLimit);

  if (error) {
    throw new Error(error.message);
  }

  const deliveries = (data ?? []) as WebhookDeliveryRow[];
  const result: ProcessPendingDeliveriesResult = {
    scanned: deliveries.length,
    processed: 0,
    failed: 0,
    ignored: 0,
  };

  for (const delivery of deliveries) {
    await markDeliveryProcessing(delivery.id, delivery.attempts ?? 0);
    try {
      await input.handler(delivery);
      const refreshed = await getWebhookDelivery(delivery.id);
      // Le handler peut lui-même poser `ignored` (ex. donnée non rattachable)
      // ou `failed` partiel ; on ne réécrit pas son verdict.
      if (refreshed.status === "ignored") {
        result.ignored += 1;
      } else if (refreshed.status === "failed") {
        result.failed += 1;
      } else {
        if (refreshed.status === "processing") {
          await markDeliveryProcessed(delivery.id);
        }
        result.processed += 1;
      }
    } catch (handlerError) {
      const message =
        handlerError instanceof Error
          ? handlerError.message
          : "Webhook delivery processing failed.";
      await markDeliveryFailed(delivery.id, message);
      result.failed += 1;
    }
  }

  return result;
};

export const getWebhookDeliveryStats = async (provider: string) => {
  const countByStatus = async (status: WebhookDeliveryRow["status"]) => {
    const { count, error } = await supabaseAdmin
      .from("crm_webhook_deliveries")
      .select("id", { count: "exact", head: true })
      .eq("provider", provider)
      .eq("status", status);
    if (error) {
      throw new Error(error.message);
    }
    return count ?? 0;
  };

  const [received, processing, processed, failed, ignored] = await Promise.all([
    countByStatus("received"),
    countByStatus("processing"),
    countByStatus("processed"),
    countByStatus("failed"),
    countByStatus("ignored"),
  ]);

  return { received, processing, processed, failed, ignored };
};
