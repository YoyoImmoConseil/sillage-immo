/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import type { PropertyListingSnapshot } from "@/types/domain/properties";
import { formatListingPrice } from "@/services/properties/property-listing.service";

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
          </div>
        </div>
      </section>

      <section className="bg-[#f4ece4] text-[#141446]">
        <div className="w-full px-6 py-8 md:px-10 xl:px-14 2xl:px-20 grid gap-8 lg:grid-cols-[1.6fr_0.9fr]">
          <div className="space-y-6">
            <section className="grid gap-4 md:grid-cols-2">
              {gallery.length > 0 ? (
                gallery.map((image) => (
                  <div
                    key={image.id}
                    className="overflow-hidden rounded-2xl border border-[rgba(20,20,70,0.18)] bg-[rgba(20,20,70,0.05)]"
                  >
                    {image.cachedUrl || image.remoteUrl ? (
                      <img
                        src={image.cachedUrl ?? image.remoteUrl ?? undefined}
                        alt={image.description ?? listing.title ?? "Photo du bien"}
                        className="aspect-[4/3] h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-[4/3] items-center justify-center text-sm opacity-70">
                        Media indisponible
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center rounded-2xl border border-[rgba(20,20,70,0.18)] text-sm opacity-70">
                  Galerie a venir
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-[rgba(20,20,70,0.18)] p-6 space-y-3">
              <h2 className="sillage-section-title">Description</h2>
              <p className="text-sm leading-7 opacity-85">
                {listing.property.description ?? "Description bientot disponible."}
              </p>
            </section>

            <section className="rounded-2xl border border-[rgba(20,20,70,0.18)] p-6 space-y-4">
              <h2 className="sillage-section-title">Caracteristiques</h2>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="opacity-65">Type</dt>
                  <dd>{listing.propertyType ?? "-"}</dd>
                </div>
                <div>
                  <dt className="opacity-65">Ville</dt>
                  <dd>{listing.city ?? "-"}</dd>
                </div>
                <div>
                  <dt className="opacity-65">Surface</dt>
                  <dd>
                    {typeof listing.livingArea === "number"
                      ? `${Math.round(listing.livingArea)} m2`
                      : "-"}
                  </dd>
                </div>
                <div>
                  <dt className="opacity-65">Chambres</dt>
                  <dd>{typeof listing.bedrooms === "number" ? listing.bedrooms : "-"}</dd>
                </div>
                <div>
                  <dt className="opacity-65">Condition generale</dt>
                  <dd>{listing.property.generalCondition ?? "-"}</dd>
                </div>
                <div>
                  <dt className="opacity-65">Statut</dt>
                  <dd>{listing.property.availabilityStatus ?? "-"}</dd>
                </div>
              </dl>
            </section>
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
