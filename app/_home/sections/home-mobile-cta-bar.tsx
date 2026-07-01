import Link from "next/link";
import type { AppLocale } from "@/lib/i18n/config";
import { localizePath } from "@/lib/i18n/routing";
import { HOME_COPY, PHONE_ARIA_LABEL, SILLAGE_PHONE_RAW } from "../copy";
import { PhoneIcon } from "../shared/cta-button";

type Props = { locale: AppLocale };

/**
 * Barre d'action collante mobile (conversion).
 * Intention marketing : garder en permanence, pendant tout le scroll, le lead
 * prioritaire (estimation vendeur) et le contact direct (appel agence).
 * - md:hidden : n'apparaît jamais sur desktop (≥ 768px inchangé).
 * - safe-area iOS respectée, boutons ≥ 48px.
 */
export function HomeMobileCtaBar({ locale }: Props) {
  const cta = HOME_COPY[locale].ctaGlobal;
  const phoneAria = PHONE_ARIA_LABEL[locale];

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-navy/10 bg-sand/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur md:hidden">
      <div className="flex items-center gap-3">
        {/* CTA primaire : estimation vendeur (couleur de marque #141446 = navy). */}
        <Link
          href={localizePath("/estimation", locale)}
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-navy px-5 text-sm font-semibold text-sand"
          data-track-cta="mobile_bar_estimate"
          data-track-location="mobile_bar"
        >
          {cta.estimate}
        </Link>
        {/* CTA secondaire : appel agence (click-to-call). */}
        <a
          href={`tel:${SILLAGE_PHONE_RAW}`}
          aria-label={phoneAria}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-navy px-5 text-sm font-semibold text-navy"
          data-track-cta="mobile_bar_call"
          data-track-location="mobile_bar"
        >
          <PhoneIcon className="h-4 w-4" />
          {cta.call}
        </a>
      </div>
    </div>
  );
}
