import Link from "next/link";
import { notFound } from "next/navigation";
import { getRequestLocale } from "@/lib/i18n/request";
import { formatCurrency, formatDateTime } from "@/lib/i18n/format";
import {
  formatPropertyTypeLabel as formatLocalizedPropertyTypeLabel,
  getMandateStatusLabel,
  getSellerProjectStatusLabel,
} from "@/lib/i18n/domain";
import { localizePath } from "@/lib/i18n/routing";
import { requireClientSpacePageContext } from "@/lib/client-space/auth";
import { getClientPortalProjectDetail } from "@/services/clients/client-portal.service";
import type { SellerPortalProjectDetail } from "@/services/clients/seller-portal.service";
import type { AppLocale } from "@/lib/i18n/config";

type SellerProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

const getSellerEventCopy = (eventName: string, eventCategory: string, locale: AppLocale) => {
  switch (eventName) {
    case "client_invitation.sent":
      return {
        title:
          locale === "en"
            ? "Your client portal access is ready"
            : locale === "es"
              ? "Su acceso al espacio cliente está listo"
              : locale === "ru"
                ? "Доступ к вашему клиентскому пространству готов"
                : "Votre accès à l'espace client est prêt",
        body:
          locale === "en"
            ? "A secure login link has been sent so you can find your project at any time."
            : locale === "es"
              ? "Se le ha enviado un enlace seguro para que pueda encontrar su proyecto en cualquier momento."
              : locale === "ru"
                ? "Вам отправлена защищенная ссылка для входа, чтобы вы могли в любой момент найти свой проект."
                : "Un lien de connexion sécurisé vous a été envoyé pour retrouver votre projet à tout moment.",
      };
    case "client_invitation.accepted":
      return {
        title:
          locale === "en"
            ? "Your client portal is active"
            : locale === "es"
              ? "Su espacio cliente está activo"
              : locale === "ru"
                ? "Ваше клиентское пространство активно"
                : "Votre espace client est actif",
        body:
          locale === "en"
            ? "You can now follow your seller project and access your information in one place."
            : locale === "es"
              ? "Ahora puede seguir su proyecto vendedor y encontrar toda su información en un solo lugar."
              : locale === "ru"
                ? "Теперь вы можете следить за своим проектом продавца и находить всю информацию в одном месте."
                : "Vous pouvez maintenant suivre votre projet vendeur et retrouver vos informations en un seul endroit.",
      };
    case "project_property.linked_from_estimation":
    case "project_property.linked":
      return {
        title: "Votre bien a été ajouté à votre espace",
        body: "Les informations de votre bien sont désormais rattachées à votre projet pour un suivi plus clair.",
      };
    case "valuation.recorded":
      return {
        title:
          locale === "en"
            ? "Your valuation is available"
            : locale === "es"
              ? "Su valoración está disponible"
              : locale === "ru"
                ? "Ваша оценка доступна"
                : "Votre estimation est disponible",
        body:
          locale === "en"
            ? "Your first value range has been recorded in your client portal."
            : locale === "es"
              ? "Su primera horquilla de valor se ha registrado en su espacio cliente."
              : locale === "ru"
                ? "Первый диапазон оценки сохранен в вашем клиентском пространстве."
                : "Votre première fourchette de valeur a été enregistrée dans votre espace client.",
      };
    case "seller_project.created_from_lead":
      return {
        title: "Votre projet vendeur est ouvert",
        body: "Votre espace Sillage commence à se structurer autour de votre bien et de votre vente.",
      };
    case "advisor.assigned":
      return {
        title: "Un conseiller Sillage vous accompagne",
        body: "Votre projet est maintenant suivi par un interlocuteur dédié.",
      };
    default:
      return {
        title:
          eventCategory === "valuation"
            ? locale === "en"
              ? "Your project is moving forward"
              : locale === "es"
                ? "Su proyecto avanza"
                : locale === "ru"
                  ? "Ваш проект развивается"
                  : "Votre projet évolue"
            : eventCategory === "invitation"
              ? locale === "en"
                ? "Your client access is progressing"
                : locale === "es"
                  ? "Su acceso cliente avanza"
                  : locale === "ru"
                    ? "Ваш клиентский доступ развивается"
                    : "Votre accès client progresse"
              : locale === "en"
                ? "A new step has been completed"
                : locale === "es"
                  ? "Se ha alcanzado una nueva etapa"
                  : locale === "ru"
                    ? "Пройден новый этап"
                    : "Une nouvelle étape a été franchie",
        body:
          locale === "en"
            ? "Your client portal has been updated with new information about your project."
            : locale === "es"
              ? "Su espacio cliente se ha actualizado con nueva información sobre su proyecto."
              : locale === "ru"
                ? "Ваше клиентское пространство обновлено новой информацией о вашем проекте."
                : "Votre espace client a été mis à jour avec une nouvelle information concernant votre projet.",
      };
  }
};

function SellerProjectDetailView({
  detail,
  locale,
}: {
  detail: SellerPortalProjectDetail;
  locale: AppLocale;
}) {
  const copy = {
    fr: {
      back: "Retour à mes projets",
      sellerProject: "Projet vendeur",
      projectStatus: "Statut projet",
      mandate: "Mandat",
      lastLogin: "Dernière connexion",
      firstLogin: "Première connexion",
      valuation: "Dernière estimation",
      indicative: "Valeur indicative",
      range: "Fourchette",
      source: "Source",
      updated: "Mise à jour le",
      unavailable: "Non disponible",
      noValuation: "Aucune estimation détaillée n'est encore disponible.",
      linkedProperty: "Bien rattaché",
      noProperty: "Aucun bien n'est encore rattaché à ce projet.",
      openProperty: "Ouvrir la fiche du bien",
      syncingAddress: "Adresse en cours de synchronisation",
      unknownType: "Type non renseigné",
      primaryProperty: "Bien principal",
      history: "Historique récent",
      noEvents: "Aucun événement visible pour le moment.",
      advisor: "Votre conseiller",
      noAdvisor: "Aucun conseiller n'est encore affecté. Notre équipe reviendra vers vous.",
      advisorAvailability:
        "Prenez directement rendez-vous avec votre conseiller pour un échange en physique ou en visio.",
      advisorBookingPending:
        "La prise de rendez-vous en ligne n'est pas encore disponible pour ce conseiller. Vous pouvez déjà le contacter par email.",
      nextAction: "Prochaine action",
      book: "Prendre rendez-vous",
      bookWithAdvisor: "Prendre rendez-vous avec mon conseiller",
      contactAdvisor: "Contacter mon conseiller par email",
      contactTeam: "Contacter l'équipe Sillage Immo",
      notDefined: "À définir",
      none: "Aucun",
    },
    en: {
      back: "Back to my projects",
      sellerProject: "Seller project",
      projectStatus: "Project status",
      mandate: "Mandate",
      lastLogin: "Last login",
      firstLogin: "First login",
      valuation: "Latest valuation",
      indicative: "Indicative value",
      range: "Range",
      source: "Source",
      updated: "Updated on",
      unavailable: "Unavailable",
      noValuation: "No detailed valuation is available yet.",
      linkedProperty: "Linked property",
      noProperty: "No property is linked to this project yet.",
      openProperty: "Open property sheet",
      syncingAddress: "Address is being synchronized",
      unknownType: "Property type not provided",
      primaryProperty: "Primary property",
      history: "Recent timeline",
      noEvents: "No visible event at the moment.",
      advisor: "Your advisor",
      noAdvisor: "No advisor has been assigned yet. Our team will get back to you.",
      advisorAvailability:
        "Book directly with your advisor for an in-person meeting or a video appointment.",
      advisorBookingPending:
        "Online booking is not available for this advisor yet. You can already contact them by email.",
      nextAction: "Next action",
      book: "Book an appointment",
      bookWithAdvisor: "Book with my advisor",
      contactAdvisor: "Contact my advisor by email",
      contactTeam: "Contact the Sillage Immo team",
      notDefined: "To be defined",
      none: "None",
    },
    es: {
      back: "Volver a mis proyectos",
      sellerProject: "Proyecto vendedor",
      projectStatus: "Estado del proyecto",
      mandate: "Mandato",
      lastLogin: "Última conexión",
      firstLogin: "Primera conexión",
      valuation: "Última valoración",
      indicative: "Valor indicativo",
      range: "Horquilla",
      source: "Fuente",
      updated: "Actualizado el",
      unavailable: "No disponible",
      noValuation: "Aún no hay una valoración detallada disponible.",
      linkedProperty: "Inmueble vinculado",
      noProperty: "Aún no hay ningún inmueble vinculado a este proyecto.",
      openProperty: "Abrir la ficha del inmueble",
      syncingAddress: "Dirección en curso de sincronización",
      unknownType: "Tipo no indicado",
      primaryProperty: "Inmueble principal",
      history: "Historial reciente",
      noEvents: "No hay eventos visibles por el momento.",
      advisor: "Su asesor",
      noAdvisor: "Aún no se ha asignado ningún asesor. Nuestro equipo se pondrá en contacto con usted.",
      advisorAvailability:
        "Reserve directamente con su asesor una cita presencial o una videollamada.",
      advisorBookingPending:
        "La reserva en línea todavía no está disponible para este asesor. Ya puede contactarlo por email.",
      nextAction: "Próxima acción",
      book: "Reservar una cita",
      bookWithAdvisor: "Reservar con mi asesor",
      contactAdvisor: "Contactar con mi asesor por email",
      contactTeam: "Contactar con el equipo de Sillage Immo",
      notDefined: "Por definir",
      none: "Ninguno",
    },
    ru: {
      back: "Назад к моим проектам",
      sellerProject: "Проект продавца",
      projectStatus: "Статус проекта",
      mandate: "Мандат",
      lastLogin: "Последний вход",
      firstLogin: "Первый вход",
      valuation: "Последняя оценка",
      indicative: "Ориентировочная стоимость",
      range: "Диапазон",
      source: "Источник",
      updated: "Обновлено",
      unavailable: "Недоступно",
      noValuation: "Подробная оценка пока недоступна.",
      linkedProperty: "Привязанный объект",
      noProperty: "К этому проекту пока не привязан ни один объект.",
      openProperty: "Открыть карточку объекта",
      syncingAddress: "Адрес синхронизируется",
      unknownType: "Тип объекта не указан",
      primaryProperty: "Основной объект",
      history: "Недавняя история",
      noEvents: "Пока нет видимых событий.",
      advisor: "Ваш консультант",
      noAdvisor: "Консультант еще не назначен. Наша команда свяжется с вами.",
      advisorAvailability:
        "Запишитесь напрямую к вашему консультанту на личную встречу или видеозвонок.",
      advisorBookingPending:
        "Онлайн-запись для этого консультанта пока недоступна. Вы уже можете связаться с ним по email.",
      nextAction: "Следующее действие",
      book: "Записаться на встречу",
      bookWithAdvisor: "Записаться к моему консультанту",
      contactAdvisor: "Связаться с консультантом по email",
      contactTeam: "Связаться с командой Sillage Immo",
      notDefined: "Уточняется",
      none: "Нет",
    },
  }[locale];
  const formatPortalDate = (value: string) => formatDateTime(value, locale);
  const appointmentUrl =
    detail.advisor?.bookingUrl ??
    detail.properties.find((property) => property.isPrimary && property.appointmentServiceUrl)
      ?.appointmentServiceUrl ??
    detail.properties.find((property) => property.appointmentServiceUrl)?.appointmentServiceUrl ??
    null;
  const advisorDisplayName =
    detail.advisor?.fullName ??
    ([detail.advisor?.firstName, detail.advisor?.lastName].filter(Boolean).join(" ").trim() || null) ??
    detail.advisor?.email ??
    null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4">
        <Link href={localizePath("/espace-client", locale)} className="text-sm underline text-[#141446]">
          {copy.back}
        </Link>
      </div>

      <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
        <p className="text-xs uppercase tracking-[0.18em] text-[#141446]/60">{copy.sellerProject}</p>
        <h2 className="mt-2 text-2xl font-semibold text-[#141446]">
          {detail.project.title ?? copy.sellerProject}
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
            <p className="text-xs uppercase text-[#141446]/60">{copy.projectStatus}</p>
            <p className="mt-2 text-[#141446]">
              {getSellerProjectStatusLabel(detail.project.projectStatus, locale) ?? copy.notDefined}
            </p>
          </div>
          <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
            <p className="text-xs uppercase text-[#141446]/60">{copy.mandate}</p>
            <p className="mt-2 text-[#141446]">
              {getMandateStatusLabel(detail.project.mandateStatus, locale) ?? copy.none}
            </p>
          </div>
          <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
            <p className="text-xs uppercase text-[#141446]/60">{copy.lastLogin}</p>
            <p className="mt-2 text-[#141446]">
              {detail.client.lastLoginAt ? formatPortalDate(detail.client.lastLoginAt) : copy.firstLogin}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
            <h3 className="text-xl font-semibold text-[#141446]">{copy.valuation}</h3>
            {detail.valuation ? (
              <div className="mt-4 space-y-2 text-[#141446]">
                <p>
                  {copy.indicative} :{" "}
                  <strong>
                    {detail.valuation.estimatedPrice
                      ? formatCurrency(detail.valuation.estimatedPrice, locale, "EUR")
                      : copy.unavailable}
                  </strong>
                </p>
                {(detail.valuation.valuationLow || detail.valuation.valuationHigh) && (
                  <p className="text-sm text-[#141446]/75">
                    {copy.range} :
                    {detail.valuation.valuationLow
                      ? ` ${formatCurrency(detail.valuation.valuationLow, locale, "EUR")}`
                      : " n/a"}
                    {" - "}
                    {detail.valuation.valuationHigh
                      ? `${formatCurrency(detail.valuation.valuationHigh, locale, "EUR")}`
                      : "n/a"}
                  </p>
                )}
                <p className="text-sm text-[#141446]/75">
                  {copy.source} : {detail.valuation.provider ?? "Sillage Immo"}
                  {detail.valuation.syncedAt ? ` · ${copy.updated} ${formatPortalDate(detail.valuation.syncedAt)}` : ""}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-[#141446]/75">
                {copy.noValuation}
              </p>
            )}
          </section>

          <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
            <h3 className="text-xl font-semibold text-[#141446]">{copy.linkedProperty}</h3>
            {detail.properties.length === 0 ? (
              <p className="mt-4 text-sm text-[#141446]/75">{copy.noProperty}</p>
            ) : (
              <div className="mt-4 space-y-3">
                {detail.properties.map((property) => (
                  <Link
                    key={property.id}
                    href={localizePath(`/espace-client/biens/${property.id}`, locale)}
                    className="block rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4 transition-colors hover:border-[rgba(20,20,70,0.3)]"
                  >
                    <p className="font-medium text-[#141446]">
                      {property.formattedAddress ?? copy.syncingAddress}
                    </p>
                    <p className="mt-1 text-sm text-[#141446]/75">
                      {property.propertyType
                        ? formatLocalizedPropertyTypeLabel(property.propertyType, locale)
                        : copy.unknownType}
                      {property.livingArea ? ` · ${property.livingArea} m²` : ""}
                      {property.isPrimary ? ` · ${copy.primaryProperty}` : ""}
                    </p>
                    <p className="mt-3 text-sm underline text-[#141446]">{copy.openProperty}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
            <h3 className="text-xl font-semibold text-[#141446]">{copy.history}</h3>
            {detail.events.length === 0 ? (
              <p className="mt-4 text-sm text-[#141446]/75">{copy.noEvents}</p>
            ) : (
              <div className="mt-4 space-y-3">
                {detail.events.map((event) => (
                  <div key={event.id} className="flex flex-col gap-1 rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
                    {(() => {
                      const eventCopy = getSellerEventCopy(event.eventName, event.eventCategory, locale);
                      return (
                        <>
                          <span className="text-xs uppercase text-[#141446]/55">{formatPortalDate(event.createdAt)}</span>
                          <span className="text-sm font-medium text-[#141446]">{eventCopy.title}</span>
                          <span className="text-sm text-[#141446]/72">{eventCopy.body}</span>
                        </>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
            <h3 className="text-xl font-semibold text-[#141446]">{copy.advisor}</h3>
            {detail.advisor ? (
              <div className="mt-4 space-y-2 text-sm text-[#141446]">
                <p className="font-medium text-base">{advisorDisplayName}</p>
                <p>
                  <a href={`mailto:${detail.advisor.email}`} className="underline">
                    {detail.advisor.email}
                  </a>
                </p>
                {detail.advisor.phone ? (
                  <p>
                    <a href={`tel:${detail.advisor.phone}`} className="underline">
                      {detail.advisor.phone}
                    </a>
                  </p>
                ) : null}
                {detail.advisor.bookingUrl ? (
                  <div className="pt-3">
                    <p className="mb-3 text-[#141446]/75">{copy.advisorAvailability}</p>
                    <a
                      href={detail.advisor.bookingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block rounded bg-[#141446] px-4 py-2 text-[#f4ece4]"
                    >
                      {copy.bookWithAdvisor}
                    </a>
                  </div>
                ) : (
                  <p className="pt-3 text-[#141446]/75">{copy.advisorBookingPending}</p>
                )}
              </div>
            ) : (
              <p className="mt-4 text-sm text-[#141446]/75">
                {copy.noAdvisor}
              </p>
            )}
          </section>

          <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
            <h3 className="text-xl font-semibold text-[#141446]">{copy.nextAction}</h3>
            <div className="mt-4 space-y-3 text-sm text-[#141446]">
              {appointmentUrl ? (
                <a
                  href={appointmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block rounded bg-[#141446] px-4 py-2 text-[#f4ece4]"
                >
                  {copy.book}
                </a>
              ) : null}
              {detail.advisor ? (
                <a href={`mailto:${detail.advisor.email}`} className="block underline">
                  {copy.contactAdvisor}
                </a>
              ) : (
                <a href="mailto:contact@sillage-immo.com" className="block underline">
                  {copy.contactTeam}
                </a>
              )}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

export default async function SellerProjectPage({ params }: SellerProjectPageProps) {
  const locale = await getRequestLocale();
  const context = await requireClientSpacePageContext();
  const { projectId } = await params;
  const detail = await getClientPortalProjectDetail({
    authUserId: context.authUserId,
    projectId,
    locale,
  });

  if (!detail) {
    notFound();
  }

  if (detail.kind === "seller") {
    return <SellerProjectDetailView detail={detail.detail} locale={locale} />;
  }

  const copy = {
    fr: {
      back: "Retour à mes projets",
      buyer: "Projet acquéreur",
      client: "Projet client",
      status: "Statut projet",
      createdAt: "Création",
      linkedSearch: "Recherche rattachée",
      preparing: "Projet en préparation",
      searchArea: "Zone de recherche",
      searchAreaFallback: "Zone en cours de qualification",
      budget: "Budget",
      budgetFallback: "Budget à préciser",
      searchStatus: "Statut recherche",
      searchStatusFallback: "Recherche en cours de qualification",
      financing: "Financement",
      financingFallback: "Situation non renseignée",
      searchedTypes: "Types recherchés",
      typesFallback: "Types de biens à préciser",
      multiProject:
        "Votre compte peut déjà accueillir plusieurs projets. Le détail de ce parcours continuera à s'enrichir sans changer votre mode de connexion.",
    },
    en: {
      back: "Back to my projects",
      buyer: "Buyer project",
      client: "Client project",
      status: "Project status",
      createdAt: "Created on",
      linkedSearch: "Linked search",
      preparing: "Project being prepared",
      searchArea: "Search area",
      searchAreaFallback: "Area being qualified",
      budget: "Budget",
      budgetFallback: "Budget to be clarified",
      searchStatus: "Search status",
      searchStatusFallback: "Search being qualified",
      financing: "Financing",
      financingFallback: "Situation not provided",
      searchedTypes: "Requested property types",
      typesFallback: "Property types to be defined",
      multiProject:
        "Your account can already host several projects. The detail of this journey will continue to grow without changing your login mode.",
    },
    es: {
      back: "Volver a mis proyectos",
      buyer: "Proyecto comprador",
      client: "Proyecto cliente",
      status: "Estado del proyecto",
      createdAt: "Creación",
      linkedSearch: "Búsqueda vinculada",
      preparing: "Proyecto en preparación",
      searchArea: "Zona de búsqueda",
      searchAreaFallback: "Zona en fase de cualificación",
      budget: "Presupuesto",
      budgetFallback: "Presupuesto por precisar",
      searchStatus: "Estado de la búsqueda",
      searchStatusFallback: "Búsqueda en fase de cualificación",
      financing: "Financiación",
      financingFallback: "Situación no indicada",
      searchedTypes: "Tipos buscados",
      typesFallback: "Tipos de inmueble por precisar",
      multiProject:
        "Su cuenta ya puede acoger varios proyectos. El detalle de este recorrido seguirá enriqueciéndose sin cambiar su modo de conexión.",
    },
    ru: {
      back: "Назад к моим проектам",
      buyer: "Проект покупателя",
      client: "Клиентский проект",
      status: "Статус проекта",
      createdAt: "Создан",
      linkedSearch: "Привязанный поиск",
      preparing: "Проект в подготовке",
      searchArea: "Зона поиска",
      searchAreaFallback: "Зона уточняется",
      budget: "Бюджет",
      budgetFallback: "Бюджет уточняется",
      searchStatus: "Статус поиска",
      searchStatusFallback: "Поиск в процессе квалификации",
      financing: "Финансирование",
      financingFallback: "Информация не указана",
      searchedTypes: "Искомые типы объектов",
      typesFallback: "Типы объектов уточняются",
      multiProject:
        "Ваша учетная запись уже может объединять несколько проектов. Детализация этого сценария будет расширяться без изменения способа входа.",
    },
  }[locale];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4">
        <Link href={localizePath("/espace-client", locale)} className="text-sm underline text-[#141446]">
          {copy.back}
        </Link>
      </div>

      <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
        <p className="text-xs uppercase tracking-[0.18em] text-[#141446]/60">
          {detail.kind === "buyer" ? copy.buyer : detail.detail.projectTypeLabel}
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-[#141446]">
          {detail.detail.title ?? (detail.kind === "buyer" ? copy.buyer : copy.client)}
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
            <p className="text-xs uppercase text-[#141446]/60">{copy.status}</p>
            <p className="mt-2 text-[#141446]">{detail.detail.status}</p>
          </div>
          <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
            <p className="text-xs uppercase text-[#141446]/60">{copy.createdAt}</p>
            <p className="mt-2 text-[#141446]">
              {formatDateTime(detail.detail.createdAt, locale)}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
        <h3 className="text-xl font-semibold text-[#141446]">
          {detail.kind === "buyer" ? copy.linkedSearch : copy.preparing}
        </h3>
        <p className="mt-4 text-sm text-[#141446]/75">{detail.detail.message}</p>
        {detail.kind === "buyer" ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
              <p className="text-xs uppercase text-[#141446]/60">{copy.searchArea}</p>
              <p className="mt-2 text-[#141446]">
                {detail.detail.locationLabel ?? copy.searchAreaFallback}
              </p>
            </div>
            <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
              <p className="text-xs uppercase text-[#141446]/60">{copy.budget}</p>
              <p className="mt-2 text-[#141446]">
                {detail.detail.budgetLabel ?? copy.budgetFallback}
              </p>
            </div>
            <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
              <p className="text-xs uppercase text-[#141446]/60">{copy.searchStatus}</p>
              <p className="mt-2 text-[#141446]">
                {detail.detail.searchStatus ?? copy.searchStatusFallback}
              </p>
            </div>
            <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
              <p className="text-xs uppercase text-[#141446]/60">{copy.financing}</p>
              <p className="mt-2 text-[#141446]">
                {detail.detail.financingStatus ?? copy.financingFallback}
              </p>
            </div>
          </div>
        ) : null}
        {detail.kind === "buyer" && (detail.detail.propertyTypes.length > 0 || detail.detail.roomsMin || detail.detail.livingAreaMin) ? (
          <p className="mt-4 text-sm text-[#141446]/70">
            {detail.detail.propertyTypes.length > 0
              ? `${copy.searchedTypes} : ${detail.detail.propertyTypes.join(", ")}`
              : copy.typesFallback}
            {detail.detail.roomsMin ? ` · ${detail.detail.roomsMin} pièce(s) min.` : ""}
            {detail.detail.livingAreaMin ? ` · ${detail.detail.livingAreaMin} m² min.` : ""}
          </p>
        ) : null}
        <p className="mt-3 text-sm text-[#141446]/70">
          {copy.multiProject}
        </p>
      </section>
    </div>
  );
}
