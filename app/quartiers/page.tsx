import type { Metadata } from "next";
import { getRequestLocale } from "@/lib/i18n/request";
import { buildPublicPageMetadata } from "@/lib/seo/site";
import { QUARTIERS } from "@/lib/quartiers/data";
import { QUARTIERS_UI } from "@/lib/quartiers/copy";
import { DVF_META } from "@/lib/quartiers/stats";
import { QuartierCard } from "@/app/components/quartier-card";
import { FinalCtaSection } from "@/app/_home/sections/final-cta-section";

const SEO = {
  fr: {
    title: "Les quartiers de Nice — Prix, ambiance, adresses | Sillage Immo",
    description:
      "Riquier, Le Port, Carré d'Or, Cimiez, Mont Boron, Libération… Douze quartiers de Nice décrits par une agence qui y travaille : prix réels DVF, qui y achète, adresses recommandées.",
  },
  en: {
    title: "Nice neighbourhoods — Prices, character, addresses | Sillage Immo",
    description: "Twelve Nice districts described by an agency that works there: real DVF prices, who buys, recommended addresses.",
  },
  es: {
    title: "Los barrios de Niza — Precios, ambiente, direcciones | Sillage Immo",
    description: "Doce barrios de Niza descritos por una agencia que trabaja en ellos: precios reales DVF, quién compra, direcciones recomendadas.",
  },
  ru: {
    title: "Районы Ниццы — цены, характер, адреса | Sillage Immo",
    description: "Двенадцать районов Ниццы глазами агентства, которое там работает: реальные цены DVF, кто покупает, рекомендуемые адреса.",
  },
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildPublicPageMetadata({ path: "/quartiers", locale, ...SEO[locale], image: "/quartiers/le-port.jpg" });
}

export default async function QuartiersIndexPage() {
  const locale = await getRequestLocale();
  const ui = QUARTIERS_UI[locale];

  return (
    <main className="min-h-screen">
      <section className="sillage-section-light">
        <div className="w-full px-4 py-16 md:px-10 md:py-24 xl:px-14 2xl:px-20 space-y-10">
          <div className="max-w-3xl space-y-4">
            <p className="text-xs uppercase tracking-[0.22em] text-navy/65">{ui.indexEyebrow}</p>
            <h1 className="sillage-section-title">{ui.indexTitle}</h1>
            <p className="sillage-editorial-text text-navy/80">{ui.indexIntro}</p>
          </div>

          <ul className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {QUARTIERS.map((quartier) => (
              <li key={quartier.slug}>
                <QuartierCard quartier={quartier} locale={locale} headingLevel="h2" trackLocation="quartiers_index" />
              </li>
            ))}
          </ul>
          <p className="max-w-3xl text-xs leading-relaxed text-navy/55">
            {ui.sourceLabel} : {DVF_META.source}, {DVF_META.years.join("–")}. {DVF_META.method}
          </p>
        </div>
      </section>
      <FinalCtaSection locale={locale} />
    </main>
  );
}
