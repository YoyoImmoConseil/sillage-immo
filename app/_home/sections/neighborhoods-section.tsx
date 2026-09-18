import type { AppLocale } from "@/lib/i18n/config";
import {
  HOME_COPY,
  PHONE_ARIA_LABEL,
  SILLAGE_PHONE_RAW,
} from "../copy";
import { PhoneIcon } from "../shared/cta-button";
import { HCarousel } from "../shared/mobile-carousel";
import { CAROUSEL_ITEM } from "../shared/carousel-item";
import { QuartierCard } from "@/app/components/quartier-card";
import { QUARTIERS } from "@/lib/quartiers/data";

type Props = { locale: AppLocale };

export function NeighborhoodsSection({ locale }: Props) {
  const copy = HOME_COPY[locale].neighborhoods;
  const phoneAria = PHONE_ARIA_LABEL[locale];

  return (
    <section
      aria-labelledby="neighborhoods-title"
      className="sillage-section-light"
    >
      <div className="w-full px-4 py-16 md:px-10 md:py-24 xl:px-14 2xl:px-20 space-y-10">
        <div className="max-w-3xl space-y-4">
          <p className="text-xs uppercase tracking-[0.22em] text-navy/65">
            {copy.eyebrow}
          </p>
          <h2 id="neighborhoods-title" className="sillage-section-title">
            {copy.title}
          </h2>
          <p className="sillage-editorial-text text-navy/80">{copy.subtitle}</p>
        </div>

        {/* Mêmes cartes (photo, accroche, prix médian) que l'index /quartiers.
            Mobile : carrousel horizontal ; desktop : grille 2 / 3 / 4 colonnes. */}
        <HCarousel
          desktopClassName="md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 md:gap-6"
          as="ul"
          indicator="bar"
          ariaLabel={copy.title}
        >
          {QUARTIERS.map((quartier) => (
            <li key={quartier.slug} className={`${CAROUSEL_ITEM} min-w-0`}>
              <QuartierCard quartier={quartier} locale={locale} trackLocation="home_neighborhoods" />
            </li>
          ))}
        </HCarousel>

        <div>
          <a
            href={`tel:${SILLAGE_PHONE_RAW}`}
            aria-label={phoneAria}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-navy bg-transparent px-6 py-3 text-sm font-semibold text-navy transition hover:bg-navy/5"
          >
            <PhoneIcon className="h-4 w-4" />
            {copy.ctaLabel}
          </a>
        </div>
      </div>
    </section>
  );
}
