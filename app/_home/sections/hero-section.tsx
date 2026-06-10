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
      <div className="relative w-full px-6 py-12 md:px-10 md:py-20 xl:px-14 xl:py-24 2xl:px-20">
        <div className="grid gap-10 lg:grid-cols-[50%_50%] lg:items-center">
          <div className="max-w-[1092px]">
            <SillageLogo priority className="h-auto w-full" />
          </div>
          <div className="space-y-5 max-w-3xl xl:max-w-4xl lg:pl-8 xl:pl-12">
            <p className="text-[11px] md:text-xs uppercase tracking-[0.24em] text-sand/75">
              {copy.eyebrow}
            </p>
            <h1
              id="hero-title"
              className="sillage-section-title-font text-3xl md:text-5xl xl:text-[54px] font-semibold leading-[1.08] tracking-tight"
            >
              {copy.title}
            </h1>
            <p className="sillage-editorial-text text-sand/90 max-w-3xl">
              {copy.subtitle}
            </p>
            <p className="text-sm md:text-base text-sand/70 max-w-3xl">
              {copy.tagline}
            </p>

            <div className="pt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap">
              <Link
                href={localizePath("/estimation", locale)}
                className="order-1 inline-flex items-center justify-center rounded-full bg-sand px-6 py-3 text-sm font-semibold text-navy shadow-sm transition hover:-translate-y-[1px] hover:opacity-95"
                data-track-cta="hero_estimate"
                data-track-location="hero"
              >
                {ctaCopy.estimate}
              </Link>
              <Link
                href={localizePath("/recherche/nouvelle", locale)}
                className="order-2 inline-flex items-center justify-center rounded-full border border-sand bg-transparent px-6 py-3 text-sm font-semibold text-sand transition hover:bg-sand hover:text-navy"
                data-track-cta="hero_buyer_search"
                data-track-location="hero"
              >
                {ctaCopy.search}
              </Link>
              <a
                href={`tel:${SILLAGE_PHONE_RAW}`}
                aria-label={phoneAria}
                className="order-3 lg:order-4 inline-flex items-center justify-center gap-2 rounded-full border border-sand/60 bg-transparent px-6 py-3 text-sm font-semibold text-sand transition hover:bg-sand/10"
                data-track-location="hero"
              >
                <PhoneIcon className="h-4 w-4" />
                {ctaCopy.callAdvisor}
              </a>
              <Link
                href={localizePath("/vente", locale)}
                className="order-4 lg:order-3 inline-flex items-center justify-center rounded-full border border-sand/40 bg-transparent px-6 py-3 text-sm font-medium text-sand/85 transition hover:border-sand hover:text-sand"
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
