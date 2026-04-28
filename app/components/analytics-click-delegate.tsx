"use client";

import { useEffect } from "react";
import { track, type AnalyticsEventName } from "@/lib/analytics/data-layer";

/**
 * Single document-level click listener that fans out to typed
 * analytics events depending on the closest ancestor's
 * `data-track-*` attribute. This avoids instrumenting 50 components
 * one by one — UI code just adds `data-track-cta="..."` on the buttons
 * and links it cares about.
 *
 * Supported attributes (taken from the closest ancestor with one):
 *   - data-track-cta="<id>"               -> cta_clicked { cta_id, location }
 *   - data-track-phone="<phone>"          -> phone_clicked { phone, location }
 *   - data-track-email="<email>"          -> email_clicked { domain, location }
 *   - data-track-whatsapp="<phone>"       -> whatsapp_clicked { phone }
 *   - data-track-property-card="<id>"     -> property_card_clicked { property_id, price?, type?, city? }
 *   - data-track-lang-switch="<locale>"   -> lang_switched { to }
 *
 * Common optional attributes: `data-track-location` (e.g. "header",
 * "hero", "footer", "card"), `data-track-property-price`,
 * `data-track-property-type`, `data-track-property-city`.
 *
 * Anchors with `tel:` / `mailto:` / `wa.me` href are auto-detected even
 * without explicit data attributes, so a stray phone link still gets
 * tracked.
 */
const findAttr = (start: Element, name: string): string | null => {
  const el = start.closest(`[${name}]`);
  return el ? el.getAttribute(name) : null;
};

const extractEmailDomain = (raw: string): string | null => {
  const at = raw.lastIndexOf("@");
  if (at === -1) return null;
  return raw.slice(at + 1).toLowerCase();
};

export function AnalyticsClickDelegate() {
  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      // Explicit data-track-* attributes win over auto-detection.
      const cta = findAttr(target, "data-track-cta");
      if (cta) {
        track("cta_clicked", {
          cta_id: cta,
          location: findAttr(target, "data-track-location") ?? undefined,
        });
        return;
      }

      const propertyCardId = findAttr(target, "data-track-property-card");
      if (propertyCardId) {
        track("property_card_clicked", {
          property_id: propertyCardId,
          price: findAttr(target, "data-track-property-price") ?? undefined,
          property_type: findAttr(target, "data-track-property-type") ?? undefined,
          city: findAttr(target, "data-track-property-city") ?? undefined,
          location: findAttr(target, "data-track-location") ?? undefined,
        });
        return;
      }

      const langTo = findAttr(target, "data-track-lang-switch");
      if (langTo) {
        track("lang_switched", { to: langTo });
        return;
      }

      const explicitPhone = findAttr(target, "data-track-phone");
      const explicitEmail = findAttr(target, "data-track-email");
      const explicitWhatsapp = findAttr(target, "data-track-whatsapp");

      if (explicitPhone) {
        track("phone_clicked", {
          phone: explicitPhone,
          location: findAttr(target, "data-track-location") ?? undefined,
        });
        return;
      }
      if (explicitEmail) {
        track("email_clicked", {
          domain: extractEmailDomain(explicitEmail) ?? undefined,
          location: findAttr(target, "data-track-location") ?? undefined,
        });
        return;
      }
      if (explicitWhatsapp) {
        track("whatsapp_clicked", { phone: explicitWhatsapp });
        return;
      }

      // Auto-detect tel:/mailto:/wa.me anchors.
      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      if (href.startsWith("tel:")) {
        track("phone_clicked", {
          phone: href.slice(4),
          location: findAttr(target, "data-track-location") ?? undefined,
        });
        return;
      }
      if (href.startsWith("mailto:")) {
        const email = href.slice(7).split("?")[0];
        track("email_clicked", {
          domain: extractEmailDomain(email) ?? undefined,
          location: findAttr(target, "data-track-location") ?? undefined,
        });
        return;
      }
      if (/wa\.me|api\.whatsapp\.com/.test(href)) {
        track("whatsapp_clicked", { url: href });
        return;
      }
    };

    document.addEventListener("click", handler, { passive: true, capture: true });
    return () => document.removeEventListener("click", handler, { capture: true });
  }, []);

  return null;
}

/**
 * Helper used by typed event names that piggyback on the click
 * delegate. Useful if a future event needs different fan-out logic.
 */
export type DelegatedEventName = Extract<
  AnalyticsEventName,
  | "cta_clicked"
  | "phone_clicked"
  | "email_clicked"
  | "whatsapp_clicked"
  | "lang_switched"
  | "property_card_clicked"
>;
