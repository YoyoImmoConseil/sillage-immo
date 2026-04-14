/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { formatPropertyTypeLabel } from "@/lib/properties/property-type-label";
import type { PropertySaleSnapshot, PublicPropertyListingSummary } from "@/types/domain/properties";
import { PropertyEnergyScale } from "./property-energy-scale";

type PropertyCardProps = {
  listing: PublicPropertyListingSummary;
};

const formatListingPrice = (input: { amount: number | null; currency: string }) => {
  if (typeof input.amount !== "number") return "Prix sur demande";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: input.currency || "EUR",
    maximumFractionDigits: 0,
  }).format(input.amount);
};

const formatCompactPrice = (value: number | null, currency: string) => {
  if (typeof value !== "number") return "Prix sur demande";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatFeeMention = (input: {
  sale: PropertySaleSnapshot;
  currency: string;
}) => {
  if (input.sale.feeChargeBearer !== "buyer" || typeof input.sale.feeAmount !== "number") {
    return null;
  }

  return `Incluant ${formatCompactPrice(input.sale.feeAmount, input.currency)} d'honoraires à la charge de l'acquéreur`;
};

export function PropertyCard({ listing }: PropertyCardProps) {
  const feeMention = formatFeeMention({
    sale: listing.sale,
    currency: listing.priceCurrency,
  });

  return (
    <article className="overflow-hidden rounded-2xl border border-[rgba(20,20,70,0.18)] bg-[#f4ece4]">
      <Link href={listing.canonicalPath} className="block">
        <div className="aspect-[4/3] w-full overflow-hidden bg-[rgba(20,20,70,0.08)]">
          {listing.coverImageUrl ? (
            <img
              src={listing.coverImageUrl}
              alt={listing.title ?? "Bien immobilier Sillage Immo"}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[#141446]/65">
              Photo à venir
            </div>
          )}
        </div>
        <div className="space-y-3 p-5 text-[#141446]">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.14em] text-[#141446]/60">
              🏠 {formatPropertyTypeLabel(listing.propertyType) ?? "Bien"} {listing.city ? `• ${listing.city}` : ""}
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
              })}
            </p>
            {feeMention ? <p className="text-xs text-[#141446]/72">{feeMention}</p> : null}
          </div>
          <div className="grid gap-2 text-sm text-[#141446]/80 sm:grid-cols-2">
            <div className="rounded-xl bg-white/55 px-3 py-2">
              📐 Carrez:{" "}
              {typeof listing.loiCarrezArea === "number"
                ? `${Math.round(listing.loiCarrezArea)} m²`
                : "-"}
            </div>
            <div className="rounded-xl bg-white/55 px-3 py-2">
              🛋️ Pièces: {typeof listing.roomCount === "number" ? listing.roomCount : "-"}
            </div>
            <div className="rounded-xl bg-white/55 px-3 py-2">
              🏢 Lots: {typeof listing.lotCount === "number" ? listing.lotCount : "-"}
            </div>
            <div className="rounded-xl bg-white/55 px-3 py-2">
              🧾 Charges:{" "}
              {typeof listing.annualCharges === "number"
                ? formatCompactPrice(listing.annualCharges, listing.priceCurrency)
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
