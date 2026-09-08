import Image from "next/image";
import Link from "next/link";
import type { AppLocale } from "@/lib/i18n/config";
import { localizePath } from "@/lib/i18n/routing";
import {
  RECENT_SALES,
  RECENT_SALES_COPY,
  formatSalePrice,
} from "@/lib/brand/recent-sales";
import { CAROUSEL_ITEM } from "../shared/carousel-item";
import { HCarousel } from "../shared/mobile-carousel";

type Props = { locale: AppLocale };

/**
 * Preuve de résultat : trois ventes récentes avec photo, prix et délai de
 * vente. Placée juste après la section vendeur pour appuyer la promesse
 * (« vendre vite, au bon prix ») par des faits avant le parcours acquéreur.
 */
export function RecentSalesSection({ locale }: Props) {
  const copy = RECENT_SALES_COPY[locale];

  return (
    <section aria-labelledby="recent-sales-title" className="bg-white">
      <div className="w-full px-4 py-16 md:px-10 md:py-24 xl:px-14 2xl:px-20 space-y-10">
        <div className="max-w-3xl space-y-4">
          <p className="text-xs uppercase tracking-[0.22em] text-navy/65">
            {copy.eyebrow}
          </p>
          <h2 id="recent-sales-title" className="sillage-section-title">
            {copy.title}
          </h2>
          <p className="sillage-editorial-text text-navy/80">{copy.intro}</p>
        </div>

        {/* Mobile : carrousel horizontal. Desktop : 3 colonnes. */}
        <HCarousel
          desktopClassName="md:grid-cols-3 md:gap-6"
          as="ul"
          ariaLabel={copy.title}
        >
          {RECENT_SALES.map((sale) => (
            <li
              key={sale.id}
              className={`${CAROUSEL_ITEM} flex flex-col overflow-hidden rounded-[24px] bg-sand/40 ring-1 ring-navy/10`}
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden">
                <Image
                  src={sale.image}
                  alt={sale.imageAlt[locale]}
                  fill
                  sizes="(min-width: 768px) 33vw, 86vw"
                  className="object-cover"
                />
                <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-navy px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-sand shadow-sm">
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-sand" />
                  {copy.soldLabel}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-3 p-6">
                <p className="font-serif text-2xl font-semibold text-navy">
                  {copy.soldIn(sale.soldInDays)}
                </p>
                <h3 className="font-serif text-lg font-semibold leading-snug text-navy">
                  {sale.label[locale]}
                </h3>
                <p className="text-sm text-navy/70">
                  {sale.postalCode} {sale.city} · {copy.surface(sale.surfaceM2)}
                </p>
                <p className="mt-auto pt-2 text-base font-semibold text-navy">
                  {formatSalePrice(sale.priceEur, locale)}
                </p>
              </div>
            </li>
          ))}
        </HCarousel>

        <p className="max-w-3xl text-xs leading-relaxed text-navy/55">
          {copy.disclaimer}
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href={localizePath("/estimation", locale)}
            data-track-cta="recent_sales_estimation"
            data-track-location="recent_sales"
            className="inline-flex items-center justify-center rounded-full bg-navy px-6 py-3 text-sm font-semibold text-sand shadow-sm transition hover:-translate-y-[1px] hover:opacity-95"
          >
            {copy.cta}
          </Link>
          <a
            href="#methode"
            className="inline-flex items-center justify-center rounded-full border border-navy/30 bg-transparent px-6 py-3 text-sm font-semibold text-navy transition hover:bg-navy/5"
          >
            {copy.ctaSecondary}
          </a>
        </div>
      </div>
    </section>
  );
}
