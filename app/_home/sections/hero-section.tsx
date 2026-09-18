import Image from "next/image";
import Link from "next/link";
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

/**
 * Hero en deux volets : à gauche, une colonne bleu marine (le même bleu que le
 * header, sans rupture) qui porte le logo, le titre et les boutons ; à droite,
 * la photo des fenêtres niçoises pleine hauteur, sans voile, telle qu'elle est.
 * Sur mobile, la colonne texte vient d'abord, la photo suit en bandeau.
 */
export function HeroSection({ locale }: Props) {
  const copy = HOME_COPY[locale].hero;
  const ctaCopy = HOME_COPY[locale].ctaGlobal;
  const phoneAria = PHONE_ARIA_LABEL[locale];

  return (
    <section
      aria-labelledby="hero-title"
      className="grid bg-navy text-sand lg:grid-cols-[minmax(0,46%)_minmax(0,54%)]"
    >
      <div className="flex flex-col justify-center px-4 py-10 md:px-10 md:py-12 xl:px-14 xl:py-14 2xl:px-20">
        {/* Version recadrée du logo (sans les marges vides du fichier print) :
            à largeur égale, le logo s'affiche presque deux fois plus grand. */}
        <div className="mx-auto w-full max-w-[240px] md:mx-0 md:max-w-[440px] xl:max-w-[520px]">
          <Image
            src="/logo-sillage-hero.svg"
            alt="Logo Sillage Immo"
            width={700}
            height={636}
            priority
            className="h-auto w-full"
          />
        </div>

        <div className="mt-8 space-y-4 md:mt-10 md:space-y-5">
          <p className="text-[11px] md:text-xs uppercase tracking-[0.24em] text-sand/75">
            {copy.eyebrow}
          </p>
          <h1
            id="hero-title"
            className="sillage-section-title-font text-[26px] leading-[1.12] md:text-5xl xl:text-[54px] font-semibold md:leading-[1.08] tracking-tight"
          >
            {copy.title}
          </h1>
          <p className="sillage-editorial-text text-sand/90 max-w-2xl">{copy.subtitle}</p>
          <p className="text-sm md:text-base text-sand/70 max-w-2xl">{copy.tagline}</p>

          {/* HIÉRARCHIE CTA MOBILE : un seul primaire (Estimer, en crème) + un
              secondaire outline (Voir les biens). « Créer ma recherche » et
              « Parler à un conseiller » sont masqués sur téléphone (repris dans
              le flux + barre collante) et servis sur ordinateur. */}
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
              className="order-2 inline-flex items-center justify-center rounded-full border border-sand bg-transparent px-6 py-3 text-sm font-semibold text-sand transition hover:bg-sand hover:text-navy touch:hidden"
              data-track-cta="hero_buyer_search"
              data-track-location="hero"
            >
              {ctaCopy.search}
            </Link>
            <a
              href={`tel:${SILLAGE_PHONE_RAW}`}
              aria-label={phoneAria}
              className="order-3 lg:order-4 inline-flex items-center justify-center gap-2 rounded-full border border-sand/60 bg-transparent px-6 py-3 text-sm font-semibold text-sand transition hover:bg-sand/10 touch:hidden"
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

          <p className="pt-2 text-xs md:text-sm text-sand/65 max-w-2xl">{copy.microcopy}</p>
        </div>
      </div>

      <div className="relative aspect-[16/10] w-full lg:aspect-auto lg:min-h-[640px]">
        <Image
          src="/home-hero-windows-nice.webp"
          alt={copy.imageAlt}
          fill
          priority
          sizes="(min-width: 1024px) 54vw, 100vw"
          className="object-cover object-center"
        />
      </div>
    </section>
  );
}
