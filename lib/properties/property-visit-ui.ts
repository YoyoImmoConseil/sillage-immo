import type { AppLocale } from "@/lib/i18n/config";
import type { SweepBrightFeedbackOutcome } from "@/types/api/sweepbright";

export type { SweepBrightFeedbackOutcome } from "@/types/api/sweepbright";

export type PropertyVisitStatus =
  | "scheduled"
  | "updated"
  | "cancelled"
  | "completed";

export const VISIT_STATUS_BADGE_CLASS: Record<PropertyVisitStatus, string> = {
  scheduled: "bg-navy/10 text-navy",
  updated: "bg-amber-100 text-amber-900",
  cancelled: "bg-rose-100 text-rose-900",
  completed: "bg-emerald-100 text-emerald-900",
};

export const VISIT_OUTCOME_BADGE_CLASS: Record<
  SweepBrightFeedbackOutcome,
  string
> = {
  no_interest: "bg-rose-100 text-rose-900",
  wants_info: "bg-amber-100 text-amber-900",
  wants_to_visit: "bg-sky-100 text-sky-900",
  offer: "bg-indigo-100 text-indigo-900",
  deal: "bg-emerald-100 text-emerald-900",
};

export const VISIT_STATUS_LABELS: Record<
  AppLocale,
  Record<PropertyVisitStatus, string>
> = {
  fr: {
    scheduled: "Planifiée",
    updated: "Modifiée",
    cancelled: "Annulée",
    completed: "Effectuée",
  },
  en: {
    scheduled: "Scheduled",
    updated: "Updated",
    cancelled: "Cancelled",
    completed: "Completed",
  },
  es: {
    scheduled: "Programada",
    updated: "Modificada",
    cancelled: "Cancelada",
    completed: "Realizada",
  },
  ru: {
    scheduled: "Запланирован",
    updated: "Изменен",
    cancelled: "Отменен",
    completed: "Состоялся",
  },
};

export const VISIT_OUTCOME_LABELS: Record<
  AppLocale,
  Record<SweepBrightFeedbackOutcome, string>
> = {
  fr: {
    no_interest: "Pas d'intérêt",
    wants_info: "Demande d'informations",
    wants_to_visit: "Souhaite revisiter",
    offer: "A fait une offre",
    deal: "Affaire conclue",
  },
  en: {
    no_interest: "Not interested",
    wants_info: "Wants more information",
    wants_to_visit: "Wants to revisit",
    offer: "Made an offer",
    deal: "Deal closed",
  },
  es: {
    no_interest: "Sin interés",
    wants_info: "Quiere más información",
    wants_to_visit: "Quiere visitar otra vez",
    offer: "Hizo una oferta",
    deal: "Cerrado",
  },
  ru: {
    no_interest: "Без интереса",
    wants_info: "Хочет больше информации",
    wants_to_visit: "Хочет ещё раз посмотреть",
    offer: "Сделал предложение",
    deal: "Сделка",
  },
};

export const getVisitStatusLabel = (
  locale: AppLocale,
  status: PropertyVisitStatus
): string =>
  VISIT_STATUS_LABELS[locale]?.[status] ?? VISIT_STATUS_LABELS.fr[status];

export const getVisitOutcomeLabel = (
  locale: AppLocale,
  outcome: SweepBrightFeedbackOutcome
): string =>
  VISIT_OUTCOME_LABELS[locale]?.[outcome] ?? VISIT_OUTCOME_LABELS.fr[outcome];
