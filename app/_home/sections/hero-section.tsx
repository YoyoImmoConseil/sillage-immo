import Image from "next/image";
import Link from "next/link";
import { SillageLogo } from "@/app/components/sillage-logo";
import type { AppLocale } from "@/lib/i18n/config";
import { localizePath } from "@/lib/i18n/routing";
import {
  HOME_COPY,
  PHONE_ARIA_LABEL,
  SILLAGE_PHONE_RAW,
} from "../copy";
import { PhoneIcon } from "../shared/cta-button";

type Props = {
  locale: AppLocale;
};

export function HeroSection({ locale }: Props) {
  const copy = HOME_COPY[locale].hero;
  const ctaCopy = HOME_COPY[locale].ctaGlobal;
  const phoneAria = PHONE_ARIA_LABEL[locale];

  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate overflow-hidden bg-navy text-sand"
    >
      <Image
        src="/home-hero-windows-nice.png"
        alt={copy.imageAlt}
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-navy/60"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-br from-navy/85 via-navy/55 to-navy/30"
      />
      <div className="relative w-full px-4 py-12 md:px-10 md:py-20 xl:px-14 xl:py-24 2xl:px-20">
        <div className="grid gap-8 md:gap-10 lg:grid-cols-[50%_50%] lg:items-center">
          <div className="max-w-[1092px]">
            <SillageLogo priority className="h-auto w-full" />
          </div>
          <div className="space-y-4 md:space-y-5 max-w-3xl xl:max-w-4xl lg:pl-8 xl:pl-12">
            <p className="text-[11px] md:text-xs uppercase tracking-[0.24em] text-sand/75">
              {copy.eyebrow}
            </p>
            {/* H1 conservé, taille réduite sur mobile pour garder le CTA
                primaire visible au-dessus de la ligne de flottaison. */}
            <h1
              id="hero-title"
              className="sillage-section-title-font text-[26px] leading-[1.12] md:text-5xl xl:text-[54px] font-semibold md:leading-[1.08] tracking-tight"
            >
              {copy.title}
            </h1>
            {/* Intro tronquée visuellement sur mobile (contenu conservé dans le
                DOM) pour réduire l'espace occupé avant les CTA. */}
            <p className="sillage-editorial-text text-sand/90 max-w-3xl line-clamp-3 md:line-clamp-none">
              {copy.subtitle}
            </p>
            <p className="text-sm md:text-base text-sand/70 max-w-3xl line-clamp-2 md:line-clamp-none">
              {copy.tagline}
            </p>

            {/* HIÉRARCHIE CTA MOBILE : un seul primaire (Estimer, en crème pour
                contraster sur le hero sombre) + un secondaire outline (Voir les
                biens). « Créer ma recherche » et « Parler à un conseiller » sont
                masqués sur mobile (repris dans le flux + barre collante) et
                restent inchangés à partir de md. */}
            <div className="pt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap">
              <Link
                href={localizePath("/estimation", locale)}
                className="order-1 inline-flex items-center justify-center rounded-full bg-sand px-6 py-3 text-sm font-semibold text-navy shadow-sm transition hover:-translate-y-[1px] hover:opacity-95 max-md:min-h-12"
                data-track-cta="hero_estimate"
                data-track-location="hero"
              >
                {ctaCopy.estimate}
              </Link>
              <Link
                href={localizePath("/recherche/nouvelle", locale)}
                className="order-2 inline-flex items-center justify-center rounded-full border border-sand bg-transparent px-6 py-3 text-sm font-semibold text-sand transition hover:bg-sand hover:text-navy max-md:hidden"
                data-track-cta="hero_buyer_search"
                data-track-location="hero"
              >
                {ctaCopy.search}
              </Link>
              <a
                href={`tel:${SILLAGE_PHONE_RAW}`}
                aria-label={phoneAria}
                className="order-3 lg:order-4 inline-flex items-center justify-center gap-2 rounded-full border border-sand/60 bg-transparent px-6 py-3 text-sm font-semibold text-sand transition hover:bg-sand/10 max-md:hidden"
                data-track-location="hero"
              >
                <PhoneIcon className="h-4 w-4" />
                {ctaCopy.callAdvisor}
              </a>
              <Link
                href={localizePath("/vente", locale)}
                className="order-4 lg:order-3 inline-flex items-center justify-center rounded-full border border-sand/40 bg-transparent px-6 py-3 text-sm font-medium text-sand/85 transition hover:border-sand hover:text-sand max-md:min-h-12 max-md:border-sand max-md:font-semibold max-md:text-sand"
                data-track-cta="hero_view_sales"
                data-track-location="hero"
              >
                {ctaCopy.viewSales}
              </Link>
            </div>

            <p className="pt-2 text-xs md:text-sm text-sand/65 max-w-3xl">
              {copy.microcopy}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
