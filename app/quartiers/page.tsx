import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getRequestLocale } from "@/lib/i18n/request";
import { localizePath } from "@/lib/i18n/routing";
import { buildPublicPageMetadata } from "@/lib/seo/site";
import { QUARTIERS } from "@/lib/quartiers/data";
import { QUARTIERS_UI } from "@/lib/quartiers/copy";
import { DVF_META, formatPpm, getZoneStats } from "@/lib/quartiers/stats";
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
            {QUARTIERS.map((quartier) => {
              const stats = getZoneStats(quartier.statsKey);
              const median = stats?.apartments.medianPpmMainYear ?? stats?.apartments.medianPpm ?? null;
              return (
                <li key={quartier.slug}>
                  <Link
                    href={localizePath(`/quartiers/${quartier.slug}`, locale)}
                    className="group flex h-full flex-col overflow-hidden rounded-[24px] bg-white ring-1 ring-navy/10 transition hover:-translate-y-[2px] hover:ring-navy/25"
                  >
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-navy/5">
                      <Image
                        src={quartier.image.src}
                        alt={quartier.image.alt}
                        fill
                        sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                        className="object-cover transition duration-500 group-hover:scale-[1.03]"
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-6">
                      <h2 className="font-serif text-2xl font-semibold text-navy">{quartier.name}</h2>
                      <p className="text-sm leading-relaxed text-navy/75">{quartier.tagline[locale]}</p>
                      {median ? (
                        <p className="mt-auto pt-3 text-sm text-navy/65">
                          {ui.medianLabel} · <span className="font-semibold text-navy">{formatPpm(median, locale)}</span>
                        </p>
                      ) : null}
                      <span className="text-sm font-semibold text-navy">{ui.seeQuartier} →</span>
                    </div>
                  </Link>
                </li>
              );
            })}
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
