"use client";

import Image from "next/image";
import Link from "next/link";
import type { AppLocale } from "@/lib/i18n/config";
import { formatPropertyTypeLabel } from "@/lib/i18n/domain";
import { humanizeListingTitle } from "@/lib/properties/listing-title";
import type { BuyerSearchMatchListItem } from "@/services/buyers/buyer-portal.service";
import type { DashboardCopy } from "./buyer-search-helpers";

type BuyerSearchMatchesSectionProps = {
  copy: DashboardCopy;
  locale: AppLocale;
  matchListItems: BuyerSearchMatchListItem[];
};

export function BuyerSearchMatchesSection({
  copy,
  locale,
  matchListItems,
}: BuyerSearchMatchesSectionProps) {
  return (
    <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-sand p-8">
      <h2 className="text-xl font-semibold text-navy">{copy.sectionMatches}</h2>
      {matchListItems.length === 0 ? (
        <p className="mt-3 text-sm text-navy/70">{copy.noMatches}</p>
      ) : (
        <ul className="mt-4 grid gap-4 md:grid-cols-2">
          {matchListItems.map((match) => (
            <li
              key={match.id}
              className="relative overflow-hidden rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white"
            >
              <Link href={match.canonicalPath} className="relative block aspect-[16/10] w-full bg-navy/5">
                {match.coverImageUrl ? (
                  <Image
                    src={match.coverImageUrl}
                    alt={humanizeListingTitle(match.title) ?? ""}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                  />
                ) : null}
              </Link>
              {match.isNew ? (
                <span className="absolute right-4 top-4 rounded-full bg-navy px-3 py-1 text-xs font-semibold text-sand">
                  {copy.newBadge}
                </span>
              ) : null}
              <div className="p-5">
              <p className="font-serif text-sm font-semibold text-navy">
                {humanizeListingTitle(match.title) ?? formatPropertyTypeLabel(match.propertyType, locale) ?? match.propertyId}
              </p>
              <p className="mt-1 text-sm text-navy/75">
                {[match.city, formatPropertyTypeLabel(match.propertyType, locale)].filter(Boolean).join(" · ")}
              </p>
              {match.priceAmount !== null ? (
                <p className="mt-1 text-sm text-navy/80">
                  {match.priceAmount.toLocaleString(
                    locale === "en"
                      ? "en-US"
                      : locale === "es"
                        ? "es-ES"
                        : locale === "ru"
                          ? "ru-RU"
                          : "fr-FR"
                  )}{" "}
                  €
                </p>
              ) : null}
              <p className="mt-2 text-xs text-navy/60">
                {copy.scoreLabel} · {match.score} %
              </p>
              <Link
                href={match.canonicalPath}
                className="mt-3 inline-block sillage-btn-secondary rounded px-3 py-1.5 text-sm"
              >
                {copy.openListing}
              </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
