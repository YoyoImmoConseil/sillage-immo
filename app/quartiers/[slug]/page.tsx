import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRequestLocale } from "@/lib/i18n/request";
import { localizePath } from "@/lib/i18n/routing";
import { SITE_URL, buildPublicPageMetadata } from "@/lib/seo/site";
import { QUARTIERS, getQuartier } from "@/lib/quartiers/data";
import { QUARTIERS_UI } from "@/lib/quartiers/copy";
import { DVF_META, formatEur, formatInt, formatPpm, getNiceStats, getZoneStats } from "@/lib/quartiers/stats";
import { listQuartierListings } from "@/lib/quartiers/listings";
import { PropertyCard } from "@/app/components/property-card";
import { FinalCtaSection } from "@/app/_home/sections/final-cta-section";

type Params = { params: Promise<{ slug: string }> };

export const revalidate = 3600;

export function generateStaticParams() {
  return QUARTIERS.map((quartier) => ({ slug: quartier.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const quartier = getQuartier(slug);
  if (!quartier) return {};
  const locale = await getRequestLocale();
  const title =
    locale === "fr" ? quartier.seo.title : `${quartier.name}, Nice — ${quartier.tagline[locale]} | Sillage Immo`;
  const description = locale === "fr" ? quartier.seo.description : quartier.summary[locale];
  return buildPublicPageMetadata({ path: `/quartiers/${quartier.slug}`, locale, title, description, image: quartier.image.src });
}

const STAT_CARD = "rounded-[20px] bg-white p-5 ring-1 ring-navy/10";
const PRIMARY =
  "inline-flex items-center justify-center rounded-full bg-navy px-6 py-3 text-sm font-semibold text-sand shadow-sm transition hover:-translate-y-[1px] hover:opacity-95";
const SECONDARY =
  "inline-flex items-center justify-center rounded-full border border-navy px-6 py-3 text-sm font-semibold text-navy transition hover:bg-navy/5";

export default async function QuartierPage({ params }: Params) {
  const { slug } = await params;
  const quartier = getQuartier(slug);
  if (!quartier) notFound();

  const locale = await getRequestLocale();
  const ui = QUARTIERS_UI[locale];
  const stats = getZoneStats(quartier.statsKey);
  const nice = getNiceStats();
  const listings = await listQuartierListings(quartier, locale);
  const others = QUARTIERS.filter((item) => item.slug !== quartier.slug);
  const apt = stats?.apartments;
  const houses = stats?.houses;
  const mainYear = DVF_META.mainYear;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: `${quartier.name}, Nice`,
    description: locale === "fr" ? quartier.paragraphs[0] : quartier.summary[locale],
    url: `${SITE_URL}${localizePath(`/quartiers/${quartier.slug}`, locale)}`,
    image: `${SITE_URL}${quartier.image.src}`,
    geo: { "@type": "GeoCoordinates", latitude: quartier.center.lat, longitude: quartier.center.lng },
    containedInPlace: { "@type": "City", name: "Nice", postalCode: quartier.postalCodes[0] },
  };

  return (
    <main className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-navy text-sand">
        <Image src={quartier.image.src} alt={quartier.image.alt} fill priority sizes="100vw" className="object-cover object-center" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-navy/90 via-navy/65 to-navy/30" />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-navy/70 to-transparent" />
        <div className="relative flex min-h-[56vh] w-full items-end px-4 py-16 md:min-h-[64vh] md:px-10 md:py-24 xl:px-14 2xl:px-20">
          <div className="max-w-3xl space-y-4">
            <nav aria-label="Fil d'Ariane" className="text-xs uppercase tracking-[0.18em] text-sand/75">
              <Link href={localizePath("/", locale)} className="hover:underline">{ui.breadcrumbHome}</Link>
              <span aria-hidden="true"> · </span>
              <Link href={localizePath("/quartiers", locale)} className="hover:underline">{ui.breadcrumbIndex}</Link>
            </nav>
            <h1 className="sillage-section-title-font text-[34px] leading-[1.06] font-semibold tracking-tight md:text-5xl xl:text-[56px]">
              {quartier.name}
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-sand md:text-lg">{quartier.tagline[locale]}</p>
            {apt?.medianPpmMainYear ? (
              <p className="inline-flex items-center gap-2 rounded-full bg-sand/15 px-4 py-2 text-sm text-sand ring-1 ring-sand/30">
                {ui.apartmentsMedian} {mainYear} · <strong>{formatPpm(apt.medianPpmMainYear, locale)}</strong>
              </p>
            ) : null}
          </div>
        </div>
        <p className="absolute bottom-3 right-4 text-[10px] text-sand/50">{quartier.image.credit}</p>
      </section>

      {/* Éditorial */}
      <section className="bg-white">
        <div className="w-full px-4 py-16 md:px-10 md:py-24 xl:px-14 2xl:px-20">
          <div className="grid gap-10 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:gap-16">
            <div className="space-y-5">
              {locale !== "fr" ? (
                <>
                  <p className="sillage-editorial-text text-navy">{quartier.summary[locale]}</p>
                  <p className="text-xs text-navy/55">{ui.frenchOnlyNote}</p>
                </>
              ) : null}
              {quartier.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 40)} className="sillage-editorial-text text-navy/85">
                  {paragraph}
                </p>
              ))}
            </div>
            <aside className="space-y-6">
              <div className="rounded-[24px] bg-sand/40 p-6 ring-1 ring-navy/10">
                <h2 className="font-serif text-xl font-semibold text-navy">{ui.whoTitle}</h2>
                <p className="mt-3 text-sm leading-relaxed text-navy/80">{quartier.who}</p>
              </div>
              <div className="rounded-[24px] bg-sand/40 p-6 ring-1 ring-navy/10">
                <h2 className="font-serif text-xl font-semibold text-navy">{ui.transportTitle}</h2>
                <p className="mt-3 text-sm leading-relaxed text-navy/80">{quartier.transport}</p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Le marché */}
      {stats && apt ? (
        <section aria-labelledby="quartier-market-title" className="sillage-section-light">
          <div className="w-full px-4 py-16 md:px-10 md:py-24 xl:px-14 2xl:px-20 space-y-10">
            <div className="max-w-3xl space-y-4">
              <p className="text-xs uppercase tracking-[0.22em] text-navy/65">{ui.marketEyebrow}</p>
              <h2 id="quartier-market-title" className="sillage-section-title">
                {ui.marketTitle(quartier.name)}
              </h2>
              <p className="text-sm text-navy/65">
                {ui.salesCount(stats.sales.mainYear, mainYear)} · {ui.niceMedian} : {formatPpm(nice.apartments.medianPpmMainYear ?? nice.apartments.medianPpm ?? 0, locale)}
              </p>
            </div>

            <dl className="grid gap-4 md:grid-cols-3">
              <div className={STAT_CARD}>
                <dt className="text-xs uppercase tracking-[0.18em] text-navy/55">{ui.apartmentsMedian}</dt>
                <dd className="mt-2 font-serif text-3xl font-semibold text-navy">{formatPpm(apt.medianPpmMainYear ?? apt.medianPpm ?? 0, locale)}</dd>
                <dd className="mt-1 text-xs text-navy/55">{mainYear} · {formatInt(apt.nMainYear, locale)} ventes · {apt.medianSurface} m² méd.</dd>
              </div>
              <div className={STAT_CARD}>
                <dt className="text-xs uppercase tracking-[0.18em] text-navy/55">{ui.apartmentsRange}</dt>
                <dd className="mt-2 font-serif text-3xl font-semibold text-navy">
                  {apt.q1Ppm && apt.q3Ppm ? `${formatInt(apt.q1Ppm, locale)} – ${formatPpm(apt.q3Ppm, locale)}` : "—"}
                </dd>
                <dd className="mt-1 text-xs text-navy/55">{DVF_META.years.join("–")}</dd>
              </div>
              <div className={STAT_CARD}>
                <dt className="text-xs uppercase tracking-[0.18em] text-navy/55">{ui.apartmentsTop}</dt>
                <dd className="mt-2 font-serif text-3xl font-semibold text-navy">{apt.p90Ppm ? formatPpm(apt.p90Ppm, locale) : "—"}</dd>
                <dd className="mt-1 text-xs text-navy/55">{ui.apartmentsTopHint}</dd>
              </div>
              {houses && houses.n >= 10 && houses.medianPrice ? (
                <div className={STAT_CARD}>
                  <dt className="text-xs uppercase tracking-[0.18em] text-navy/55">{ui.housesMedian}</dt>
                  <dd className="mt-2 font-serif text-3xl font-semibold text-navy">{formatEur(houses.medianPrice, locale)}</dd>
                  <dd className="mt-1 text-xs text-navy/55">{houses.n} ventes · {houses.medianSurface} m² {ui.housesSurface}</dd>
                </div>
              ) : houses && houses.n > 0 && houses.n < 10 ? (
                <div className={STAT_CARD}>
                  <dt className="text-xs uppercase tracking-[0.18em] text-navy/55">{ui.housesMedian}</dt>
                  <dd className="mt-2 text-sm text-navy/70">{ui.housesFew}</dd>
                </div>
              ) : null}
              {stats.seafront ? (
                <div className={`${STAT_CARD} md:col-span-2`}>
                  <dt className="text-xs uppercase tracking-[0.18em] text-navy/55">{ui.seafrontTitle}</dt>
                  <dd className="mt-2 grid gap-3 sm:grid-cols-2">
                    <span>
                      <span className="block text-xs text-navy/55">{ui.seafrontAll} ({stats.seafront.n})</span>
                      <span className="font-serif text-2xl font-semibold text-navy">{formatPpm(stats.seafront.medianPpm, locale)}</span>
                      {stats.seafront.p90Ppm ? <span className="block text-xs text-navy/55">{ui.apartmentsTop} : {formatPpm(stats.seafront.p90Ppm, locale)}</span> : null}
                    </span>
                    <span>
                      <span className="block text-xs text-navy/55">{ui.seafrontCentre} ({stats.seafront.centre.n})</span>
                      <span className="font-serif text-2xl font-semibold text-navy">{formatPpm(stats.seafront.centre.medianPpm, locale)}</span>
                      {stats.seafront.centre.p90Ppm ? <span className="block text-xs text-navy/55">{ui.apartmentsTop} : {formatPpm(stats.seafront.centre.p90Ppm, locale)}</span> : null}
                    </span>
                  </dd>
                </div>
              ) : null}
            </dl>

            <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] md:items-start">
              <div className="rounded-[24px] bg-navy p-6 text-sand md:p-8">
                <p className="text-xs uppercase tracking-[0.22em] text-sand/70">{ui.adviceEyebrow}</p>
                <p className="mt-3 font-serif text-lg leading-relaxed md:text-xl">{quartier.advice}</p>
                <Link href={localizePath("/estimation", locale)} className="mt-6 inline-flex items-center justify-center rounded-full bg-sand px-6 py-3 text-sm font-semibold text-navy transition hover:opacity-95">
                  {ui.estimateCta}
                </Link>
              </div>
              <p className="text-xs leading-relaxed text-navy/55">
                <strong>{ui.sourceLabel}</strong> : {DVF_META.source}, {DVF_META.years.join(" et ")} (calcul Sillage Immo, {DVF_META.computedAt}).{" "}
                <strong>{ui.methodLabel}</strong> : {DVF_META.method}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {/* Adresses */}
      <section aria-labelledby="quartier-places-title" className="bg-white">
        <div className="w-full px-4 py-16 md:px-10 md:py-24 xl:px-14 2xl:px-20 space-y-10">
          <div className="max-w-3xl space-y-4">
            <p className="text-xs uppercase tracking-[0.22em] text-navy/65">{ui.placesEyebrow}</p>
            <h2 id="quartier-places-title" className="sillage-section-title">
              {ui.placesTitle}
            </h2>
            <p className="sillage-editorial-text text-navy/80">{ui.placesIntro}</p>
          </div>
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {quartier.places.map((place) => (
              <li key={`${place.kind}-${place.name}`} className="flex flex-col gap-2 rounded-[20px] bg-sand/40 p-5 ring-1 ring-navy/10">
                <span className="text-[11px] uppercase tracking-[0.18em] text-navy/55">{ui.kinds[place.kind]}</span>
                <h3 className="font-serif text-lg font-semibold text-navy">{place.name}</h3>
                <p className="text-xs text-navy/60">{place.address}</p>
                <p className="text-sm leading-relaxed text-navy/80">{place.note}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Biens Sillage */}
      <section aria-labelledby="quartier-listings-title" className="sillage-section-light">
        <div className="w-full px-4 py-16 md:px-10 md:py-24 xl:px-14 2xl:px-20 space-y-8">
          <h2 id="quartier-listings-title" className="sillage-section-title">
            {ui.listingsTitle(quartier.name)}
          </h2>
          {listings.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {listings.map((listing) => (
                <PropertyCard key={listing.id} listing={listing} locale={locale} />
              ))}
            </div>
          ) : (
            <p className="max-w-2xl text-sm leading-relaxed text-navy/75 md:text-base">{ui.listingsEmpty(quartier.name)}</p>
          )}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href={`${localizePath("/recherche/nouvelle", locale)}?city=Nice`} className={PRIMARY}>
              {ui.alertCta}
            </Link>
            <Link href={localizePath("/vente", locale)} className={SECONDARY}>
              {ui.listingsCta}
            </Link>
          </div>
        </div>
      </section>

      {/* Autres quartiers */}
      <section aria-labelledby="quartier-others-title" className="bg-white">
        <div className="w-full px-4 py-12 md:px-10 md:py-16 xl:px-14 2xl:px-20 space-y-6">
          <h2 id="quartier-others-title" className="font-serif text-2xl font-semibold text-navy">
            {ui.otherQuartiers}
          </h2>
          <ul className="flex flex-wrap gap-3">
            {others.map((item) => (
              <li key={item.slug}>
                <Link href={localizePath(`/quartiers/${item.slug}`, locale)} className="inline-flex rounded-full bg-sand/60 px-4 py-2 text-sm font-semibold text-navy ring-1 ring-navy/10 transition hover:bg-sand">
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <FinalCtaSection locale={locale} />
    </main>
  );
}
