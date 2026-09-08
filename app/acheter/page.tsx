import type { Metadata } from "next";
import { getRequestLocale } from "@/lib/i18n/request";
import { localizePath } from "@/lib/i18n/routing";
import { buildPublicPageMetadata } from "@/lib/seo/site";
import { PageHero } from "@/app/components/page-hero";
import { PAGES_COPY } from "@/app/_pages/copy";
import { ManifestoSection } from "@/app/_pages/manifesto-section";
import { StepsSection } from "@/app/_pages/steps-section";
import { LatestListingsSection } from "@/app/_pages/latest-listings-section";
import { BuyerSection } from "@/app/_home/sections/buyer-section";
import { ClientSpaceSection } from "@/app/_home/sections/client-space-section";
import { FinalCtaSection } from "@/app/_home/sections/final-cta-section";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildPublicPageMetadata({
    path: "/acheter",
    locale,
    ...PAGES_COPY[locale].buy.seo,
    image: "/pages/nice-baie-des-anges.jpg",
  });
}

export default async function AcheterPage() {
  const locale = await getRequestLocale();
  const copy = PAGES_COPY[locale].buy;

  return (
    <main className="min-h-screen">
      <PageHero
        eyebrow={copy.hero.eyebrow}
        title={copy.hero.title}
        subtitle={copy.hero.subtitle}
        image={{ src: "/pages/nice-baie-des-anges.jpg", alt: copy.hero.imageAlt }}
        primaryCta={{ href: localizePath("/recherche/nouvelle", locale), label: copy.ctaSearch }}
        secondaryCta={{ href: localizePath("/vente", locale), label: copy.ctaCatalog }}
      />
      <ManifestoSection id="buy-manifesto" title={copy.manifesto.title} paragraphs={copy.manifesto.paragraphs} />
      <BuyerSection locale={locale} />
      <StepsSection id="buy-steps" eyebrow={copy.steps.eyebrow} title={copy.steps.title} items={copy.steps.items} />
      <LatestListingsSection locale={locale} businessType="sale" copy={copy.latest} catalogPath="/vente" />
      <ClientSpaceSection locale={locale} />
      <FinalCtaSection locale={locale} />
    </main>
  );
}
