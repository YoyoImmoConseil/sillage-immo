import { notFound } from "next/navigation";
import Link from "next/link";
import { getRequestLocale } from "@/lib/i18n/request";
import { formatCurrency, formatDate } from "@/lib/i18n/format";
import { localizePath } from "@/lib/i18n/routing";
import { formatPropertyTypeLabel } from "@/lib/i18n/domain";
import { requireClientSpacePageContext } from "@/lib/client-space/auth";
import { getClientBuyerSearchDetail } from "@/services/buyers/buyer-portal.service";
import { BuyerSearchDashboard } from "../_components/buyer-search-dashboard";

type SavedBuyerSearchPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function SavedBuyerSearchPage(props: SavedBuyerSearchPageProps) {
  const locale = await getRequestLocale();
  const context = await requireClientSpacePageContext();
  const { projectId } = await props.params;
  const detail = await getClientBuyerSearchDetail({
    clientProfileId: context.clientProfile.id,
    clientProjectId: projectId,
  });

  if (!detail) {
    notFound();
  }

  const copy = {
    fr: {
      kicker: "Recherche acquéreur",
      emailVerified: "Email vérifié",
      emailPending: "Email non encore vérifié",
      createdAt: "Créée le",
      updatedAt: "Mise à jour",
      statusActive: "Active",
      statusPaused: "En pause",
      statusClosed: "Archivée",
      archivedBanner:
        "Cette recherche est archivée, elle ne génère plus d'alerte.",
      back: "Retour à Mon Espace",
      createAnother: "Créer une nouvelle recherche",
      sectionSummary: "Vos critères",
      sectionZone: "Votre zone sur la carte",
      sectionZoneHint:
        "Zone géographique utilisée pour le matching et transmise à notre logiciel immobilier.",
      zoneNotSet: "Aucune zone n'a été dessinée sur la carte pour cette recherche.",
      sectionMatches: "Biens compatibles",
      sectionActions: "Gérer cette recherche",
      pause: "Mettre en pause",
      resume: "Réactiver",
      archive: "Archiver la recherche",
      edit: "Modifier les critères",
      save: "Enregistrer",
      cancel: "Annuler",
      noMatches:
        "Aucun bien ne correspond encore à cette recherche. Vous serez notifié dès qu'un bien est publié.",
      newBadge: "Nouveau",
      scoreLabel: "Score",
      openListing: "Voir le bien",
      confirmArchive:
        "Archiver cette recherche ? Vous ne recevrez plus d'alertes et elle sera masquée de votre tableau de bord.",
      labels: {
        businessType: "Type",
        sale: "Achat",
        rental: "Location",
        cities: "Localisation",
        propertyTypes: "Types",
        budget: "Budget",
        rooms: "Pièces",
        surface: "Surface",
        floor: "Étage",
        terrace: "Terrasse",
        elevator: "Ascenseur",
        yes: "Oui",
        no: "Non",
        any: "Indifférent",
      },
    },
    en: {
      kicker: "Buyer search",
      emailVerified: "Email verified",
      emailPending: "Email not yet verified",
      createdAt: "Created on",
      updatedAt: "Updated",
      statusActive: "Active",
      statusPaused: "Paused",
      statusClosed: "Archived",
      archivedBanner: "This search is archived and no longer generates alerts.",
      back: "Back to My Account",
      createAnother: "Create another search",
      sectionSummary: "Your criteria",
      sectionZone: "Your area on the map",
      sectionZoneHint:
        "Geographical zone used for matching and pushed to our CRM to target relevant listings.",
      zoneNotSet: "No area has been drawn on the map for this search yet.",
      sectionMatches: "Matching properties",
      sectionActions: "Manage this search",
      pause: "Pause",
      resume: "Resume",
      archive: "Archive search",
      edit: "Edit criteria",
      save: "Save",
      cancel: "Cancel",
      noMatches:
        "No matching property yet. You'll be notified as soon as a new one is listed.",
      newBadge: "New",
      scoreLabel: "Score",
      openListing: "View listing",
      confirmArchive:
        "Archive this search? You will stop receiving alerts and it will be hidden from your dashboard.",
      labels: {
        businessType: "Type",
        sale: "Buy",
        rental: "Rent",
        cities: "Location",
        propertyTypes: "Types",
        budget: "Budget",
        rooms: "Rooms",
        surface: "Surface",
        floor: "Floor",
        terrace: "Terrace",
        elevator: "Elevator",
        yes: "Yes",
        no: "No",
        any: "Any",
      },
    },
    es: {
      kicker: "Búsqueda comprador",
      emailVerified: "Email verificado",
      emailPending: "Email aún no verificado",
      createdAt: "Creada el",
      updatedAt: "Actualizada",
      statusActive: "Activa",
      statusPaused: "En pausa",
      statusClosed: "Archivada",
      archivedBanner: "Esta búsqueda está archivada y ya no genera alertas.",
      back: "Volver a mi espacio",
      createAnother: "Crear otra búsqueda",
      sectionSummary: "Sus criterios",
      sectionZone: "Su zona en el mapa",
      sectionZoneHint:
        "Zona geográfica usada para el matching y transmitida a nuestro CRM para dirigir las propiedades relevantes.",
      zoneNotSet: "Aún no se ha dibujado ninguna zona en el mapa para esta búsqueda.",
      sectionMatches: "Inmuebles compatibles",
      sectionActions: "Gestionar esta búsqueda",
      pause: "Pausar",
      resume: "Reactivar",
      archive: "Archivar búsqueda",
      edit: "Editar criterios",
      save: "Guardar",
      cancel: "Cancelar",
      noMatches:
        "Aún ningún inmueble coincide. Le avisaremos en cuanto se publique uno nuevo.",
      newBadge: "Nuevo",
      scoreLabel: "Puntuación",
      openListing: "Ver inmueble",
      confirmArchive:
        "¿Archivar esta búsqueda? Dejará de recibir alertas y se ocultará del panel.",
      labels: {
        businessType: "Tipo",
        sale: "Compra",
        rental: "Alquiler",
        cities: "Ubicación",
        propertyTypes: "Tipos",
        budget: "Presupuesto",
        rooms: "Habitaciones",
        surface: "Superficie",
        floor: "Planta",
        terrace: "Terraza",
        elevator: "Ascensor",
        yes: "Sí",
        no: "No",
        any: "Indiferente",
      },
    },
    ru: {
      kicker: "Запрос покупателя",
      emailVerified: "Email подтвержден",
      emailPending: "Email пока не подтвержден",
      createdAt: "Создан",
      updatedAt: "Обновлен",
      statusActive: "Активен",
      statusPaused: "Приостановлен",
      statusClosed: "В архиве",
      archivedBanner: "Этот запрос в архиве и больше не отправляет уведомления.",
      back: "Назад в кабинет",
      createAnother: "Создать новый запрос",
      sectionSummary: "Ваши критерии",
      sectionZone: "Зона на карте",
      sectionZoneHint:
        "Географическая зона, используемая для подбора и передачи в CRM.",
      zoneNotSet: "Зона на карте для этого запроса ещё не нарисована.",
      sectionMatches: "Подходящие объекты",
      sectionActions: "Управление запросом",
      pause: "Приостановить",
      resume: "Возобновить",
      archive: "В архив",
      edit: "Изменить критерии",
      save: "Сохранить",
      cancel: "Отмена",
      noMatches:
        "Пока нет подходящих объектов. Мы уведомим вас, как только появится подходящий.",
      newBadge: "Новое",
      scoreLabel: "Оценка",
      openListing: "Открыть объект",
      confirmArchive:
        "Переместить запрос в архив? Вы перестанете получать уведомления.",
      labels: {
        businessType: "Тип",
        sale: "Покупка",
        rental: "Аренда",
        cities: "Расположение",
        propertyTypes: "Типы",
        budget: "Бюджет",
        rooms: "Комнаты",
        surface: "Площадь",
        floor: "Этаж",
        terrace: "Терраса",
        elevator: "Лифт",
        yes: "Да",
        no: "Нет",
        any: "Неважно",
      },
    },
  }[locale];

  const formatBudget = (value: number | null) =>
    typeof value === "number" ? formatCurrency(value, locale, "EUR") : "—";

  const criteriaSummary = [
    {
      label: copy.labels.businessType,
      value:
        detail.searchProfile.businessType === "rental"
          ? copy.labels.rental
          : copy.labels.sale,
    },
    {
      label: copy.labels.cities,
      value:
        detail.searchProfile.locationText ??
        (detail.searchProfile.cities.length > 0
          ? detail.searchProfile.cities.join(", ")
          : "—"),
    },
    {
      label: copy.labels.propertyTypes,
      value:
        detail.searchProfile.propertyTypes.length > 0
          ? detail.searchProfile.propertyTypes
              .map((type) => formatPropertyTypeLabel(type, locale) ?? type)
              .join(", ")
          : copy.labels.any,
    },
    {
      label: copy.labels.budget,
      value: `${formatBudget(detail.searchProfile.budgetMin)} — ${formatBudget(
        detail.searchProfile.budgetMax
      )}`,
    },
    {
      label: copy.labels.rooms,
      value: `${detail.searchProfile.roomsMin ?? "—"} / ${detail.searchProfile.roomsMax ?? "—"}`,
    },
    {
      label: copy.labels.surface,
      value: `${detail.searchProfile.livingAreaMin ?? "—"} / ${
        detail.searchProfile.livingAreaMax ?? "—"
      } m²`,
    },
    {
      label: copy.labels.floor,
      value: `${detail.searchProfile.floorMin ?? "—"} / ${detail.searchProfile.floorMax ?? "—"}`,
    },
    {
      label: copy.labels.terrace,
      value:
        detail.searchProfile.requiresTerrace === true
          ? copy.labels.yes
          : detail.searchProfile.requiresTerrace === false
            ? copy.labels.no
            : copy.labels.any,
    },
    {
      label: copy.labels.elevator,
      value:
        detail.searchProfile.requiresElevator === true
          ? copy.labels.yes
          : detail.searchProfile.requiresElevator === false
            ? copy.labels.no
            : copy.labels.any,
    },
  ];

  const statusLabel =
    detail.searchProfile.status === "paused"
      ? copy.statusPaused
      : detail.searchProfile.status === "closed"
        ? copy.statusClosed
        : copy.statusActive;

  const clientHome = localizePath("/espace-client", locale);
  const createAnotherHref = localizePath("/recherche/nouvelle", locale);
  const archivedOrClosed =
    detail.clientProjectStatus === "archived" ||
    detail.searchProfile.status === "closed";

  return (
    <section className="space-y-6">
      <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-[#f4ece4] p-8">
        <p className="text-xs uppercase tracking-[0.18em] text-[#141446]/60">
          {copy.kicker}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-[#141446]">
            {detail.clientProjectTitle ?? copy.kicker}
          </h1>
          <span className="rounded-full border border-[rgba(20,20,70,0.18)] px-3 py-1 text-xs font-semibold text-[#141446]">
            {statusLabel}
          </span>
          {detail.unreadCount > 0 ? (
            <span className="rounded-full bg-[#141446] px-3 py-1 text-xs font-semibold text-[#f4ece4]">
              {detail.unreadCount} {copy.newBadge.toLowerCase()}
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-sm text-[#141446]/70">
          {copy.createdAt} {formatDate(detail.createdAt, locale)} ·{" "}
          {copy.updatedAt} {formatDate(detail.searchProfileUpdatedAt, locale)} ·{" "}
          {detail.buyerLead?.emailVerifiedAt ? copy.emailVerified : copy.emailPending}
        </p>
        {archivedOrClosed ? (
          <p className="mt-3 rounded-lg bg-[#fff2c8] px-3 py-2 text-sm text-[#5a4a16]">
            {copy.archivedBanner}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-3">
          <Link className="sillage-btn-secondary rounded px-4 py-2 text-sm" href={clientHome}>
            {copy.back}
          </Link>
          <Link className="sillage-btn rounded px-4 py-2 text-sm" href={createAnotherHref}>
            {copy.createAnother}
          </Link>
        </div>
      </section>

      <BuyerSearchDashboard
        locale={locale}
        projectId={detail.clientProjectId}
        status={detail.searchProfile.status}
        archived={archivedOrClosed}
        criteriaSummary={criteriaSummary}
        searchProfile={detail.searchProfile}
        matches={detail.matches}
        copy={{
          sectionSummary: copy.sectionSummary,
          sectionZone: copy.sectionZone,
          sectionZoneHint: copy.sectionZoneHint,
          zoneNotSet: copy.zoneNotSet,
          sectionMatches: copy.sectionMatches,
          sectionActions: copy.sectionActions,
          pause: copy.pause,
          resume: copy.resume,
          archive: copy.archive,
          edit: copy.edit,
          save: copy.save,
          cancel: copy.cancel,
          noMatches: copy.noMatches,
          newBadge: copy.newBadge,
          scoreLabel: copy.scoreLabel,
          openListing: copy.openListing,
          confirmArchive: copy.confirmArchive,
          labels: copy.labels,
        }}
      />
    </section>
  );
}
