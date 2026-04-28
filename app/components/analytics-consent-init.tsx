import Script from "next/script";

/**
 * Pushes Google Consent Mode v2 *default* (everything denied) into the
 * dataLayer BEFORE GTM is parsed. Without this, GA4/Ads tags would
 * fire on first page load and we'd be in breach of CNIL guidelines in
 * France.
 *
 * Must be rendered in the root layout, BEFORE <GoogleTagManager />,
 * with strategy="beforeInteractive" so it runs before any other
 * non-critical script.
 *
 * The cookie-stored user choice is replayed by `<ConsentBanner />` on
 * mount via `applyConsentState()`. So the order of operations is:
 *   1. This script -> consent default denied (server-rendered, sync).
 *   2. GTM script  -> queues GA4/Ads events but doesn't send them.
 *   3. ConsentBanner mounts -> if a cookie is set, push consent update.
 *   4. If no cookie, banner is shown to the user.
 */
export function AnalyticsConsentInit() {
  return (
    <Script id="consent-default" strategy="beforeInteractive">
      {`
window.dataLayer = window.dataLayer || [];
function gtag(){ dataLayer.push(arguments); }
gtag('consent', 'default', {
  analytics_storage: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  functionality_storage: 'denied',
  personalization_storage: 'denied',
  security_storage: 'granted',
  wait_for_update: 500,
});
dataLayer.push({ event: 'consent_default' });
      `}
    </Script>
  );
}
