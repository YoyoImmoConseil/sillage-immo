import type { Metadata } from "next";
import Link from "next/link";
import { getRequestLocale } from "@/lib/i18n/request";
import { localizePath } from "@/lib/i18n/routing";
import { buildPublicPageMetadata } from "@/lib/seo/site";
import { PageHero } from "@/app/components/page-hero";
import { PAGES_COPY } from "@/app/_pages/copy";
import { LatestListingsSection } from "@/app/_pages/latest-listings-section";
import { FinalCtaSection } from "@/app/_home/sections/final-cta-section";
import { CheckIcon } from "@/app/_home/shared/cta-button";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildPublicPageMetadata({
    path: "/louer",
    locale,
    ...PAGES_COPY[locale].rent.seo,
    image: "/pages/nice-vieux-nice-rue.jpg",
  });
}

const PRIMARY =
  "inline-flex items-center justify-center rounded-full bg-navy px-6 py-3 text-sm font-semibold text-sand shadow-sm transition hover:-translate-y-[1px] hover:opacity-95";
const SECONDARY =
  "inline-flex items-center justify-center rounded-full border border-navy px-6 py-3 text-sm font-semibold text-navy transition hover:bg-navy/5";

export default async function LouerPage() {
  const locale = await getRequestLocale();
  const copy = PAGES_COPY[locale].rent;

  const renderPoints = (points: string[]) => (
    <ul className="space-y-3">
      {points.map((point) => (
        <li key={point} className="flex items-start gap-3 text-sm text-navy/80 md:text-base">
          <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-navy text-sand">
            <CheckIcon className="h-3 w-3" />
          </span>
          {point}
        </li>
      ))}
    </ul>
  );

  return (
    <main className="min-h-screen">
      <PageHero
        eyebrow={copy.hero.eyebrow}
        title={copy.hero.title}
        subtitle={copy.hero.subtitle}
        image={{ src: "/pages/nice-vieux-nice-rue.jpg", alt: copy.hero.imageAlt }}
        primaryCta={{ href: localizePath("/location", locale), label: copy.ctaCatalog }}
        secondaryCta={{ href: localizePath("/gestion-locative", locale), label: copy.ctaOwner }}
      />

      <section id="proprietaires" aria-labelledby="rent-owner-title" className="bg-white scroll-mt-24">
        <div className="w-full px-4 py-16 md:px-10 md:py-24 xl:px-14 2xl:px-20">
          <div className="grid gap-10 md:grid-cols-2 md:gap-8">
            <article className="flex flex-col gap-6 rounded-[28px] bg-sand/40 p-8 ring-1 ring-navy/10 md:p-10">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.22em] text-navy/65">{copy.owner.eyebrow}</p>
                <h2 id="rent-owner-title" className="sillage-section-title">
                  {copy.owner.title}
                </h2>
                <p className="text-sm leading-relaxed text-navy/80 md:text-base">{copy.owner.body}</p>
              </div>
              {renderPoints(copy.owner.points)}
              <p className="text-xs text-navy/55">{copy.owner.feesNote}</p>
              <div className="mt-auto pt-2">
                <Link href={localizePath("/gestion-locative", locale)} className={PRIMARY}>
                  {copy.owner.cta}
                </Link>
              </div>
            </article>

            <article className="flex flex-col gap-6 rounded-[28px] bg-white p-8 ring-1 ring-navy/10 md:p-10">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.22em] text-navy/65">{copy.tenant.eyebrow}</p>
                <h2 className="sillage-section-title">{copy.tenant.title}</h2>
                <p className="text-sm leading-relaxed text-navy/80 md:text-base">{copy.tenant.body}</p>
              </div>
              {renderPoints(copy.tenant.points)}
              <div className="mt-auto flex flex-col gap-3 pt-2 sm:flex-row">
                <Link href={localizePath("/location", locale)} className={PRIMARY}>
                  {copy.tenant.cta}
                </Link>
                <Link
                  href={`${localizePath("/recherche/nouvelle", locale)}?businessType=rental`}
                  className={SECONDARY}
                >
                  {copy.tenant.ctaAlert}
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      <LatestListingsSection locale={locale} businessType="rental" copy={copy.latest} catalogPath="/location" />
      <FinalCtaSection locale={locale} />
    </main>
  );
}
