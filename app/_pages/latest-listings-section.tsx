import Link from "next/link";
import type { AppLocale } from "@/lib/i18n/config";
import { localizePath } from "@/lib/i18n/routing";
import {
  listPublicPropertyListings,
  toPublicPropertyListingSummary,
} from "@/services/properties/property-listing.service";
import { PropertyCard } from "@/app/components/property-card";

type Props = {
  locale: AppLocale;
  businessType: "sale" | "rental";
  copy: { eyebrow: string; title: string; subtitle: string; cta: string };
  catalogPath: "/vente" | "/location";
};

/** Trois derniers biens publiés (vente ou location) avec renvoi vers le catalogue. */
export async function LatestListingsSection({ locale, businessType, copy, catalogPath }: Props) {
  let listings: ReturnType<typeof toPublicPropertyListingSummary>[] = [];
  try {
    const rows = await listPublicPropertyListings({ locale, businessType, pageSize: 3 });
    listings = rows.map(toPublicPropertyListingSummary);
  } catch (error) {
    console.error("[latest-listings] unavailable", error);
  }
  if (listings.length === 0) return null;

  return (
    <section aria-labelledby={`latest-${businessType}-title`} className="sillage-section-light">
      <div className="w-full px-4 py-16 md:px-10 md:py-24 xl:px-14 2xl:px-20 space-y-10">
        <div className="max-w-3xl space-y-4">
          <p className="text-xs uppercase tracking-[0.22em] text-navy/65">{copy.eyebrow}</p>
          <h2 id={`latest-${businessType}-title`} className="sillage-section-title">
            {copy.title}
          </h2>
          <p className="sillage-editorial-text text-navy/80">{copy.subtitle}</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {listings.map((item) => (
            <PropertyCard key={item.id} listing={item} locale={locale} />
          ))}
        </div>
        <Link
          href={localizePath(catalogPath, locale)}
          className="inline-flex items-center justify-center rounded-full border border-navy px-6 py-3 text-sm font-semibold text-navy transition hover:bg-navy/5"
        >
          {copy.cta}
        </Link>
      </div>
    </section>
  );
}
