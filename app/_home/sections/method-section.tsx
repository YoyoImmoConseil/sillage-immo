import Link from "next/link";
import type { AppLocale } from "@/lib/i18n/config";
import { localizePath } from "@/lib/i18n/routing";
import { HOME_COPY } from "../copy";
import { CAROUSEL_ITEM, HCarousel } from "../shared/mobile-carousel";

type Props = { locale: AppLocale };

export function MethodSection({ locale }: Props) {
  const copy = HOME_COPY[locale].method;
  const ctaCopy = HOME_COPY[locale].ctaGlobal;

  return (
    <section
      id="methode"
      aria-labelledby="method-title"
      className="sillage-section-light scroll-mt-24"
    >
      <div className="w-full px-4 py-16 md:px-10 md:py-24 xl:px-14 2xl:px-20 space-y-10">
        <div className="max-w-3xl space-y-4">
          <p className="text-xs uppercase tracking-[0.22em] text-navy/65">
            {copy.eyebrow}
          </p>
          <h2 id="method-title" className="sillage-section-title">
            {copy.title}
          </h2>
          <p className="sillage-editorial-text text-navy/80">{copy.subtitle}</p>
        </div>

        {/* Mobile : carrousel horizontal (6 étapes) ; sémantique <ol>/<li>
            conservée. Desktop : grille 2/3 colonnes inchangée. */}
        <HCarousel as="ol" desktopClassName="md:grid-cols-2 xl:grid-cols-3 md:gap-5" ariaLabel={copy.title}>
          {copy.steps.map((step, index) => (
            <li
              key={step.title}
              className={`${CAROUSEL_ITEM} relative flex flex-col gap-3 rounded-[24px] bg-white p-6 ring-1 ring-navy/5`}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy font-serif text-sm text-sand">
                  {index + 1}
                </span>
                <h3 className="font-serif text-lg font-semibold text-navy">
                  {step.title}
                </h3>
              </div>
              <p className="text-sm leading-relaxed text-navy/75">
                {step.body}
              </p>
            </li>
          ))}
        </HCarousel>

        <div>
          <Link
            href={localizePath("/estimation", locale)}
            className="inline-flex items-center justify-center rounded-full bg-navy px-6 py-3 text-sm font-semibold text-sand shadow-sm transition hover:-translate-y-[1px] hover:opacity-95"
          >
            {ctaCopy.launchEstimation}
          </Link>
        </div>
      </div>
    </section>
  );
}
