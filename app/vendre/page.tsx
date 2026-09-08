import type { Metadata } from "next";
import Link from "next/link";
import { getRequestLocale } from "@/lib/i18n/request";
import { localizePath } from "@/lib/i18n/routing";
import { buildPublicPageMetadata } from "@/lib/seo/site";
import { PageHero } from "@/app/components/page-hero";
import { PAGES_COPY } from "@/app/_pages/copy";
import { ManifestoSection } from "@/app/_pages/manifesto-section";
import { SellerSection } from "@/app/_home/sections/seller-section";
import { MethodSection } from "@/app/_home/sections/method-section";
import { RecentSalesSection } from "@/app/_home/sections/recent-sales-section";
import { ComparisonSection } from "@/app/_home/sections/comparison-section";
import { FinalCtaSection } from "@/app/_home/sections/final-cta-section";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildPublicPageMetadata({
    path: "/vendre",
    locale,
    ...PAGES_COPY[locale].sell.seo,
    image: "/pages/nice-promenade-colline.jpg",
  });
}

export default async function VendrePage() {
  const locale = await getRequestLocale();
  const copy = PAGES_COPY[locale].sell;

  return (
    <main className="min-h-screen">
      <PageHero
        eyebrow={copy.hero.eyebrow}
        title={copy.hero.title}
        subtitle={copy.hero.subtitle}
        image={{ src: "/pages/nice-promenade-colline.jpg", alt: copy.hero.imageAlt }}
        primaryCta={{ href: localizePath("/estimation", locale), label: copy.ctaEstimate }}
        secondaryCta={{ href: "#methode", label: copy.ctaMethod }}
      />
      <ManifestoSection id="sell-manifesto" title={copy.manifesto.title} paragraphs={copy.manifesto.paragraphs} />
      <SellerSection locale={locale} />
      <MethodSection locale={locale} />
      <RecentSalesSection locale={locale} />
      <ComparisonSection locale={locale} />
      <section aria-labelledby="sell-fees-title" className="sillage-section-light">
        <div className="w-full px-4 py-14 md:px-10 md:py-20 xl:px-14 2xl:px-20">
          <div className="flex flex-col gap-6 rounded-[28px] bg-white p-8 ring-1 ring-navy/5 md:flex-row md:items-center md:justify-between md:p-10">
            <div className="max-w-2xl space-y-3">
              <p className="text-xs uppercase tracking-[0.22em] text-navy/65">{copy.fees.eyebrow}</p>
              <h2 id="sell-fees-title" className="font-serif text-2xl font-semibold text-navy md:text-3xl">
                {copy.fees.title}
              </h2>
              <p className="text-sm leading-relaxed text-navy/75 md:text-base">{copy.fees.body}</p>
            </div>
            <Link
              href={localizePath("/honoraires", locale)}
              className="inline-flex shrink-0 items-center justify-center rounded-full border border-navy px-6 py-3 text-sm font-semibold text-navy transition hover:bg-navy/5"
            >
              {copy.fees.cta}
            </Link>
          </div>
        </div>
      </section>
      <FinalCtaSection locale={locale} />
    </main>
  );
}
