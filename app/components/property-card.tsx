/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { PropertyListingSnapshot } from "@/types/domain/properties";

type PropertyCardProps = {
  listing: Pick<
    PropertyListingSnapshot,
    | "canonicalPath"
    | "title"
    | "city"
    | "postalCode"
    | "coverImageUrl"
    | "propertyType"
    | "priceAmount"
    | "priceCurrency"
    | "bedrooms"
    | "livingArea"
  >;
};

const formatListingPrice = (input: { amount: number | null; currency: string }) => {
  if (typeof input.amount !== "number") return "Prix sur demande";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: input.currency || "EUR",
    maximumFractionDigits: 0,
  }).format(input.amount);
};

export function PropertyCard({ listing }: PropertyCardProps) {
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
              Photo a venir
            </div>
          )}
        </div>
        <div className="space-y-3 p-5 text-[#141446]">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.14em] text-[#141446]/60">
              {listing.propertyType ?? "Bien"} {listing.city ? `• ${listing.city}` : ""}
            </p>
            <h2 className="text-xl font-semibold leading-tight">
              {listing.title ?? "Bien Sillage Immo"}
            </h2>
            <p className="text-sm text-[#141446]/72">
              {[listing.city, listing.postalCode].filter(Boolean).join(" ")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-[#141446]/75">
            {typeof listing.bedrooms === "number" ? (
              <span className="sillage-chip rounded-full px-3 py-1">
                {listing.bedrooms} chambre{listing.bedrooms > 1 ? "s" : ""}
              </span>
            ) : null}
            {typeof listing.livingArea === "number" ? (
              <span className="sillage-chip rounded-full px-3 py-1">
                {Math.round(listing.livingArea)} m2
              </span>
            ) : null}
          </div>
          <p className="text-lg font-semibold">
            {formatListingPrice({
              amount: listing.priceAmount,
              currency: listing.priceCurrency,
            })}
          </p>
        </div>
      </Link>
    </article>
  );
}
