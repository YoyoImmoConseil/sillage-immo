import type { AppLocale } from "@/lib/i18n/config";
import {
  HOME_COPY,
  PHONE_ARIA_LABEL,
  SILLAGE_PHONE_RAW,
} from "../copy";
import { PhoneIcon } from "../shared/cta-button";
import { HCarousel } from "../shared/mobile-carousel";
import Link from "next/link";
import { localizePath } from "@/lib/i18n/routing";
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

        {/* Mobile : rangée de chips à défilement horizontal (10 quartiers),
            description tronquée sur 1 ligne + barre de progression. Desktop :
            grille 2/3 colonnes inchangée. */}
        <HCarousel
          desktopClassName="md:grid-cols-2 xl:grid-cols-3 md:gap-4"
          indicator="bar"
          ariaLabel={copy.title}
        >
          {QUARTIERS.map((quartier) => (
            <Link
              key={quartier.slug}
              href={localizePath(`/quartiers/${quartier.slug}`, locale)}
              data-track-cta={`home_quartier_${quartier.slug}`}
              data-track-location="home_neighborhoods"
              className="group flex shrink-0 basis-[72%] snap-start flex-col gap-2 rounded-[20px] bg-white p-5 ring-1 ring-navy/5 transition hover:-translate-y-[2px] hover:ring-navy/20 sm:basis-[46%] md:basis-auto"
            >
              <h3 className="font-serif text-base font-semibold text-navy">
                {quartier.name}
                <span aria-hidden="true" className="ml-1 inline-block transition group-hover:translate-x-0.5">→</span>
              </h3>
              <p className="text-sm leading-relaxed text-navy/75">
                {quartier.tagline[locale]}
              </p>
            </Link>
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
