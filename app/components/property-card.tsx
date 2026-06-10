import Image from "next/image";
import Link from "next/link";
import type { AppLocale } from "@/lib/i18n/config";
import { formatCurrency } from "@/lib/i18n/format";
import { localizePath } from "@/lib/i18n/routing";
import { formatPropertyTypeLabel } from "@/lib/properties/property-type-label";
import type { PropertySaleSnapshot, PublicPropertyListingSummary } from "@/types/domain/properties";
import { ListingStatusBanner } from "./listing-status-banner";
import { PropertyEnergyScale } from "./property-energy-scale";

type PropertyCardProps = {
  listing: PublicPropertyListingSummary;
  locale?: AppLocale;
};

const formatListingPrice = (input: { amount: number | null; currency: string; locale: AppLocale }) => {
  if (typeof input.amount !== "number") {
    return input.locale === "en"
      ? "Price on request"
      : input.locale === "es"
        ? "Precio a consultar"
        : input.locale === "ru"
          ? "Цена по запросу"
          : "Prix sur demande";
  }
  return formatCurrency(input.amount, input.locale, input.currency || "EUR");
};

const formatCompactPrice = (value: number | null, currency: string, locale: AppLocale) => {
  if (typeof value !== "number") {
    return locale === "en"
      ? "Price on request"
      : locale === "es"
        ? "Precio a consultar"
        : locale === "ru"
          ? "Цена по запросу"
          : "Prix sur demande";
  }
  return formatCurrency(value, locale, currency);
};

const formatFeeMention = (input: {
  sale: PropertySaleSnapshot;
  currency: string;
  locale: AppLocale;
}) => {
  if (input.sale.feeChargeBearer !== "buyer" || typeof input.sale.feeAmount !== "number") {
    return null;
  }

  if (input.locale === "en") {
    return `Including ${formatCompactPrice(input.sale.feeAmount, input.currency, input.locale)} fees payable by the buyer`;
  }
  if (input.locale === "es") {
    return `Incluye ${formatCompactPrice(input.sale.feeAmount, input.currency, input.locale)} de honorarios a cargo del comprador`;
  }
  if (input.locale === "ru") {
    return `Включая ${formatCompactPrice(input.sale.feeAmount, input.currency, input.locale)} комиссии за счет покупателя`;
  }
  return `Incluant ${formatCompactPrice(input.sale.feeAmount, input.currency, input.locale)} d'honoraires à la charge de l'acquéreur`;
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
  const feeMention = formatFeeMention({
    sale: listing.sale,
    currency: listing.priceCurrency,
    locale,
  });

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
        </div>
        <div className="space-y-3 p-5 text-navy">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.14em] text-navy/60">
              🏠 {formatPropertyTypeLabel(listing.propertyType, locale) ?? copy.asset} {listing.city ? `• ${listing.city}` : ""}
            </p>
            <h2 className="text-xl font-semibold leading-tight">
              {listing.title ?? copy.titleFallback}
            </h2>
            <p className="text-sm text-navy/72">
              {[listing.city, listing.postalCode].filter(Boolean).join(" ")}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-lg font-semibold">
              💶{" "}
              {formatListingPrice({
                amount: listing.priceAmount,
                currency: listing.priceCurrency,
                locale,
              })}
            </p>
            {feeMention ? <p className="text-xs text-navy/72">{feeMention}</p> : null}
          </div>
          <div className="grid gap-2 text-sm text-navy/80 sm:grid-cols-2">
            <div className="rounded-xl bg-white/55 px-3 py-2">
              📐 {copy.carrez}:{" "}
              {typeof listing.loiCarrezArea === "number"
                ? `${Math.round(listing.loiCarrezArea)} m²`
                : "-"}
            </div>
            <div className="rounded-xl bg-white/55 px-3 py-2">
              🛋️ {copy.rooms}: {typeof listing.roomCount === "number" ? listing.roomCount : "-"}
            </div>
            <div className="rounded-xl bg-white/55 px-3 py-2">
              🏢 {copy.lots}: {typeof listing.lotCount === "number" ? listing.lotCount : "-"}
            </div>
            <div className="rounded-xl bg-white/55 px-3 py-2">
              🧾 {copy.charges}:{" "}
              {typeof listing.annualCharges === "number"
                ? formatCompactPrice(listing.annualCharges, listing.priceCurrency, locale)
                : "-"}
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <PropertyEnergyScale
              title="⚡ DPE"
              value={listing.energy.dpeValue}
              label={listing.energy.dpeLabel}
              unit={copy.dpeUnit}
              compact
              locale={locale}
            />
            <PropertyEnergyScale
              title="🌿 GES"
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
