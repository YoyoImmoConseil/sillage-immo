/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import type { AppLocale } from "@/lib/i18n/config";
import { formatCurrency } from "@/lib/i18n/format";
import { localizePath } from "@/lib/i18n/routing";
import { formatPropertyTypeLabel } from "@/lib/properties/property-type-label";
import { getPublicTeamMemberByEmail } from "@/services/home/team.service";
import type { PropertyListingSnapshot } from "@/types/domain/properties";
import { formatListingPrice } from "@/services/properties/property-listing.service";
import { PropertyEnergyScale } from "./property-energy-scale";
import { PropertyGallery } from "./property-gallery";

export const buildPublicListingMetadata = (
  listing: PropertyListingSnapshot | null,
  locale: AppLocale = "fr"
): Metadata => {
  if (!listing) {
    return {
      title:
        locale === "en"
          ? "Property | Sillage Immo"
          : locale === "es"
            ? "Inmueble | Sillage Immo"
            : locale === "ru"
              ? "Недвижимость | Sillage Immo"
              : "Bien immobilier | Sillage Immo",
    };
  }

  return {
    title: `${listing.title ?? "Bien immobilier"} | Sillage Immo`,
    description:
      listing.property.description?.slice(0, 160) ??
      (locale === "en"
        ? "Explore this property presented by Sillage Immo."
        : locale === "es"
          ? "Consulte este inmueble presentado por Sillage Immo."
          : locale === "ru"
            ? "Ознакомьтесь с этим объектом от Sillage Immo."
            : "Consultez le détail de ce bien immobilier proposé par Sillage Immo."),
  };
};

export async function PublicListingDetailPage({
  listing,
  locale = "fr",
}: {
  listing: PropertyListingSnapshot;
  locale?: AppLocale;
}) {
  const copy = {
    fr: {
      back: "Retour au catalogue",
      features: "Caractéristiques détaillées",
      photos: "Photos du bien",
      contact: "Interlocuteur Sillage",
      virtualTour: "Visite virtuelle",
      openMatterport: "Ouvrir la visite Matterport",
      highlights: "A retenir",
      description: "Description détaillée",
      descriptionFallback: "Description bientôt disponible.",
      video: "Vidéo",
      watchVideo: "Voir la vidéo",
    },
    en: {
      back: "Back to listings",
      features: "Detailed features",
      photos: "Property photos",
      contact: "Your Sillage contact",
      virtualTour: "Virtual tour",
      openMatterport: "Open Matterport tour",
      highlights: "Key facts",
      description: "Detailed description",
      descriptionFallback: "Description coming soon.",
      video: "Video",
      watchVideo: "Watch the video",
    },
    es: {
      back: "Volver al catálogo",
      features: "Características detalladas",
      photos: "Fotos del inmueble",
      contact: "Interlocutor Sillage",
      virtualTour: "Visita virtual",
      openMatterport: "Abrir la visita Matterport",
      highlights: "Puntos clave",
      description: "Descripción detallada",
      descriptionFallback: "Descripción próximamente disponible.",
      video: "Vídeo",
      watchVideo: "Ver el vídeo",
    },
    ru: {
      back: "Назад к каталогу",
      features: "Подробные характеристики",
      photos: "Фотографии объекта",
      contact: "Ваш контакт в Sillage",
      virtualTour: "Виртуальный тур",
      openMatterport: "Открыть Matterport-тур",
      highlights: "Ключевые факты",
      description: "Подробное описание",
      descriptionFallback: "Описание скоро появится.",
      video: "Видео",
      watchVideo: "Смотреть видео",
    },
  }[locale];
  const contact = listing.property.negotiator;
  const contactEmail = typeof contact.email === "string" && contact.email.trim() ? contact.email.trim() : null;
  const contactProfile = contactEmail ? await getPublicTeamMemberByEmail(contactEmail, locale) : null;
  const contactFullName = [contact.first_name, contact.last_name]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ");
  const contactAvatarUrl =
    contactProfile?.avatarUrl ??
    [
      contact.avatar_url,
      contact.avatarUrl,
      contact.photo_url,
      contact.photoUrl,
      contact.picture_url,
      contact.pictureUrl,
      contact.image_url,
      contact.imageUrl,
    ].find((value): value is string => typeof value === "string" && value.trim().length > 0);
  const gallery = listing.property.media.filter((item) => item.kind === "image");
  const feeMention =
    listing.property.sale.feeChargeBearer === "buyer" && typeof listing.property.sale.feeAmount === "number"
      ? locale === "en"
        ? `Including ${formatCurrency(listing.property.sale.feeAmount, locale, listing.priceCurrency || "EUR")} fees payable by the buyer`
        : locale === "es"
          ? `Incluye ${formatCurrency(listing.property.sale.feeAmount, locale, listing.priceCurrency || "EUR")} de honorarios a cargo del comprador`
          : locale === "ru"
            ? `Включая ${formatCurrency(listing.property.sale.feeAmount, locale, listing.priceCurrency || "EUR")} комиссии за счет покупателя`
            : `Incluant ${formatCurrency(listing.property.sale.feeAmount, locale, listing.priceCurrency || "EUR")} d'honoraires à la charge de l'acquéreur`
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
        <div className="w-full px-6 pb-8 pt-4 md:px-10 md:pb-8 md:pt-3 xl:px-14 2xl:px-20 space-y-3">
          <Link
            href={localizePath(listing.businessType === "sale" ? "/vente" : "/location", locale)}
            className="inline-flex text-xl leading-none"
            aria-label={copy.back}
          >
            ←
          </Link>
          <div className="space-y-2">
            <h1 className="sillage-section-title text-[#f4ece4]">
              {listing.title ?? "Bien immobilier"}
            </h1>
            <p className="text-sm text-[#f4ece4]/80">
              {[listing.city, listing.postalCode].filter(Boolean).join(" • ")}
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

            <section className="grid gap-4 lg:grid-cols-2">
              <PropertyEnergyScale
                title="⚡ DPE"
                value={listing.property.energy.dpeValue}
                label={listing.property.energy.dpeLabel}
                unit="kWh/m²/an"
              />
              <PropertyEnergyScale
                title="🌿 GES"
                value={listing.property.energy.gesValue}
                label={listing.property.energy.gesLabel}
                unit="kgCO₂/m²/an"
              />
            </section>

            <section className="rounded-2xl border border-[rgba(20,20,70,0.18)] p-6 space-y-4">
              <h2 className="sillage-section-title">{copy.features}</h2>
              <dl className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
                <div>
                  <dt className="opacity-65">📐 Surface habitable</dt>
                  <dd>
                    {typeof listing.livingArea === "number"
                      ? `${Math.round(listing.livingArea)} m²`
                      : "-"}
                  </dd>
                </div>
                <div>
                  <dt className="opacity-65">🛏️ Chambres</dt>
                  <dd>{typeof listing.bedrooms === "number" ? listing.bedrooms : "-"}</dd>
                </div>
                <div>
                  <dt className="opacity-65">🛋️ Séjours</dt>
                  <dd>
                    {typeof listing.property.rooms.livingRooms === "number"
                      ? listing.property.rooms.livingRooms
                      : "-"}
                  </dd>
                </div>
                <div>
                  <dt className="opacity-65">📏 Surface du séjour</dt>
                  <dd>
                    {typeof listing.property.surfaces.livingRoomArea === "number"
                      ? `${Math.round(listing.property.surfaces.livingRoomArea)} m²`
                      : "-"}
                  </dd>
                </div>
                <div>
                  <dt className="opacity-65">🏢 Étage / immeuble</dt>
                  <dd>{floorLabel}</dd>
                </div>
                <div>
                  <dt className="opacity-65">🔝 Dernier étage</dt>
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
                        ? `Oui • ${Math.round(listing.property.surfaces.terraceArea)} m²`
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
                        ? `Oui • ${Math.round(listing.property.surfaces.balconyArea)} m²`
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
                  <dt className="opacity-65">🧭 Condition générale</dt>
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
                <h2 className="sillage-section-title">{copy.photos}</h2>
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
              <h2 className="sillage-section-title text-[#f4ece4]">{copy.contact}</h2>
              {contactAvatarUrl ? (
                <img
                  src={contactAvatarUrl}
                  alt={contactProfile?.fullName || contactFullName || "Conseiller Sillage Immo"}
                  className="h-24 w-24 rounded-lg object-cover border border-white/20"
                />
              ) : null}
              <p className="sillage-editorial-text opacity-85">
                {contactProfile?.fullName || contactFullName || "Conseiller Sillage Immo"}
              </p>
              {typeof contact.email === "string" && contact.email.trim() ? (
                <a className="sillage-editorial-text block opacity-85 underline" href={`mailto:${contact.email}`}>
                  {contact.email}
                </a>
              ) : null}
              {typeof contact.phone === "string" && contact.phone.trim() ? (
                <a className="sillage-editorial-text block opacity-85 underline" href={`tel:${contact.phone}`}>
                  {contact.phone}
                </a>
              ) : null}
            </section>

            {listing.property.virtualTourUrl ? (
              <section className="rounded-2xl border border-[rgba(20,20,70,0.18)] p-6 space-y-2">
                <h2 className="sillage-section-title">{copy.virtualTour}</h2>
                <a
                  href={listing.property.virtualTourUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="sillage-btn inline-block rounded px-4 py-2 text-sm"
                >
                  {copy.openMatterport}
                </a>
              </section>
            ) : null}

            <section className="rounded-2xl border border-[rgba(20,20,70,0.18)] p-6 space-y-4">
              <h2 className="sillage-section-title">{copy.highlights}</h2>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="opacity-65">🏠 Typologie</dt>
                  <dd>{formatPropertyTypeLabel(listing.propertyType) ?? "-"}</dd>
                </div>
                <div>
                  <dt className="opacity-65">📐 Surface Carrez</dt>
                  <dd>
                    {typeof listing.property.surfaces.loiCarrezArea === "number"
                      ? `${Math.round(listing.property.surfaces.loiCarrezArea)} m²`
                      : "-"}
                  </dd>
                </div>
                <div>
                  <dt className="opacity-65">🛋️ Nombre de pièces</dt>
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

            <section className="rounded-2xl border border-[rgba(20,20,70,0.18)] p-6 space-y-3">
              <h2 className="sillage-section-title">{copy.description}</h2>
              <p className="sillage-editorial-text opacity-85">
                {listing.property.description ?? copy.descriptionFallback}
              </p>
            </section>

            {listing.property.videoUrl ? (
              <section className="rounded-2xl border border-[rgba(20,20,70,0.18)] p-6 space-y-2">
                <h2 className="sillage-section-title">{copy.video}</h2>
                <a
                  href={listing.property.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="sillage-btn-secondary inline-block rounded px-4 py-2 text-sm"
                >
                  {copy.watchVideo}
                </a>
              </section>
            ) : null}
          </aside>
        </div>
      </section>
    </main>
  );
}
