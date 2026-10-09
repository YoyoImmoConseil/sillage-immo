import type { MyNotaryEventType, MyNotaryWebhookEnvelope } from "./types";

/**
 * Lecture d'un webhook MyNotary — fonction pure (testable sans base).
 *
 * Format réel (spec dev.mynotary.fr, « Webhooks ») : le corps est le
 * payload à plat, et `eventId` y contient le TYPE d'événement
 * (`"signature_completed"`, …), pas un identifiant. L'identifiant unique
 * et la date de l'événement voyagent dans deux en-têtes :
 *   - `x-mynotary-event-id`            → déduplication (UNIQUE en base) ;
 *   - `x-mynotary-event-creation-time` → ordre de traitement (les
 *     événements n'arrivent pas dans l'ordre).
 *
 * L'ancien handler attendait `{ event, data }` et prenait `eventId` pour
 * un identifiant : tout webhook réel recevait un 400. On tolère encore
 * l'ancienne forme pour les rejeux et les tests, mais la source de
 * vérité est le format à plat.
 */

export const MYNOTARY_EVENT_TYPES: ReadonlySet<string> = new Set<MyNotaryEventType>([
  "signature_created",
  "signature_cancel",
  "signature_completed",
  "operation_created",
  "operation_deleted",
  "operation_merged",
  "contract_created",
  "contract_validated",
  "contract_deleted",
  "register_letter_created",
  "register_letter_cancel",
  "register_letter_completed",
  "legal_record_deleted",
]);

export const MYNOTARY_EVENT_ID_HEADER = "x-mynotary-event-id";
export const MYNOTARY_EVENT_TIME_HEADER = "x-mynotary-event-creation-time";

export type ParsedMyNotaryWebhook = {
  /** Type d'événement (signature_completed, …). */
  eventType: MyNotaryEventType;
  /** Identifiant unique MyNotary (en-tête), ou repli dérivé du corps. */
  eventId: string;
  /** True quand l'identifiant vient bien de l'en-tête MyNotary. */
  eventIdFromHeader: boolean;
  /** Date de l'événement (ISO) d'après l'en-tête, null si absente/invalide. */
  eventCreatedAt: string | null;
  /** Enveloppe normalisée `{ event, data }` consommée par le traitement. */
  envelope: MyNotaryWebhookEnvelope;
  /** Corps brut tel que reçu (journal). */
  raw: Record<string, unknown>;
};

export type ParseMyNotaryWebhookResult =
  | { ok: true; value: ParsedMyNotaryWebhook }
  | { ok: false; code: "invalid_json" | "invalid_payload" };

type HeaderReader = { get(name: string): string | null };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readEventType = (body: Record<string, unknown>): MyNotaryEventType | null => {
  // Format spec : `eventId` porte le type.
  const fromEventId = body.eventId;
  if (typeof fromEventId === "string" && MYNOTARY_EVENT_TYPES.has(fromEventId)) {
    return fromEventId as MyNotaryEventType;
  }
  // Ancienne forme `{ event, data }`.
  const fromEvent = body.event;
  if (typeof fromEvent === "string" && MYNOTARY_EVENT_TYPES.has(fromEvent)) {
    return fromEvent as MyNotaryEventType;
  }
  return null;
};

const readEventTime = (headers: HeaderReader): string | null => {
  const raw = headers.get(MYNOTARY_EVENT_TIME_HEADER)?.trim() ?? "";
  if (!raw) return null;
  const asDate = new Date(raw);
  if (Number.isNaN(asDate.getTime())) return null;
  return asDate.toISOString();
};

export const parseMyNotaryWebhook = (
  rawBody: string,
  headers: HeaderReader,
  options: { fallbackEventId: (rawBody: string) => string }
): ParseMyNotaryWebhookResult => {
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return { ok: false, code: "invalid_json" };
  }
  if (!isRecord(body)) {
    return { ok: false, code: "invalid_payload" };
  }

  const eventType = readEventType(body);
  if (!eventType) {
    return { ok: false, code: "invalid_payload" };
  }

  // Données : le corps à plat (format spec) ou `data` (ancienne forme).
  const data = isRecord(body.data) ? body.data : body;

  const headerId = headers.get(MYNOTARY_EVENT_ID_HEADER)?.trim() ?? "";
  const eventIdFromHeader = headerId.length > 0;
  const eventId = eventIdFromHeader ? headerId : options.fallbackEventId(rawBody);

  const envelope: MyNotaryWebhookEnvelope = {
    event: eventType,
    eventId: eventType,
    organizationId:
      typeof data.organizationId === "number" || typeof data.organizationId === "string"
        ? data.organizationId
        : undefined,
    data,
  };

  return {
    ok: true,
    value: {
      eventType,
      eventId,
      eventIdFromHeader,
      eventCreatedAt: readEventTime(headers),
      envelope,
      raw: body,
    },
  };
};
