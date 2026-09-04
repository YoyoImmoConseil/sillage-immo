import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { AppLocale } from "@/lib/i18n/config";
import { formatCurrency, formatLoiCarrezArea } from "@/lib/i18n/format";
import { localizePath } from "@/lib/i18n/routing";
import {
  buildListingPriceSublines,
  formatListingPrice,
  getListingDisplayAmountCents,
  LISTING_PRICE_COPY,
} from "@/lib/properties/listing-price";
import { formatPropertyTypeLabel } from "@/lib/properties/property-type-label";
import type { PublicPropertyListingSummary } from "@/types/domain/properties";
import { ListingStatusBanner } from "./listing-status-banner";
import { PropertyEnergyScale } from "./property-energy-scale";

type PropertyCardProps = {
  listing: PublicPropertyListingSummary;
  locale?: AppLocale;
};

export function PropertyCard({ listing, locale = "fr" }: PropertyCardProps) {
  const copy = {
    fr: {
      photoSoon: "Photo à venir",
      asset: "Bien",
      carrez: "Carrez",
      rooms: "Pièces",
      lots: "Lots",
      charges: "Charges",
      coverFallback: "Bien immobilier Sillage Immo",
      titleFallback: "Bien Sillage Immo",
      dpeUnit: "kWh/m²/an",
      gesUnit: "kgCO₂/m²/an",
    },
    en: {
      photoSoon: "Photo coming soon",
      asset: "Property",
      carrez: "Carrez",
      rooms: "Rooms",
      lots: "Lots",
      charges: "Charges",
      coverFallback: "Sillage Immo property",
      titleFallback: "Sillage Immo property",
      dpeUnit: "kWh/m²/yr",
      gesUnit: "kgCO₂/m²/yr",
    },
    es: {
      photoSoon: "Foto próximamente",
      asset: "Inmueble",
      carrez: "Carrez",
      rooms: "Habitaciones",
      lots: "Lotes",
      charges: "Gastos",
      coverFallback: "Inmueble Sillage Immo",
      titleFallback: "Inmueble Sillage Immo",
      dpeUnit: "kWh/m²/año",
      gesUnit: "kgCO₂/m²/año",
    },
    ru: {
      photoSoon: "Фото скоро появится",
      asset: "Объект",
      carrez: "Каррез",
      rooms: "Комнаты",
      lots: "Лоты",
      charges: "Платежи",
      coverFallback: "Объект Sillage Immo",
      titleFallback: "Объект Sillage Immo",
      dpeUnit: "кВт·ч/м²/год",
      gesUnit: "кгCO₂/м²/год",
    },
  }[locale];

  const priceCopy = LISTING_PRICE_COPY[locale];
  const priceSublines = buildListingPriceSublines({
    price: listing.price,
    currency: listing.priceCurrency,
    locale,
  });
  const typeLabel = formatPropertyTypeLabel(listing.propertyType, locale) ?? copy.asset;
  const isRental = listing.price.kind === "rental";

  // Champs vides masqués proprement (plus de « - ») : on ne construit que les
  // critères réellement renseignés → une fiche parking n'affiche que ses champs utiles.
  const criteria: Array<{ key: string; node: ReactNode }> = [];
  if (typeof listing.loiCarrezArea === "number") {
    criteria.push({
      key: "carrez",
      node: `${copy.carrez}: ${formatLoiCarrezArea(listing.loiCarrezArea, locale)}`,
    });
  }
  if (typeof listing.roomCount === "number") {
    criteria.push({ key: "rooms", node: `${copy.rooms}: ${listing.roomCount}` });
  }
  if (typeof listing.lotCount === "number") {
    criteria.push({ key: "lots", node: `${copy.lots}: ${listing.lotCount}` });
  }
  if (typeof listing.annualCharges === "number") {
    criteria.push({
      key: "charges",
      node: `${copy.charges}: ${formatCurrency(listing.annualCharges, locale, listing.priceCurrency)}`,
    });
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-[rgba(20,20,70,0.18)] bg-sand">
      <Link
        href={localizePath(listing.canonicalPath, locale)}
        className="block"
        data-track-property-card={listing.id}
        data-track-property-price={listing.priceAmount ?? undefined}
        data-track-property-type={listing.propertyType ?? undefined}
        data-track-property-city={listing.city ?? undefined}
        data-track-location="property_card"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-[rgba(20,20,70,0.08)]">
          {listing.coverImageUrl ? (
            <Image
              src={listing.coverImageUrl}
              alt={listing.title ?? copy.coverFallback}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-navy/65">
              {copy.photoSoon}
            </div>
          )}
          <ListingStatusBanner
            availabilityStatus={listing.availabilityStatus}
            locale={locale}
            compact
          />
          {/* Badge de type en overlay — mobile uniquement (desktop inchangé). */}
          <span className="absolute bottom-2 left-2 rounded-full bg-navy/85 px-2.5 py-1 text-xs font-medium text-sand md:hidden">
            {typeLabel}
          </span>
        </div>
        {/*
          Hiérarchie mobile (flex + order) : photo → prix → titre → critères.
          Sur desktop, `md:order-*` rétablit l'ordre d'origine (titre → prix).
        */}
        <div className="flex flex-col gap-3 p-5 text-navy">
          <div className="order-2 space-y-1 md:order-1">
            <p className="text-xs uppercase tracking-[0.14em] text-navy/60">
              {/* Mobile : ville seule (le type est en overlay) ; desktop : type • ville. */}
              <span className="md:hidden">{listing.city ?? typeLabel}</span>
              <span className="max-md:hidden">
                {typeLabel} {listing.city ? `• ${listing.city}` : ""}
              </span>
            </p>
            <h2 className="text-xl font-semibold leading-tight">
              {listing.title ?? copy.titleFallback}
            </h2>
            <p className="text-sm text-navy/72">
              {[listing.city, listing.postalCode].filter(Boolean).join(" ")}
            </p>
          </div>
          <div className="order-1 space-y-1 md:order-2">
            <p className="text-lg font-semibold">
              {formatListingPrice({
                amountCents: getListingDisplayAmountCents(listing.price, listing.priceAmount),
                currency: listing.priceCurrency,
                locale,
                periodSuffix: isRental ? priceCopy.perMonth : undefined,
              })}
            </p>
            {priceSublines.map((line) => (
              <p key={line.key} className="text-xs text-navy/72">
                {line.text}
              </p>
            ))}
          </div>
          {criteria.length > 0 ? (
            <div className="order-3 grid gap-2 text-sm text-navy/80 sm:grid-cols-2">
              {criteria.map((item) => (
                <div key={item.key} className="rounded-xl bg-white/55 px-3 py-2">
                  {item.node}
                </div>
              ))}
            </div>
          ) : null}
          <div className="order-4 grid gap-2 md:grid-cols-2">
            <PropertyEnergyScale
              title="DPE"
              value={listing.energy.dpeValue}
              label={listing.energy.dpeLabel}
              unit={copy.dpeUnit}
              compact
              locale={locale}
            />
            <PropertyEnergyScale
              title="GES"
              value={listing.energy.gesValue}
              label={listing.energy.gesLabel}
              unit={copy.gesUnit}
              compact
              locale={locale}
            />
          </div>
        </div>
      </Link>
    </article>
  );
}
