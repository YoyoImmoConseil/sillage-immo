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

export default async function Home() {
  const locale = await getRequestLocale();

  return (
    <main className="min-h-screen">
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
    </main>
  );
}
