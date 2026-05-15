/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import type { AppLocale } from "@/lib/i18n/config";
import { formatCurrency } from "@/lib/i18n/format";
import { localizePath } from "@/lib/i18n/routing";
import {
  getExposureLabel,
  getGeneralConditionLabel,
  getSeaViewLabel,
} from "@/lib/i18n/domain";
import { formatPropertyTypeLabel } from "@/lib/properties/property-type-label";
import { getPublicTeamMemberByEmail } from "@/services/home/team.service";
import type { PropertyListingSnapshot } from "@/types/domain/properties";
import { formatListingPrice } from "@/services/properties/property-listing.service";
import { PropertyEnergyScale } from "./property-energy-scale";
import { PropertyGallery } from "./property-gallery";
import { PropertyLocationMap } from "./property-location-map";
import { getListingCommercialStatusLabel } from "./listing-status-banner";

const METADATA_FALLBACKS: Record<AppLocale, { title: string; description: string }> = {
  fr: {
    title: "Bien immobilier",
    description: "Consultez le détail de ce bien immobilier proposé par Sillage Immo.",
  },
  en: {
    title: "Property",
    description: "Explore this property presented by Sillage Immo.",
  },
  es: {
    title: "Inmueble",
    description: "Consulte este inmueble presentado por Sillage Immo.",
  },
  ru: {
    title: "Объект недвижимости",
    description: "Ознакомьтесь с этим объектом от Sillage Immo.",
  },
};

export const buildPublicListingMetadata = (
  listing: PropertyListingSnapshot | null,
  locale: AppLocale = "fr"
): Metadata => {
  const fallback = METADATA_FALLBACKS[locale];
  if (!listing) {
    return {
      title: `${fallback.title} | Sillage Immo`,
    };
  }

  return {
    title: `${listing.title ?? fallback.title} | Sillage Immo`,
    description: listing.property.description?.slice(0, 160) ?? fallback.description,
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
      contactFallback: "Conseiller Sillage Immo",
      virtualTour: "Visite virtuelle",
      openMatterport: "Ouvrir la visite Matterport",
      highlights: "A retenir",
      description: "Description détaillée",
      descriptionFallback: "Description bientôt disponible.",
      location: "Emplacement",
      video: "Vidéo",
      watchVideo: "Voir la vidéo",
      statusLabel: "Statut",
      statusAvailable: "Disponible",
      propertyFallback: "Bien immobilier",
      propertyFallbackShort: "Bien",
      yes: "Oui",
      no: "Non",
      dpeUnit: "kWh/m²/an",
      gesUnit: "kgCO₂/m²/an",
      livingArea: "📐 Surface habitable",
      bedrooms: "🛏️ Chambres",
      livingRooms: "🛋️ Séjours",
      livingRoomArea: "📏 Surface du séjour",
      floor: "🏢 Étage / immeuble",
      topFloor: "🔝 Dernier étage",
      elevator: "🛗 Ascenseur",
      cellar: "🧱 Cave",
      terrace: "🌿 Terrasse",
      balcony: "🌤️ Balcon",
      exposure: "☀️ Exposition",
      seaView: "🌊 Vue mer",
      generalCondition: "🧭 Condition générale",
      propertyType: "🏠 Typologie",
      loiCarrezArea: "📐 Surface Carrez",
      roomCount: "🛋️ Nombre de pièces",
      lotCount: "🏢 Nombre de lots",
      annualCharges: "🧾 Charges annuelles",
      city: "🏙️ Ville",
    },
    en: {
      back: "Back to listings",
      features: "Detailed features",
      photos: "Property photos",
      contact: "Your Sillage contact",
      contactFallback: "Sillage Immo advisor",
      virtualTour: "Virtual tour",
      openMatterport: "Open Matterport tour",
      highlights: "Key facts",
      description: "Detailed description",
      descriptionFallback: "Description coming soon.",
      location: "Location",
      video: "Video",
      watchVideo: "Watch the video",
      statusLabel: "Status",
      statusAvailable: "Available",
      propertyFallback: "Property",
      propertyFallbackShort: "Property",
      yes: "Yes",
      no: "No",
      dpeUnit: "kWh/m²/yr",
      gesUnit: "kgCO₂/m²/yr",
      livingArea: "📐 Living area",
      bedrooms: "🛏️ Bedrooms",
      livingRooms: "🛋️ Living rooms",
      livingRoomArea: "📏 Living room area",
      floor: "🏢 Floor / building",
      topFloor: "🔝 Top floor",
      elevator: "🛗 Elevator",
      cellar: "🧱 Cellar",
      terrace: "🌿 Terrace",
      balcony: "🌤️ Balcony",
      exposure: "☀️ Exposure",
      seaView: "🌊 Sea view",
      generalCondition: "🧭 General condition",
      propertyType: "🏠 Property type",
      loiCarrezArea: "📐 Carrez area",
      roomCount: "🛋️ Number of rooms",
      lotCount: "🏢 Number of lots",
      annualCharges: "🧾 Annual charges",
      city: "🏙️ City",
    },
    es: {
      back: "Volver al catálogo",
      features: "Características detalladas",
      photos: "Fotos del inmueble",
      contact: "Interlocutor Sillage",
      contactFallback: "Asesor Sillage Immo",
      virtualTour: "Visita virtual",
      openMatterport: "Abrir la visita Matterport",
      highlights: "Puntos clave",
      description: "Descripción detallada",
      descriptionFallback: "Descripción próximamente disponible.",
      location: "Ubicación",
      video: "Vídeo",
      watchVideo: "Ver el vídeo",
      statusLabel: "Estado",
      statusAvailable: "Disponible",
      propertyFallback: "Inmueble",
      propertyFallbackShort: "Inmueble",
      yes: "Sí",
      no: "No",
      dpeUnit: "kWh/m²/año",
      gesUnit: "kgCO₂/m²/año",
      livingArea: "📐 Superficie habitable",
      bedrooms: "🛏️ Dormitorios",
      livingRooms: "🛋️ Salones",
      livingRoomArea: "📏 Superficie del salón",
      floor: "🏢 Planta / edificio",
      topFloor: "🔝 Última planta",
      elevator: "🛗 Ascensor",
      cellar: "🧱 Bodega",
      terrace: "🌿 Terraza",
      balcony: "🌤️ Balcón",
      exposure: "☀️ Orientación",
      seaView: "🌊 Vista al mar",
      generalCondition: "🧭 Estado general",
      propertyType: "🏠 Tipología",
      loiCarrezArea: "📐 Superficie Carrez",
      roomCount: "🛋️ Número de estancias",
      lotCount: "🏢 Número de lotes",
      annualCharges: "🧾 Cargas anuales",
      city: "🏙️ Ciudad",
    },
    ru: {
      back: "Назад к каталогу",
      features: "Подробные характеристики",
      photos: "Фотографии объекта",
      contact: "Ваш контакт в Sillage",
      contactFallback: "Консультант Sillage Immo",
      virtualTour: "Виртуальный тур",
      openMatterport: "Открыть Matterport-тур",
      highlights: "Ключевые факты",
      description: "Подробное описание",
      descriptionFallback: "Описание скоро появится.",
      location: "Расположение",
      video: "Видео",
      watchVideo: "Смотреть видео",
      statusLabel: "Статус",
      statusAvailable: "Доступен",
      propertyFallback: "Объект недвижимости",
      propertyFallbackShort: "Объект",
      yes: "Да",
      no: "Нет",
      dpeUnit: "кВт·ч/м²/год",
      gesUnit: "кгCO₂/м²/год",
      livingArea: "📐 Жилая площадь",
      bedrooms: "🛏️ Спальни",
      livingRooms: "🛋️ Гостиные",
      livingRoomArea: "📏 Площадь гостиной",
      floor: "🏢 Этаж / здание",
      topFloor: "🔝 Последний этаж",
      elevator: "🛗 Лифт",
      cellar: "🧱 Подвал",
      terrace: "🌿 Терраса",
      balcony: "🌤️ Балкон",
      exposure: "☀️ Ориентация",
      seaView: "🌊 Вид на море",
      generalCondition: "🧭 Общее состояние",
      propertyType: "🏠 Тип объекта",
      loiCarrezArea: "📐 Площадь по Carrez",
      roomCount: "🛋️ Количество комнат",
      lotCount: "🏢 Количество лотов",
      annualCharges: "🧾 Годовые расходы",
      city: "🏙️ Город",
    },
  }[locale];
  // Localized, marketing-safe label (`Disponible`, `Sous Compromis`, `Sous Offre`, ...).
  // Never expose the raw SweepBright `availability_status` value on the public surface
  // (e.g. `prospect`, `option`, `agreement`) — only the curated label.
  const commercialStatusLabel =
    getListingCommercialStatusLabel(listing.property.availabilityStatus, locale) ??
    copy.statusAvailable;
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
  // Public listing galleries remain photo-only on purpose even if the
  // underlying property object can now store additional media kinds.
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
  const fullAddress =
    listing.property.address.formattedAddress ??
    [
      listing.property.address.streetNumber,
      listing.property.address.street,
      listing.property.address.postalCode,
      listing.property.address.city,
      listing.property.address.country,
    ]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .join(" ");
  const hasLocationMap =
    typeof listing.property.address.latitude === "number" && typeof listing.property.address.longitude === "number";

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
              {listing.title ?? copy.propertyFallback}
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
              title={listing.title ?? copy.propertyFallback}
              showThumbnails={false}
              availabilityStatus={listing.property.availabilityStatus}
              locale={locale}
            />

            <section className="grid gap-4 lg:grid-cols-2">
              <PropertyEnergyScale
                title="⚡ DPE"
                value={listing.property.energy.dpeValue}
                label={listing.property.energy.dpeLabel}
                unit={copy.dpeUnit}
                locale={locale}
              />
              <PropertyEnergyScale
                title="🌿 GES"
                value={listing.property.energy.gesValue}
                label={listing.property.energy.gesLabel}
                unit={copy.gesUnit}
                locale={locale}
              />
            </section>

            <section className="rounded-2xl border border-[rgba(20,20,70,0.18)] p-6 space-y-4">
              <h2 className="sillage-section-title">{copy.features}</h2>
              <dl className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
                <div>
                  <dt className="opacity-65">{copy.livingArea}</dt>
                  <dd>
                    {typeof listing.livingArea === "number"
                      ? `${Math.round(listing.livingArea)} m²`
                      : "-"}
                  </dd>
                </div>
                <div>
                  <dt className="opacity-65">{copy.bedrooms}</dt>
                  <dd>{typeof listing.bedrooms === "number" ? listing.bedrooms : "-"}</dd>
                </div>
                <div>
                  <dt className="opacity-65">{copy.livingRooms}</dt>
                  <dd>
                    {typeof listing.property.rooms.livingRooms === "number"
                      ? listing.property.rooms.livingRooms
                      : "-"}
                  </dd>
                </div>
                <div>
                  <dt className="opacity-65">{copy.livingRoomArea}</dt>
                  <dd>
                    {typeof listing.property.surfaces.livingRoomArea === "number"
                      ? `${Math.round(listing.property.surfaces.livingRoomArea)} m²`
                      : "-"}
                  </dd>
                </div>
                <div>
                  <dt className="opacity-65">{copy.floor}</dt>
                  <dd>{floorLabel}</dd>
                </div>
                <div>
                  <dt className="opacity-65">{copy.topFloor}</dt>
                  <dd>
                    {listing.property.rooms.isTopFloor === null
                      ? "-"
                      : listing.property.rooms.isTopFloor
                        ? copy.yes
                        : copy.no}
                  </dd>
                </div>
                <div>
                  <dt className="opacity-65">{copy.elevator}</dt>
                  <dd>
                    {listing.property.amenities.hasElevator === null
                      ? "-"
                      : listing.property.amenities.hasElevator
                        ? copy.yes
                        : copy.no}
                  </dd>
                </div>
                <div>
                  <dt className="opacity-65">{copy.cellar}</dt>
                  <dd>
                    {listing.property.amenities.hasCellar === null
                      ? "-"
                      : listing.property.amenities.hasCellar
                        ? copy.yes
                        : copy.no}
                  </dd>
                </div>
                <div>
                  <dt className="opacity-65">{copy.terrace}</dt>
                  <dd>
                    {listing.property.amenities.hasTerrace === null
                      ? "-"
                      : listing.property.amenities.hasTerrace
                      ? typeof listing.property.surfaces.terraceArea === "number"
                        ? `${copy.yes} • ${Math.round(listing.property.surfaces.terraceArea)} m²`
                        : copy.yes
                      : copy.no}
                  </dd>
                </div>
                <div>
                  <dt className="opacity-65">{copy.balcony}</dt>
                  <dd>
                    {listing.property.amenities.hasBalcony === null
                      ? "-"
                      : listing.property.amenities.hasBalcony
                      ? typeof listing.property.surfaces.balconyArea === "number"
                        ? `${copy.yes} • ${Math.round(listing.property.surfaces.balconyArea)} m²`
                        : copy.yes
                      : copy.no}
                  </dd>
                </div>
                <div>
                  <dt className="opacity-65">{copy.exposure}</dt>
                  <dd>{getExposureLabel(listing.property.amenities.exposure, locale) ?? "-"}</dd>
                </div>
                <div>
                  <dt className="opacity-65">{copy.seaView}</dt>
                  <dd>{getSeaViewLabel(listing.property.amenities.seaView, locale) ?? "-"}</dd>
                </div>
                <div>
                  <dt className="opacity-65">{copy.generalCondition}</dt>
                  <dd>{getGeneralConditionLabel(listing.property.generalCondition, locale) ?? "-"}</dd>
                </div>
                <div>
                  <dt className="opacity-65">📌 {copy.statusLabel}</dt>
                  <dd>{commercialStatusLabel}</dd>
                </div>
              </dl>
            </section>

            {hasLocationMap ? (
              <section className="rounded-2xl border border-[rgba(20,20,70,0.18)] p-6 space-y-4">
                <h2 className="sillage-section-title">{copy.location}</h2>
                <PropertyLocationMap
                  latitude={listing.property.address.latitude}
                  longitude={listing.property.address.longitude}
                  address={fullAddress || null}
                  title={listing.title ?? copy.propertyFallback}
                />
              </section>
            ) : null}

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
                          alt={image.description ?? `${listing.title ?? copy.propertyFallbackShort} ${index + 1}`}
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
                  alt={contactProfile?.fullName || contactFullName || copy.contactFallback}
                  className="h-24 w-24 rounded-lg object-cover border border-white/20"
                />
              ) : null}
              <p className="sillage-editorial-text opacity-85">
                {contactProfile?.fullName || contactFullName || copy.contactFallback}
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
                  <dt className="opacity-65">{copy.propertyType}</dt>
                  <dd>{formatPropertyTypeLabel(listing.propertyType, locale) ?? "-"}</dd>
                </div>
                <div>
                  <dt className="opacity-65">{copy.loiCarrezArea}</dt>
                  <dd>
                    {typeof listing.property.surfaces.loiCarrezArea === "number"
                      ? `${Math.round(listing.property.surfaces.loiCarrezArea)} m²`
                      : "-"}
                  </dd>
                </div>
                <div>
                  <dt className="opacity-65">{copy.roomCount}</dt>
                  <dd>{typeof listing.property.rooms.roomCount === "number" ? listing.property.rooms.roomCount : "-"}</dd>
                </div>
                <div>
                  <dt className="opacity-65">{copy.lotCount}</dt>
                  <dd>{typeof listing.property.condo.lotCount === "number" ? listing.property.condo.lotCount : "-"}</dd>
                </div>
                <div>
                  <dt className="opacity-65">{copy.annualCharges}</dt>
                  <dd>
                    {typeof listing.property.condo.annualCharges === "number"
                      ? formatCurrency(
                          listing.property.condo.annualCharges,
                          locale,
                          listing.priceCurrency || "EUR"
                        )
                      : "-"}
                  </dd>
                </div>
                <div>
                  <dt className="opacity-65">{copy.city}</dt>
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
