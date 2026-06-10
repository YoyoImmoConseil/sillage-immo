"use client";

import Link from "next/link";
import type { AppLocale } from "@/lib/i18n/config";
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
    <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-[#f4ece4] p-8">
      <h2 className="text-xl font-semibold text-[#141446]">{copy.sectionMatches}</h2>
      {matchListItems.length === 0 ? (
        <p className="mt-3 text-sm text-[#141446]/70">{copy.noMatches}</p>
      ) : (
        <ul className="mt-4 grid gap-4 md:grid-cols-2">
          {matchListItems.map((match) => (
            <li
              key={match.id}
              className="relative rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-5"
            >
              {match.isNew ? (
                <span className="absolute right-4 top-4 rounded-full bg-[#141446] px-3 py-1 text-xs font-semibold text-[#f4ece4]">
                  {copy.newBadge}
                </span>
              ) : null}
              <p className="text-sm font-semibold text-[#141446]">
                {match.title ?? match.propertyType ?? match.propertyId}
              </p>
              <p className="mt-1 text-sm text-[#141446]/75">
                {[match.city, match.propertyType].filter(Boolean).join(" · ")}
              </p>
              {match.priceAmount !== null ? (
                <p className="mt-1 text-sm text-[#141446]/80">
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
              <p className="mt-2 text-xs text-[#141446]/60">
                {copy.scoreLabel} · {match.score}
              </p>
              <Link
                href={match.canonicalPath}
                className="mt-3 inline-block sillage-btn-secondary rounded px-3 py-1.5 text-sm"
              >
                {copy.openListing}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
