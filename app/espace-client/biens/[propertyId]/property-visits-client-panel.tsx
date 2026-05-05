import type { AppLocale } from "@/lib/i18n/config";
import type { PropertyVisitClientView } from "@/services/properties/property-visit.service";

type PropertyVisitsClientPanelProps = {
  upcoming: PropertyVisitClientView[];
  past: PropertyVisitClientView[];
  locale: AppLocale;
};

const COPY: Record<
  AppLocale,
  {
    title: string;
    upcomingHeader: string;
    pastHeader: string;
    empty: string;
    pastEmpty: string;
    columnDate: string;
    columnTime: string;
    columnDuration: string;
    columnAdvisor: string;
    columnVisitor: string;
    columnStatus: string;
    statusScheduled: string;
    statusUpdated: string;
    statusCancelled: string;
    statusCompleted: string;
    durationMinutes: (minutes: number) => string;
    visitorAriaLabel: string;
    privacyNote: string;
  }
> = {
  fr: {
    title: "Visites",
    upcomingHeader: "À venir",
    pastHeader: "Passées",
    empty: "Aucune visite programmée pour le moment.",
    pastEmpty: "Aucune visite passée.",
    columnDate: "Date",
    columnTime: "Horaire",
    columnDuration: "Durée",
    columnAdvisor: "Conseiller",
    columnVisitor: "Visiteur",
    columnStatus: "Statut",
    statusScheduled: "Planifiée",
    statusUpdated: "Modifiée",
    statusCancelled: "Annulée",
    statusCompleted: "Effectuée",
    durationMinutes: (minutes) => `${minutes} min`,
    visitorAriaLabel: "Initiales du visiteur",
    privacyNote:
      "Pour la confidentialité de l'acquéreur, seules ses initiales sont affichées.",
  },
  en: {
    title: "Viewings",
    upcomingHeader: "Upcoming",
    pastHeader: "Past",
    empty: "No viewings scheduled yet.",
    pastEmpty: "No past viewings.",
    columnDate: "Date",
    columnTime: "Time",
    columnDuration: "Duration",
    columnAdvisor: "Advisor",
    columnVisitor: "Visitor",
    columnStatus: "Status",
    statusScheduled: "Scheduled",
    statusUpdated: "Updated",
    statusCancelled: "Cancelled",
    statusCompleted: "Completed",
    durationMinutes: (minutes) => `${minutes} min`,
    visitorAriaLabel: "Visitor initials",
    privacyNote:
      "For the buyer's privacy, only their initials are displayed.",
  },
  es: {
    title: "Visitas",
    upcomingHeader: "Próximas",
    pastHeader: "Pasadas",
    empty: "No hay visitas programadas por el momento.",
    pastEmpty: "No hay visitas pasadas.",
    columnDate: "Fecha",
    columnTime: "Horario",
    columnDuration: "Duración",
    columnAdvisor: "Asesor",
    columnVisitor: "Visitante",
    columnStatus: "Estado",
    statusScheduled: "Programada",
    statusUpdated: "Modificada",
    statusCancelled: "Cancelada",
    statusCompleted: "Realizada",
    durationMinutes: (minutes) => `${minutes} min`,
    visitorAriaLabel: "Iniciales del visitante",
    privacyNote:
      "Por privacidad del comprador, solo se muestran sus iniciales.",
  },
  ru: {
    title: "Просмотры",
    upcomingHeader: "Предстоящие",
    pastHeader: "Прошедшие",
    empty: "Просмотры пока не запланированы.",
    pastEmpty: "Прошедших просмотров нет.",
    columnDate: "Дата",
    columnTime: "Время",
    columnDuration: "Длительность",
    columnAdvisor: "Консультант",
    columnVisitor: "Посетитель",
    columnStatus: "Статус",
    statusScheduled: "Запланирован",
    statusUpdated: "Изменен",
    statusCancelled: "Отменен",
    statusCompleted: "Состоялся",
    durationMinutes: (minutes) => `${minutes} мин`,
    visitorAriaLabel: "Инициалы посетителя",
    privacyNote:
      "Для защиты конфиденциальности покупателя отображаются только его инициалы.",
  },
};

const INTL_LOCALE: Record<AppLocale, string> = {
  fr: "fr-FR",
  en: "en-US",
  es: "es-ES",
  ru: "ru-RU",
};

const formatDate = (iso: string | null, locale: AppLocale): string => {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Europe/Paris",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

const formatTimeRange = (
  startIso: string | null,
  endIso: string | null,
  locale: AppLocale
): string => {
  if (!startIso) return "—";
  try {
    const formatter = new Intl.DateTimeFormat(INTL_LOCALE[locale], {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Paris",
    });
    const start = formatter.format(new Date(startIso));
    if (!endIso) return start;
    const end = formatter.format(new Date(endIso));
    return `${start} – ${end}`;
  } catch {
    return startIso;
  }
};

const STATUS_KEY_MAP: Record<
  PropertyVisitClientView["status"],
  | "statusScheduled"
  | "statusUpdated"
  | "statusCancelled"
  | "statusCompleted"
> = {
  scheduled: "statusScheduled",
  updated: "statusUpdated",
  cancelled: "statusCancelled",
  completed: "statusCompleted",
};

const STATUS_BADGE_CLASS: Record<PropertyVisitClientView["status"], string> = {
  scheduled: "bg-[#141446]/10 text-[#141446]",
  updated: "bg-amber-100 text-amber-900",
  cancelled: "bg-rose-100 text-rose-900",
  completed: "bg-emerald-100 text-emerald-900",
};

const VisitRow = ({
  visit,
  copy,
  locale,
}: {
  visit: PropertyVisitClientView;
  copy: (typeof COPY)[AppLocale];
  locale: AppLocale;
}) => {
  const statusLabel = copy[STATUS_KEY_MAP[visit.status]];
  return (
    <tr className="border-t border-[rgba(20,20,70,0.08)]">
      <td className="py-3 pr-3 text-sm text-[#141446]">
        {formatDate(visit.scheduledAt, locale)}
      </td>
      <td className="py-3 pr-3 text-sm text-[#141446]">
        {formatTimeRange(visit.scheduledAt, visit.endedAt, locale)}
      </td>
      <td className="py-3 pr-3 text-sm text-[#141446]/80">
        {typeof visit.durationMinutes === "number"
          ? copy.durationMinutes(visit.durationMinutes)
          : "—"}
      </td>
      <td className="py-3 pr-3 text-sm text-[#141446]">
        {visit.negotiatorName ?? "—"}
      </td>
      <td className="py-3 pr-3 text-sm">
        <span
          aria-label={copy.visitorAriaLabel}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#141446]/10 text-xs font-semibold text-[#141446]"
        >
          {visit.contactInitials}
        </span>
      </td>
      <td className="py-3 text-sm">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[visit.status]}`}
        >
          {statusLabel}
        </span>
      </td>
    </tr>
  );
};

const VisitTable = ({
  visits,
  copy,
  locale,
}: {
  visits: PropertyVisitClientView[];
  copy: (typeof COPY)[AppLocale];
  locale: AppLocale;
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <caption className="sr-only">{copy.title}</caption>
        <thead>
          <tr className="text-xs uppercase tracking-wide text-[#141446]/60">
            <th scope="col" className="py-2 pr-3 font-medium">
              {copy.columnDate}
            </th>
            <th scope="col" className="py-2 pr-3 font-medium">
              {copy.columnTime}
            </th>
            <th scope="col" className="py-2 pr-3 font-medium">
              {copy.columnDuration}
            </th>
            <th scope="col" className="py-2 pr-3 font-medium">
              {copy.columnAdvisor}
            </th>
            <th scope="col" className="py-2 pr-3 font-medium">
              {copy.columnVisitor}
            </th>
            <th scope="col" className="py-2 font-medium">
              {copy.columnStatus}
            </th>
          </tr>
        </thead>
        <tbody>
          {visits.map((visit) => (
            <VisitRow
              key={visit.id}
              visit={visit}
              copy={copy}
              locale={locale}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const PropertyVisitsClientPanel = ({
  upcoming,
  past,
  locale,
}: PropertyVisitsClientPanelProps) => {
  const copy = COPY[locale];
  const totalCount = upcoming.length + past.length;

  return (
    <section
      aria-label={copy.title}
      className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="text-xl font-semibold text-[#141446]">{copy.title}</h3>
      </div>

      {totalCount === 0 ? (
        <p className="mt-4 text-sm text-[#141446]/70">{copy.empty}</p>
      ) : (
        <div className="mt-4 space-y-6">
          <div>
            <h4 className="mb-2 text-xs uppercase tracking-wide text-[#141446]/60">
              {copy.upcomingHeader}
              <span className="ml-2 text-[#141446]/40">
                ({upcoming.length})
              </span>
            </h4>
            {upcoming.length === 0 ? (
              <p className="text-sm text-[#141446]/70">{copy.empty}</p>
            ) : (
              <VisitTable visits={upcoming} copy={copy} locale={locale} />
            )}
          </div>

          <div>
            <h4 className="mb-2 text-xs uppercase tracking-wide text-[#141446]/60">
              {copy.pastHeader}
              <span className="ml-2 text-[#141446]/40">({past.length})</span>
            </h4>
            {past.length === 0 ? (
              <p className="text-sm text-[#141446]/70">{copy.pastEmpty}</p>
            ) : (
              <VisitTable visits={past} copy={copy} locale={locale} />
            )}
          </div>

          <p className="text-xs text-[#141446]/50">{copy.privacyNote}</p>
        </div>
      )}
    </section>
  );
};
