import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { AppLocale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";
import { localizePath } from "@/lib/i18n/routing";
import {
  buildListingPriceSublines,
  formatListingPrice,
  getListingDisplayAmountCents,
  LISTING_PRICE_COPY,
} from "@/lib/properties/listing-price";
import { formatPropertyTypeLabel } from "@/lib/properties/property-type-label";
import { humanizeListingTitle } from "@/lib/properties/listing-title";
import type { PublicPropertyListingSummary } from "@/types/domain/properties";
import { ListingStatusBanner } from "./listing-status-banner";
import { EnergyClassBadges } from "./property-energy-scale";

type PropertyCardProps = {
  listing: PublicPropertyListingSummary;
  locale?: AppLocale;
};

export function PropertyCard({ listing, locale = "fr" }: PropertyCardProps) {
  const copy = {
    fr: {
      photoSoon: "Photo à venir",
      asset: "Bien",
      surface: "Surface",
      rooms: "pièces",
      roomsOne: "pièce",
      bedrooms: "chambres",
      bedroomsOne: "chambre",
      excessiveEnergy: "Logement à consommation énergétique excessive",
      coverFallback: "Bien immobilier Sillage Immo",
      titleFallback: "Bien Sillage Immo",
      dpeUnit: "kWh/m²/an",
      gesUnit: "kgCO₂/m²/an",
    },
    en: {
      photoSoon: "Photo coming soon",
      asset: "Property",
      surface: "Area",
      rooms: "rooms",
      roomsOne: "room",
      bedrooms: "bedrooms",
      bedroomsOne: "bedroom",
      excessiveEnergy: "Excessive energy consumption housing",
      coverFallback: "Sillage Immo property",
      titleFallback: "Sillage Immo property",
      dpeUnit: "kWh/m²/yr",
      gesUnit: "kgCO₂/m²/yr",
    },
    es: {
      photoSoon: "Foto próximamente",
      asset: "Inmueble",
      surface: "Superficie",
      rooms: "estancias",
      roomsOne: "estancia",
      bedrooms: "dormitorios",
      bedroomsOne: "dormitorio",
      excessiveEnergy: "Vivienda de consumo energético excesivo",
      coverFallback: "Inmueble Sillage Immo",
      titleFallback: "Inmueble Sillage Immo",
      dpeUnit: "kWh/m²/año",
      gesUnit: "kgCO₂/m²/año",
    },
    ru: {
      photoSoon: "Фото скоро появится",
      asset: "Объект",
      surface: "Площадь",
      rooms: "комн.",
      roomsOne: "комн.",
      bedrooms: "спален",
      bedroomsOne: "спальня",
      excessiveEnergy: "Жильё с чрезмерным энергопотреблением",
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
    displayAmountCents: getListingDisplayAmountCents(listing.price, listing.priceAmount),
  });
  const typeLabel = formatPropertyTypeLabel(listing.propertyType, locale) ?? copy.asset;
  const isRental = listing.price.kind === "rental";

  // Trois chiffres seulement sur la carte : surface, pièces, chambres.
  // Lots, charges et le détail énergétique restent sur la fiche.
  const figures: Array<{ key: string; node: ReactNode }> = [];
  const surface = listing.loiCarrezArea ?? listing.livingArea;
  if (typeof surface === "number") {
    // Surface arrondie sur la carte ; la valeur Carrez exacte est sur la fiche.
    figures.push({
      key: "surface",
      node: `${formatNumber(surface, locale, { maximumFractionDigits: 0 })} m²`,
    });
  }
  if (typeof listing.roomCount === "number") {
    figures.push({
      key: "rooms",
      node: `${listing.roomCount} ${listing.roomCount > 1 ? copy.rooms : copy.roomsOne}`,
    });
  }
  if (typeof listing.bedrooms === "number" && listing.bedrooms > 0) {
    figures.push({
      key: "bedrooms",
      node: `${listing.bedrooms} ${listing.bedrooms > 1 ? copy.bedrooms : copy.bedroomsOne}`,
    });
  }
  const displayTitle = humanizeListingTitle(listing.title) ?? copy.titleFallback;
  const isExcessiveEnergy = ["F", "G"].includes((listing.energy.dpeLabel ?? "").toUpperCase());

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
            <h2 className="font-serif text-lg font-semibold leading-snug">
              {displayTitle}
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
          {figures.length > 0 ? (
            <p className="order-3 flex flex-wrap items-center gap-x-2 text-sm text-navy/80">
              {figures.map((item, index) => (
                <span key={item.key} className="inline-flex items-center gap-x-2">
                  {index > 0 ? <span aria-hidden className="text-navy/35">·</span> : null}
                  {item.node}
                </span>
              ))}
            </p>
          ) : null}
          <div className="order-4 flex flex-col gap-1">
            <EnergyClassBadges dpeLabel={listing.energy.dpeLabel} gesLabel={listing.energy.gesLabel} />
            {isExcessiveEnergy ? (
              <p className="text-[11px] text-navy/65">{copy.excessiveEnergy}</p>
            ) : null}
          </div>
        </div>
      </Link>
    </article>
  );
}
