import type { AppLocale } from "@/lib/i18n/config";

export type SellerProjectCopy = {
  back: string;
  sellerProject: string;
  projectStatus: string;
  mandate: string;
  lastLogin: string;
  firstLogin: string;
  valuation: string;
  indicative: string;
  range: string;
  source: string;
  updated: string;
  unavailable: string;
  noValuation: string;
  linkedProperty: string;
  noProperty: string;
  openProperty: string;
  syncingAddress: string;
  unknownType: string;
  primaryProperty: string;
  history: string;
  noEvents: string;
  advisor: string;
  noAdvisor: string;
  advisorAvailability: string;
  advisorBookingPending: string;
  nextAction: string;
  book: string;
  bookWithAdvisor: string;
  contactAdvisor: string;
  contactTeam: string;
  notDefined: string;
  none: string;
};

export const sellerProjectCopy: Record<AppLocale, SellerProjectCopy> = {
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
};
