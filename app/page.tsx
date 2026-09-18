import type { Metadata } from "next";
import { getRequestLocale } from "@/lib/i18n/request";
import { buildPublicPageMetadata } from "@/lib/seo/site";
import { PAGE_SEO } from "@/lib/seo/page-copy";
import { buildOrganizationJsonLd } from "@/lib/seo/organization-jsonld";
import { HeroSection } from "./_home/sections/hero-section";
import { HomeListingsSection } from "./_home/sections/home-listings-section";
import { ProofSection } from "./_home/sections/proof-section";
import { RecentSalesSection } from "./_home/sections/recent-sales-section";
import { DoorsSection } from "./_home/sections/doors-section";
import { ApproachSection } from "./_home/sections/approach-section";
import { NeighborhoodsSection } from "./_home/sections/neighborhoods-section";
import { ToolsSection } from "./_home/sections/tools-section";
import { InternationalSection } from "./_home/sections/international-section";
import { FinalCtaSection } from "./_home/sections/final-cta-section";
import { HomeTeamSection } from "./components/home-team-section";
import { SHOW_HOME_TEAM_SECTION } from "@/lib/brand/company";
import { HomeMobileCtaBar } from "./_home/sections/home-mobile-cta-bar";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildPublicPageMetadata({ path: "/", locale, ...PAGE_SEO.home[locale] });
}

export default async function Home() {
  const locale = await getRequestLocale();

  return (
    // Réserve tactile : évite que la barre d'action collante ne masque le bas
    // de page. Même condition que la barre elle-même, sinon trou ou contenu
    // masqué (cf. HomeMobileCtaBar).
    <main className="min-h-screen touch:pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildOrganizationJsonLd()) }}
      />
      {/* Accueil resserré (sept. 2026) : chaque écran a une fonction distincte.
          Hero → biens en vente → preuve (chiffres + ventes) → portes → approche
          → quartiers → outils (espace client + assistant) → international → CTA. */}
      <HeroSection locale={locale} />
      <HomeListingsSection locale={locale} />
      <ProofSection locale={locale} />
      <RecentSalesSection locale={locale} />
      <DoorsSection locale={locale} />
      <ApproachSection locale={locale} />
      <NeighborhoodsSection locale={locale} />
      <ToolsSection locale={locale} />
      <InternationalSection locale={locale} />
      {SHOW_HOME_TEAM_SECTION ? <HomeTeamSection locale={locale} /> : null}
      <FinalCtaSection locale={locale} />
      <HomeMobileCtaBar locale={locale} />
    </main>
  );
}
