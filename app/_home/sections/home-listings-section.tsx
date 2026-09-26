import Link from "next/link";
import type { AppLocale } from "@/lib/i18n/config";
import { localizePath } from "@/lib/i18n/routing";
import {
  listPublicPropertyListings,
  toPublicPropertyListingSummary,
} from "@/services/properties/property-listing.service";
import { PropertyCard } from "@/app/components/property-card";
import { HOME_BLOCKS_COPY } from "../copy-blocks";
import { CAROUSEL_ITEM } from "../shared/carousel-item";
import { HCarousel } from "../shared/mobile-carousel";

type Props = { locale: AppLocale };

/**
 * Biens en vente juste sous le hero : un acquéreur voit des appartements sans
 * cliquer. Six derniers biens publiés ; carrousel sur mobile, grille 3 colonnes
 * sur ordinateur. Rendu nul si le catalogue est vide ou indisponible.
 */
export async function HomeListingsSection({ locale }: Props) {
  const copy = HOME_BLOCKS_COPY[locale].latest;
  let listings: ReturnType<typeof toPublicPropertyListingSummary>[] = [];
  try {
    const rows = await listPublicPropertyListings({
      locale,
      businessType: "sale",
      pageSize: 6,
    });
    listings = rows.map(toPublicPropertyListingSummary);
  } catch (error) {
    console.error("[home-listings] unavailable", error);
  }
  if (listings.length === 0) return null;

  return (
    <section aria-labelledby="home-listings-title" className="sillage-section-light">
      <div className="w-full px-4 py-14 md:px-10 md:py-20 xl:px-14 2xl:px-20 space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl space-y-3">
            <p className="text-xs uppercase tracking-[0.22em] text-navy/65">{copy.eyebrow}</p>
            <h2 id="home-listings-title" className="sillage-section-title">
              {copy.title}
            </h2>
            <p className="sillage-editorial-text text-navy/80">{copy.subtitle}</p>
          </div>
          <Link
            href={localizePath("/vente", locale)}
            data-track-cta="home_listings_all"
            data-track-location="home_listings"
            className="hidden shrink-0 items-center justify-center rounded-full border border-navy px-6 py-3 text-sm font-semibold text-navy transition hover:bg-navy/5 md:inline-flex"
          >
            {copy.cta}
          </Link>
        </div>

        <HCarousel
          desktopClassName="md:grid-cols-2 md:gap-6 xl:grid-cols-3"
          as="ul"
          indicator="bar"
          ariaLabel={copy.title}
        >
          {listings.map((item) => (
            <li key={item.id} className={`${CAROUSEL_ITEM} min-w-0`}>
              <PropertyCard listing={item} locale={locale} />
            </li>
          ))}
        </HCarousel>

        <Link
          href={localizePath("/vente", locale)}
          data-track-cta="home_listings_all_mobile"
          data-track-location="home_listings"
          className="inline-flex w-full items-center justify-center rounded-full border border-navy px-6 py-3 text-sm font-semibold text-navy transition hover:bg-navy/5 md:hidden"
        >
          {copy.cta}
        </Link>
      </div>
    </section>
  );
}
