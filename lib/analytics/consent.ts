/**
 * GDPR / CNIL consent management for Google Tag Manager.
 *
 * We rely on Google Consent Mode v2 (`gtag('consent', ...)`) so that
 * Google tags (GA4, Ads, etc.) self-throttle until the user grants
 * permission. Default: everything denied. This must run BEFORE the
 * GTM script tag is parsed by the browser.
 *
 * Choices are persisted in a first-party cookie so the banner doesn't
 * reappear on every visit.
 */

import { gtag, track } from "./data-layer";

export const CONSENT_COOKIE_NAME = "sillage_consent";
export const CONSENT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year
const CONSENT_VERSION = 1;

export type ConsentValue = "granted" | "denied";

export type ConsentState = {
  analytics: ConsentValue;
  ads: ConsentValue;
  functional: ConsentValue;
  updatedAt: string;
  version: number;
};

export const DEFAULT_DENIED: ConsentState = {
  analytics: "denied",
  ads: "denied",
  functional: "denied",
  updatedAt: new Date(0).toISOString(),
  version: CONSENT_VERSION,
};

const isBrowser = () => typeof window !== "undefined" && typeof document !== "undefined";

const readCookie = (name: string): string | null => {
  if (!isBrowser()) return null;
  const target = `${name}=`;
  const parts = document.cookie.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(target)) {
      return decodeURIComponent(trimmed.slice(target.length));
    }
  }
  return null;
};

const writeCookie = (name: string, value: string, maxAgeSeconds: number) => {
  if (!isBrowser()) return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
};

export const loadConsentState = (): ConsentState | null => {
  const raw = readCookie(CONSENT_COOKIE_NAME);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ConsentState> & { version?: number };
    if (parsed.version !== CONSENT_VERSION) return null;
    if (
      (parsed.analytics !== "granted" && parsed.analytics !== "denied") ||
      (parsed.ads !== "granted" && parsed.ads !== "denied") ||
      (parsed.functional !== "granted" && parsed.functional !== "denied")
    ) {
      return null;
    }
    return {
      analytics: parsed.analytics,
      ads: parsed.ads,
      functional: parsed.functional,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
      version: CONSENT_VERSION,
    };
  } catch {
    return null;
  }
};

export const saveConsentState = (state: ConsentState) => {
  writeCookie(
    CONSENT_COOKIE_NAME,
    JSON.stringify(state),
    CONSENT_COOKIE_MAX_AGE_SECONDS
  );
};

/**
 * Push the *default* consent state to GTM. MUST run before GTM loads
 * the GA4/Ads tags so they queue events instead of firing them. We
 * also seed `wait_for_update` so GTM gives the user a moment to
 * interact with the banner before any tag fires.
 */
export const pushDefaultConsent = () => {
  gtag("consent", "default", {
    analytics_storage: DEFAULT_DENIED.analytics,
    ad_storage: DEFAULT_DENIED.ads,
    ad_user_data: DEFAULT_DENIED.ads,
    ad_personalization: DEFAULT_DENIED.ads,
    functionality_storage: DEFAULT_DENIED.functional,
    personalization_storage: DEFAULT_DENIED.functional,
    security_storage: "granted",
    wait_for_update: 500,
  });
  track("consent_default");
};

/**
 * Push a consent *update* to GTM after a user interaction. This is
 * what unblocks GA4 / Ads tags downstream.
 */
export const applyConsentState = (state: ConsentState) => {
  gtag("consent", "update", {
    analytics_storage: state.analytics,
    ad_storage: state.ads,
    ad_user_data: state.ads,
    ad_personalization: state.ads,
    functionality_storage: state.functional,
    personalization_storage: state.functional,
    security_storage: "granted",
  });
  track("consent_update", {
    analytics: state.analytics,
    ads: state.ads,
    functional: state.functional,
  });
};

export const grantAll = (): ConsentState => ({
  analytics: "granted",
  ads: "granted",
  functional: "granted",
  updatedAt: new Date().toISOString(),
  version: CONSENT_VERSION,
});

export const denyAll = (): ConsentState => ({
  analytics: "denied",
  ads: "denied",
  functional: "denied",
  updatedAt: new Date().toISOString(),
  version: CONSENT_VERSION,
});

export const buildCustomConsent = (input: {
  analytics: ConsentValue;
  ads: ConsentValue;
  functional?: ConsentValue;
}): ConsentState => ({
  analytics: input.analytics,
  ads: input.ads,
  functional: input.functional ?? "denied",
  updatedAt: new Date().toISOString(),
  version: CONSENT_VERSION,
});
