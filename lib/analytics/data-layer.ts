/**
 * Typed wrapper around the GTM `dataLayer`.
 *
 * - Server-safe: every push is a no-op outside the browser (SSR).
 * - Consent-safe: GTM Consent Mode v2 ensures Google tags don't fire
 *   while `analytics_storage` is denied. We still push events to the
 *   dataLayer so they can be replayed once consent is granted; but we
 *   strip PII from payloads at the source (see `track()`).
 * - Stable shape: every event has the form `{ event, ...payload }`.
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

export type AnalyticsEventName =
  // SPA navigation
  | "spa_page_view"
  // Consent lifecycle
  | "consent_default"
  | "consent_update"
  // Public engagement
  | "cta_clicked"
  | "phone_clicked"
  | "email_clicked"
  | "whatsapp_clicked"
  | "lang_switched"
  | "property_card_clicked"
  | "ai_assistant_opened"
  | "ai_assistant_message_sent"
  // Seller funnel (/estimation)
  | "seller_estimation_started"
  | "seller_otp_sent"
  | "seller_otp_verified"
  | "seller_media_uploaded"
  | "seller_media_upload_failed"
  | "seller_estimation_computed"
  | "seller_lead_created"
  | "seller_portal_link_sent"
  // Buyer funnel (/recherche/nouvelle)
  | "buyer_search_started"
  | "buyer_search_zone_drawn"
  | "buyer_search_saved"
  | "buyer_alert_email_clicked"
  // Client space
  | "client_login"
  | "client_document_uploaded"
  | "client_property_viewed"
  | "client_advisor_booking_clicked"
  // Quality / errors
  | "js_error"
  | "api_error"
  // Web vitals
  | "web_vitals";

export type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>;

const isBrowser = () => typeof window !== "undefined";

const ensureDataLayer = (): unknown[] | null => {
  if (!isBrowser()) return null;
  if (!Array.isArray(window.dataLayer)) {
    window.dataLayer = [];
  }
  return window.dataLayer ?? null;
};

/**
 * Sanitize values to keep events small and remove anything that could
 * leak PII by accident (long strings, deep objects). Numbers, booleans,
 * short strings, null and undefined go through unchanged.
 */
const sanitizeValue = (
  value: unknown
): string | number | boolean | null | undefined => {
  if (value === null || value === undefined) return value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length > 200) return trimmed.slice(0, 200);
    return trimmed;
  }
  return undefined;
};

const sanitizePayload = (payload: AnalyticsPayload | undefined): AnalyticsPayload => {
  if (!payload) return {};
  const out: AnalyticsPayload = {};
  for (const [key, value] of Object.entries(payload)) {
    const cleaned = sanitizeValue(value);
    if (cleaned !== undefined) {
      out[key] = cleaned;
    }
  }
  return out;
};

/**
 * Push a typed event into the GTM dataLayer.
 *
 * Safe to call from server components or during SSR — it becomes a
 * no-op. Safe to call before GTM has loaded — events queue in
 * `window.dataLayer` and GTM consumes them on init.
 */
export const track = (event: AnalyticsEventName, payload?: AnalyticsPayload) => {
  const dl = ensureDataLayer();
  if (!dl) return;
  dl.push({ event, ...sanitizePayload(payload) });
};

/**
 * gtag-style helper for Consent Mode v2. GTM and gtag.js detect
 * Consent Mode commands by inspecting the *native* `arguments` object
 * pushed onto `dataLayer`. A regular Array (`...args`) won't work:
 * GTM ignores it. So we use a real (non-arrow) function and push
 * `arguments` directly, exactly mirroring the official Google snippet:
 *
 *   function gtag(){ dataLayer.push(arguments); }
 *
 * Don't call this from product code — use `track()` instead.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function gtag(..._args: unknown[]): void {
  const dl = ensureDataLayer();
  if (!dl) return;
  // eslint-disable-next-line prefer-rest-params
  dl.push(arguments);
}
