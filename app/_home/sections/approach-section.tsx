import Link from "next/link";
import type { AppLocale } from "@/lib/i18n/config";
import { localizePath } from "@/lib/i18n/routing";
import { HOME_BLOCKS_COPY } from "../copy-blocks";
import { CAROUSEL_ITEM } from "../shared/carousel-item";
import { HCarousel } from "../shared/mobile-carousel";

type Props = { locale: AppLocale };

/**
 * Bloc unique qui remplace « approche » + « méthode » + « comparatif » : trois
 * piliers concrets (prix, mandat, interlocuteur) et un renvoi vers la méthode
 * détaillée sur /vendre. Garde l'ancre `#methode` utilisée par les CTA.
 */
export function ApproachSection({ locale }: Props) {
  const copy = HOME_BLOCKS_COPY[locale].approach;
  return (
    <section
      id="methode"
      aria-labelledby="approach-title"
      className="sillage-section-light scroll-mt-24"
    >
      <div className="w-full px-4 py-16 md:px-10 md:py-24 xl:px-14 2xl:px-20 space-y-10">
        <div className="max-w-3xl space-y-4">
          <p className="text-xs uppercase tracking-[0.22em] text-navy/65">{copy.eyebrow}</p>
          <h2 id="approach-title" className="sillage-section-title">
            {copy.title}
          </h2>
          <p className="sillage-editorial-text text-navy/80">{copy.intro}</p>
        </div>

        <HCarousel desktopClassName="md:grid-cols-3 md:gap-6" as="ol" ariaLabel={copy.title}>
          {copy.pillars.map((pillar, index) => (
            <li
              key={pillar.title}
              className={`${CAROUSEL_ITEM} flex flex-col gap-3 rounded-[24px] bg-white p-6 ring-1 ring-navy/10`}
            >
              <span className="font-serif text-sm text-navy/50">0{index + 1}</span>
              <h3 className="font-serif text-xl font-semibold text-navy">{pillar.title}</h3>
              <p className="text-sm leading-relaxed text-navy/75">{pillar.body}</p>
            </li>
          ))}
        </HCarousel>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href={localizePath("/estimation", locale)}
            data-track-cta="approach_estimate"
            data-track-location="home_approach"
            className="inline-flex items-center justify-center rounded-full bg-navy px-6 py-3 text-sm font-semibold text-sand shadow-sm transition hover:-translate-y-[1px] hover:opacity-95"
          >
            {copy.ctaPrimary}
          </Link>
          <Link
            href={`${localizePath("/vendre", locale)}#methode`}
            data-track-cta="approach_method"
            data-track-location="home_approach"
            className="inline-flex items-center justify-center rounded-full border border-navy/30 px-6 py-3 text-sm font-semibold text-navy transition hover:bg-navy/5"
          >
            {copy.ctaSecondary}
          </Link>
        </div>
      </div>
    </section>
  );
}
