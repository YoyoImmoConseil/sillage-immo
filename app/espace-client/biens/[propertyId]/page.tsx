import Link from "next/link";
import { notFound } from "next/navigation";
import { getRequestLocale } from "@/lib/i18n/request";
import { localizePath } from "@/lib/i18n/routing";
import { formatCurrency } from "@/lib/i18n/format";
import { formatPropertyTypeLabel } from "@/lib/i18n/domain";
import { requireClientSpacePageContext } from "@/lib/client-space/auth";
import { PropertyLocationMap } from "@/app/components/property-location-map";
import { getSellerPortalPropertyDetail } from "@/services/clients/seller-portal.service";
import { PropertyDocumentsClientPanel } from "./property-documents-client-panel";
import { PropertyViewTracker } from "./_property-view-tracker";

type OwnerPropertyPageProps = {
  params: Promise<{ propertyId: string }>;
};

const getBusinessTypeLabel = (
  value: string | null | undefined,
  locale: "fr" | "en" | "es" | "ru"
) => {
  if (value === "rental") {
    return locale === "en" ? "Rental" : locale === "es" ? "Alquiler" : locale === "ru" ? "Аренда" : "Location";
  }

  return locale === "en" ? "Sale" : locale === "es" ? "Venta" : locale === "ru" ? "Продажа" : "Vente";
};

const getBooleanLabel = (
  value: boolean | null,
  locale: "fr" | "en" | "es" | "ru"
) => {
  if (value === null) {
    return locale === "en"
      ? "Not specified"
      : locale === "es"
        ? "No indicado"
        : locale === "ru"
          ? "Не указано"
          : "Non renseigné";
  }

  return value
    ? locale === "en"
      ? "Yes"
      : locale === "es"
        ? "Sí"
        : locale === "ru"
          ? "Да"
          : "Oui"
    : locale === "en"
      ? "No"
      : locale === "es"
        ? "No"
        : locale === "ru"
          ? "Нет"
          : "Non";
};

export default async function OwnerPropertyPage({ params }: OwnerPropertyPageProps) {
  const locale = await getRequestLocale();
  const context = await requireClientSpacePageContext();
  const { propertyId } = await params;

  const detail = await getSellerPortalPropertyDetail({
    authUserId: context.authUserId,
    propertyId,
    locale,
  });

  if (!detail) {
    notFound();
  }

  const copy = {
    fr: {
      backToProject: "Retour au projet",
      backToProjects: "Retour à mes projets",
      eyebrow: "Fiche bien propriétaire",
      overview: "Vue d'ensemble",
      details: "Caractéristiques",
      description: "Description",
      actions: "Actions",
      type: "Type de bien",
      market: "Commercialisation",
      price: "Prix",
      surface: "Surface",
      rooms: "Pièces",
      bedrooms: "Chambres",
      floor: "Étage",
      terrace: "Terrasse",
      elevator: "Ascenseur",
      address: "Adresse",
      location: "Emplacement",
      unavailable: "Non disponible",
      noDescription: "La description détaillée du bien n'est pas encore disponible.",
      publicListing: "Voir la fiche publique",
      book: "Planifier un rendez-vous autour de ce bien",
    },
    en: {
      backToProject: "Back to project",
      backToProjects: "Back to my projects",
      eyebrow: "Owner property sheet",
      overview: "Overview",
      details: "Key features",
      description: "Description",
      actions: "Actions",
      type: "Property type",
      market: "Market",
      price: "Price",
      surface: "Surface area",
      rooms: "Rooms",
      bedrooms: "Bedrooms",
      floor: "Floor",
      terrace: "Terrace",
      elevator: "Elevator",
      address: "Address",
      location: "Location",
      unavailable: "Unavailable",
      noDescription: "The detailed property description is not available yet.",
      publicListing: "View public listing",
      book: "Schedule an appointment about this property",
    },
    es: {
      backToProject: "Volver al proyecto",
      backToProjects: "Volver a mis proyectos",
      eyebrow: "Ficha del inmueble",
      overview: "Resumen",
      details: "Características",
      description: "Descripción",
      actions: "Acciones",
      type: "Tipo de inmueble",
      market: "Comercialización",
      price: "Precio",
      surface: "Superficie",
      rooms: "Estancias",
      bedrooms: "Dormitorios",
      floor: "Planta",
      terrace: "Terraza",
      elevator: "Ascensor",
      address: "Dirección",
      location: "Ubicación",
      unavailable: "No disponible",
      noDescription: "La descripción detallada del inmueble aún no está disponible.",
      publicListing: "Ver ficha pública",
      book: "Planificar una cita sobre este inmueble",
    },
    ru: {
      backToProject: "Назад к проекту",
      backToProjects: "Назад к моим проектам",
      eyebrow: "Карточка объекта",
      overview: "Обзор",
      details: "Характеристики",
      description: "Описание",
      actions: "Действия",
      type: "Тип объекта",
      market: "Формат сделки",
      price: "Цена",
      surface: "Площадь",
      rooms: "Комнаты",
      bedrooms: "Спальни",
      floor: "Этаж",
      terrace: "Терраса",
      elevator: "Лифт",
      address: "Адрес",
      location: "Расположение",
      unavailable: "Недоступно",
      noDescription: "Подробное описание объекта пока недоступно.",
      publicListing: "Открыть публичную карточку",
      book: "Запланировать встречу по этому объекту",
    },
  }[locale];

  const title = detail.property.title ?? detail.property.formattedAddress ?? detail.property.id;
  const backHref = detail.linkedProjectId
    ? localizePath(`/espace-client/projets/${detail.linkedProjectId}`, locale)
    : localizePath("/espace-client", locale);
  const secondaryAddress = [detail.property.postalCode, detail.property.city].filter(Boolean).join(" ");
  const displayAddress = detail.property.formattedAddress ?? (secondaryAddress || copy.unavailable);
  const fullAddress =
    detail.property.formattedAddress ??
    [
      detail.property.streetNumber,
      detail.property.street,
      detail.property.postalCode,
      detail.property.city,
      detail.property.country,
    ]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .join(" ");
  const hasLocationMap =
    typeof detail.property.latitude === "number" && typeof detail.property.longitude === "number";

  return (
    <div className="space-y-6">
      <PropertyViewTracker
        propertyId={detail.property.id}
        businessType={detail.listing?.businessType ?? null}
        city={detail.property.city ?? null}
      />
      <div className="flex flex-wrap gap-4">
        <Link href={backHref} className="text-sm underline text-[#141446]">
          {detail.linkedProjectId ? copy.backToProject : copy.backToProjects}
        </Link>
      </div>

      <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
        <p className="text-xs uppercase tracking-[0.18em] text-[#141446]/60">{copy.eyebrow}</p>
        <h2 className="mt-2 text-2xl font-semibold text-[#141446]">{title}</h2>
        <p className="mt-3 text-sm text-[#141446]/75">
          {displayAddress}
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
            <h3 className="text-xl font-semibold text-[#141446]">{copy.overview}</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
                <p className="text-xs uppercase text-[#141446]/60">{copy.type}</p>
                <p className="mt-2 text-[#141446]">
                  {detail.property.propertyType
                    ? formatPropertyTypeLabel(detail.property.propertyType, locale)
                    : copy.unavailable}
                </p>
              </div>
              <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
                <p className="text-xs uppercase text-[#141446]/60">{copy.market}</p>
                <p className="mt-2 text-[#141446]">
                  {getBusinessTypeLabel(detail.listing?.businessType, locale)}
                </p>
              </div>
              <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
                <p className="text-xs uppercase text-[#141446]/60">{copy.price}</p>
                <p className="mt-2 text-[#141446]">
                  {typeof detail.listing?.priceAmount === "number"
                    ? formatCurrency(detail.listing.priceAmount, locale, "EUR")
                    : copy.unavailable}
                </p>
              </div>
              <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
                <p className="text-xs uppercase text-[#141446]/60">{copy.surface}</p>
                <p className="mt-2 text-[#141446]">
                  {detail.property.livingArea ? `${detail.property.livingArea} m²` : copy.unavailable}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
            <h3 className="text-xl font-semibold text-[#141446]">{copy.details}</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
                <p className="text-xs uppercase text-[#141446]/60">{copy.address}</p>
                <p className="mt-2 text-[#141446]">{displayAddress}</p>
              </div>
              <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
                <p className="text-xs uppercase text-[#141446]/60">{copy.rooms}</p>
                <p className="mt-2 text-[#141446]">{detail.property.rooms ?? copy.unavailable}</p>
              </div>
              <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
                <p className="text-xs uppercase text-[#141446]/60">{copy.bedrooms}</p>
                <p className="mt-2 text-[#141446]">{detail.property.bedrooms ?? copy.unavailable}</p>
              </div>
              <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
                <p className="text-xs uppercase text-[#141446]/60">{copy.floor}</p>
                <p className="mt-2 text-[#141446]">{detail.property.floor ?? copy.unavailable}</p>
              </div>
              <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
                <p className="text-xs uppercase text-[#141446]/60">{copy.terrace}</p>
                <p className="mt-2 text-[#141446]">{getBooleanLabel(detail.property.hasTerrace, locale)}</p>
              </div>
              <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
                <p className="text-xs uppercase text-[#141446]/60">{copy.elevator}</p>
                <p className="mt-2 text-[#141446]">{getBooleanLabel(detail.property.hasElevator, locale)}</p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
            <h3 className="text-xl font-semibold text-[#141446]">{copy.description}</h3>
            <p className="mt-4 text-sm text-[#141446]/75">
              {detail.property.description ?? copy.noDescription}
            </p>
          </section>

          {hasLocationMap ? (
            <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
              <h3 className="text-xl font-semibold text-[#141446]">{copy.location}</h3>
              <div className="mt-4">
                <PropertyLocationMap
                  latitude={detail.property.latitude}
                  longitude={detail.property.longitude}
                  address={fullAddress || null}
                  title={title}
                  size="compact"
                />
              </div>
            </section>
          ) : null}

          <PropertyDocumentsClientPanel
            propertyId={detail.property.id}
            clientProfileId={context.clientProfile.id}
            locale={locale}
          />
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
            <h3 className="text-xl font-semibold text-[#141446]">{copy.actions}</h3>
            <div className="mt-4 space-y-3 text-sm text-[#141446]">
              {detail.property.appointmentServiceUrl ? (
                <a
                  href={detail.property.appointmentServiceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block rounded bg-[#141446] px-4 py-2 text-[#f4ece4]"
                >
                  {copy.book}
                </a>
              ) : null}
              {detail.listing?.canonicalPath && detail.listing.isPublished ? (
                <Link
                  href={localizePath(detail.listing.canonicalPath, locale)}
                  className="block underline"
                >
                  {copy.publicListing}
                </Link>
              ) : null}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
