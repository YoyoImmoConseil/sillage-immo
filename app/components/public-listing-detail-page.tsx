/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import type { PropertyListingSnapshot } from "@/types/domain/properties";
import { formatListingPrice } from "@/services/properties/property-listing.service";
import { PropertyEnergyScale } from "./property-energy-scale";
import { PropertyGallery } from "./property-gallery";

export const buildPublicListingMetadata = (listing: PropertyListingSnapshot | null): Metadata => {
  if (!listing) {
    return {
      title: "Bien immobilier | Sillage Immo",
    };
  }

  return {
    title: `${listing.title ?? "Bien immobilier"} | Sillage Immo`,
    description:
      listing.property.description?.slice(0, 160) ??
      "Consultez le detail de ce bien immobilier propose par Sillage Immo.",
  };
};

export function PublicListingDetailPage({ listing }: { listing: PropertyListingSnapshot }) {
  const contact = listing.property.negotiator;
  const contactFullName = [contact.first_name, contact.last_name]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ");
  const gallery = listing.property.media.filter((item) => item.kind === "image");
  const feeMention =
    listing.property.sale.feeChargeBearer === "buyer" && typeof listing.property.sale.feeAmount === "number"
      ? `Incluant ${new Intl.NumberFormat("fr-FR", {
          style: "currency",
          currency: listing.priceCurrency || "EUR",
          maximumFractionDigits: 0,
        }).format(listing.property.sale.feeAmount)} d'honoraires a la charge de l'acquereur`
      : null;
  const floorLabel =
    typeof listing.property.rooms.floor === "number"
      ? typeof listing.property.rooms.totalFloors === "number"
        ? `${listing.property.rooms.floor} / ${listing.property.rooms.totalFloors}`
        : String(listing.property.rooms.floor)
      : "-";

  return (
    <main className="min-h-screen">
      <section className="bg-[#141446] text-[#f4ece4]">
        <div className="w-full px-6 py-8 md:px-10 xl:px-14 2xl:px-20 space-y-4">
          <Link href={listing.businessType === "sale" ? "/vente" : "/location"} className="text-sm underline">
            Retour au catalogue
          </Link>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.18em] text-[#f4ece4]/70">
              {listing.businessType === "sale" ? "Bien en vente" : "Bien en location"}
            </p>
            <h1 className="sillage-section-title text-[#f4ece4]">
              {listing.title ?? "Bien immobilier"}
            </h1>
            <p className="text-sm text-[#f4ece4]/80">
              {[
                listing.property.address.formattedAddress,
                listing.city,
                listing.postalCode,
              ]
                .filter(Boolean)
                .join(" • ")}
            </p>
            <p className="text-2xl font-semibold">
              {formatListingPrice({
                amount: listing.priceAmount,
                currency: listing.priceCurrency,
              })}
            </p>
            {feeMention ? <p className="text-sm text-[#f4ece4]/80">{feeMention}</p> : null}
          </div>
        </div>
      </section>

      <section className="bg-[#f4ece4] text-[#141446]">
        <div className="w-full px-6 py-8 md:px-10 xl:px-14 2xl:px-20 grid gap-8 lg:grid-cols-[1.6fr_0.9fr]">
          <div className="space-y-6">
            <PropertyGallery
              images={gallery}
              title={listing.title ?? "Bien immobilier"}
              showThumbnails={false}
            />

            <section className="rounded-2xl border border-[rgba(20,20,70,0.18)] p-6 space-y-3">
              <h2 className="sillage-section-title">Description</h2>
              <p className="text-sm leading-7 opacity-85">
                {listing.property.description ?? "Description bientot disponible."}
              </p>
            </section>

            <section className="rounded-2xl border border-[rgba(20,20,70,0.18)] p-6 space-y-4">
              <h2 className="sillage-section-title">A retenir</h2>
              <dl className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
                <div>
                  <dt className="opacity-65">🏠 Typologie</dt>
                  <dd>{listing.propertyType ?? "-"}</dd>
                </div>
                <div>
                  <dt className="opacity-65">📐 Surface Carrez</dt>
                  <dd>
                    {typeof listing.property.surfaces.loiCarrezArea === "number"
                      ? `${Math.round(listing.property.surfaces.loiCarrezArea)} m2`
                      : "-"}
                  </dd>
                </div>
                <div>
                  <dt className="opacity-65">🛋️ Nombre de pieces</dt>
                  <dd>{typeof listing.property.rooms.roomCount === "number" ? listing.property.rooms.roomCount : "-"}</dd>
                </div>
                <div>
                  <dt className="opacity-65">🏢 Nombre de lots</dt>
                  <dd>{typeof listing.property.condo.lotCount === "number" ? listing.property.condo.lotCount : "-"}</dd>
                </div>
                <div>
                  <dt className="opacity-65">🧾 Charges annuelles</dt>
                  <dd>
                    {typeof listing.property.condo.annualCharges === "number"
                      ? new Intl.NumberFormat("fr-FR", {
                          style: "currency",
                          currency: listing.priceCurrency || "EUR",
                          maximumFractionDigits: 0,
                        }).format(listing.property.condo.annualCharges)
                      : "-"}
                  </dd>
                </div>
                <div>
                  <dt className="opacity-65">🏙️ Ville</dt>
                  <dd>{listing.city ?? "-"}</dd>
                </div>
              </dl>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <PropertyEnergyScale
                title="⚡ DPE"
                value={listing.property.energy.dpeValue}
                label={listing.property.energy.dpeLabel}
                unit="kWh/m2/an"
              />
              <PropertyEnergyScale
                title="🌿 GES"
                value={listing.property.energy.gesValue}
                label={listing.property.energy.gesLabel}
                unit="kgCO2/m2/an"
              />
            </section>

            <section className="rounded-2xl border border-[rgba(20,20,70,0.18)] p-6 space-y-4">
              <h2 className="sillage-section-title">Caracteristiques detaillees</h2>
              <dl className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
                <div>
                  <dt className="opacity-65">📐 Surface habitable</dt>
                  <dd>
                    {typeof listing.livingArea === "number"
                      ? `${Math.round(listing.livingArea)} m2`
                      : "-"}
                  </dd>
                </div>
                <div>
                  <dt className="opacity-65">🛏️ Chambres</dt>
                  <dd>{typeof listing.bedrooms === "number" ? listing.bedrooms : "-"}</dd>
                </div>
                <div>
                  <dt className="opacity-65">🛋️ Sejours</dt>
                  <dd>
                    {typeof listing.property.rooms.livingRooms === "number"
                      ? listing.property.rooms.livingRooms
                      : "-"}
                  </dd>
                </div>
                <div>
                  <dt className="opacity-65">📏 Surface du sejour</dt>
                  <dd>
                    {typeof listing.property.surfaces.livingRoomArea === "number"
                      ? `${Math.round(listing.property.surfaces.livingRoomArea)} m2`
                      : "-"}
                  </dd>
                </div>
                <div>
                  <dt className="opacity-65">🏢 Etage / immeuble</dt>
                  <dd>{floorLabel}</dd>
                </div>
                <div>
                  <dt className="opacity-65">🔝 Dernier etage</dt>
                  <dd>
                    {listing.property.rooms.isTopFloor === null
                      ? "-"
                      : listing.property.rooms.isTopFloor
                        ? "Oui"
                        : "Non"}
                  </dd>
                </div>
                <div>
                  <dt className="opacity-65">🛗 Ascenseur</dt>
                  <dd>
                    {listing.property.amenities.hasElevator === null
                      ? "-"
                      : listing.property.amenities.hasElevator
                        ? "Oui"
                        : "Non"}
                  </dd>
                </div>
                <div>
                  <dt className="opacity-65">🧱 Cave</dt>
                  <dd>
                    {listing.property.amenities.hasCellar === null
                      ? "-"
                      : listing.property.amenities.hasCellar
                        ? "Oui"
                        : "Non"}
                  </dd>
                </div>
                <div>
                  <dt className="opacity-65">🌿 Terrasse</dt>
                  <dd>
                    {listing.property.amenities.hasTerrace === null
                      ? "-"
                      : listing.property.amenities.hasTerrace
                      ? typeof listing.property.surfaces.terraceArea === "number"
                        ? `Oui • ${Math.round(listing.property.surfaces.terraceArea)} m2`
                        : "Oui"
                      : "Non"}
                  </dd>
                </div>
                <div>
                  <dt className="opacity-65">🌤️ Balcon</dt>
                  <dd>
                    {listing.property.amenities.hasBalcony === null
                      ? "-"
                      : listing.property.amenities.hasBalcony
                      ? typeof listing.property.surfaces.balconyArea === "number"
                        ? `Oui • ${Math.round(listing.property.surfaces.balconyArea)} m2`
                        : "Oui"
                      : "Non"}
                  </dd>
                </div>
                <div>
                  <dt className="opacity-65">☀️ Exposition</dt>
                  <dd>{listing.property.amenities.exposure ?? "-"}</dd>
                </div>
                <div>
                  <dt className="opacity-65">🌊 Vue mer</dt>
                  <dd>{listing.property.amenities.seaView ?? "-"}</dd>
                </div>
                <div>
                  <dt className="opacity-65">🧭 Condition generale</dt>
                  <dd>{listing.property.generalCondition ?? "-"}</dd>
                </div>
                <div>
                  <dt className="opacity-65">📌 Statut</dt>
                  <dd>{listing.property.availabilityStatus ?? "-"}</dd>
                </div>
              </dl>
            </section>

            {gallery.length > 1 ? (
              <section className="rounded-2xl border border-[rgba(20,20,70,0.18)] p-6 space-y-4">
                <h2 className="sillage-section-title">Photos du bien</h2>
                <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                  {gallery.map((image, index) =>
                    image.cachedUrl || image.remoteUrl ? (
                      <div
                        key={image.id}
                        className="overflow-hidden rounded-xl border border-[rgba(20,20,70,0.14)] bg-white/70"
                      >
                        <img
                          src={image.cachedUrl ?? image.remoteUrl ?? undefined}
                          alt={image.description ?? `${listing.title ?? "Bien"} ${index + 1}`}
                          className="aspect-square h-full w-full object-cover"
                        />
                      </div>
                    ) : null
                  )}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl bg-[#141446] p-6 text-[#f4ece4] space-y-3">
              <h2 className="sillage-section-title text-[#f4ece4]">Interlocuteur Sillage</h2>
              <p className="text-sm">{contactFullName || "Conseiller Sillage Immo"}</p>
              {typeof contact.email === "string" && contact.email.trim() ? (
                <a className="block text-sm underline" href={`mailto:${contact.email}`}>
                  {contact.email}
                </a>
              ) : null}
              {typeof contact.phone === "string" && contact.phone.trim() ? (
                <a className="block text-sm underline" href={`tel:${contact.phone}`}>
                  {contact.phone}
                </a>
              ) : null}
            </section>

            {listing.property.virtualTourUrl ? (
              <section className="rounded-2xl border border-[rgba(20,20,70,0.18)] p-6 space-y-2">
                <h2 className="sillage-section-title">Visite virtuelle</h2>
                <a
                  href={listing.property.virtualTourUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="sillage-btn inline-block rounded px-4 py-2 text-sm"
                >
                  Ouvrir la visite Matterport
                </a>
              </section>
            ) : null}

            {listing.property.videoUrl ? (
              <section className="rounded-2xl border border-[rgba(20,20,70,0.18)] p-6 space-y-2">
                <h2 className="sillage-section-title">Video</h2>
                <a
                  href={listing.property.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="sillage-btn-secondary inline-block rounded px-4 py-2 text-sm"
                >
                  Voir la video
                </a>
              </section>
            ) : null}
          </aside>
        </div>
      </section>
    </main>
  );
}
