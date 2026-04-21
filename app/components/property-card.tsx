/* eslint-disable @next/next/no-img-element */
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
    fr: { photoSoon: "Photo à venir", asset: "Bien", carrez: "Carrez", rooms: "Pièces", lots: "Lots", charges: "Charges" },
    en: { photoSoon: "Photo coming soon", asset: "Property", carrez: "Carrez", rooms: "Rooms", lots: "Lots", charges: "Charges" },
    es: { photoSoon: "Foto próximamente", asset: "Inmueble", carrez: "Carrez", rooms: "Habitaciones", lots: "Lotes", charges: "Gastos" },
    ru: { photoSoon: "Фото скоро появится", asset: "Объект", carrez: "Каррез", rooms: "Комнаты", lots: "Лоты", charges: "Платежи" },
  }[locale];
  const feeMention = formatFeeMention({
    sale: listing.sale,
    currency: listing.priceCurrency,
    locale,
  });

  return (
    <article className="overflow-hidden rounded-2xl border border-[rgba(20,20,70,0.18)] bg-[#f4ece4]">
      <Link href={localizePath(listing.canonicalPath, locale)} className="block">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-[rgba(20,20,70,0.08)]">
          {listing.coverImageUrl ? (
            <img
              src={listing.coverImageUrl}
              alt={listing.title ?? "Bien immobilier Sillage Immo"}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[#141446]/65">
              {copy.photoSoon}
            </div>
          )}
          <ListingStatusBanner
            availabilityStatus={listing.availabilityStatus}
            locale={locale}
            compact
          />
        </div>
        <div className="space-y-3 p-5 text-[#141446]">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.14em] text-[#141446]/60">
              🏠 {formatPropertyTypeLabel(listing.propertyType, locale) ?? copy.asset} {listing.city ? `• ${listing.city}` : ""}
            </p>
            <h2 className="text-xl font-semibold leading-tight">
              {listing.title ?? "Bien Sillage Immo"}
            </h2>
            <p className="text-sm text-[#141446]/72">
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
            {feeMention ? <p className="text-xs text-[#141446]/72">{feeMention}</p> : null}
          </div>
          <div className="grid gap-2 text-sm text-[#141446]/80 sm:grid-cols-2">
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
              unit="kWh/m²/an"
              compact
            />
            <PropertyEnergyScale
              title="🌿 GES"
              value={listing.energy.gesValue}
              label={listing.energy.gesLabel}
              unit="kgCO₂/m²/an"
              compact
            />
          </div>
        </div>
      </Link>
    </article>
  );
}
