import { getRequestLocale } from "@/lib/i18n/request";
import { HeroSection } from "./_home/sections/hero-section";
import { SocialProofSection } from "./_home/sections/social-proof-section";
import { AssistantSection } from "./_home/sections/assistant-section";
import { PositioningSection } from "./_home/sections/positioning-section";
import { SellerSection } from "./_home/sections/seller-section";
import { BuyerSection } from "./_home/sections/buyer-section";
import { ClientSpaceSection } from "./_home/sections/client-space-section";
import { MethodSection } from "./_home/sections/method-section";
import { ComparisonSection } from "./_home/sections/comparison-section";
import { CatalogSection } from "./_home/sections/catalog-section";
import { NeighborhoodsSection } from "./_home/sections/neighborhoods-section";
import { InternationalSection } from "./_home/sections/international-section";
import { FinalCtaSection } from "./_home/sections/final-cta-section";
import { HomeTeamSection } from "./components/home-team-section";
import { HomeMobileCtaBar } from "./_home/sections/home-mobile-cta-bar";

export default async function Home() {
  const locale = await getRequestLocale();

  return (
    // pb mobile : évite que la barre d'action collante ne masque le bas de page.
    <main className="min-h-screen pb-24 md:pb-0">
      <HeroSection locale={locale} />
      <SocialProofSection locale={locale} />
      <AssistantSection locale={locale} />
      <PositioningSection locale={locale} />
      <SellerSection locale={locale} />
      <BuyerSection locale={locale} />
      <ClientSpaceSection locale={locale} />
      <MethodSection locale={locale} />
      <ComparisonSection locale={locale} />
      <CatalogSection locale={locale} />
      <NeighborhoodsSection locale={locale} />
      <InternationalSection locale={locale} />
      <HomeTeamSection locale={locale} />
      <FinalCtaSection locale={locale} />
      <HomeMobileCtaBar locale={locale} />
    </main>
  );
}
