import type { AdminRole, AdminTeamTitle } from "@/types/domain/admin";
import type { AppLocale } from "./config";

const PROPERTY_TYPE_LABELS: Record<string, Record<AppLocale, string>> = {
  apartment: { fr: "Appartement", en: "Apartment", es: "Apartamento", ru: "Квартира" },
  appartement: { fr: "Appartement", en: "Apartment", es: "Apartamento", ru: "Квартира" },
  house: { fr: "Maison", en: "House", es: "Casa", ru: "Дом" },
  maison: { fr: "Maison", en: "House", es: "Casa", ru: "Дом" },
  villa: { fr: "Villa", en: "Villa", es: "Villa", ru: "Вилла" },
  studio: { fr: "Studio", en: "Studio", es: "Estudio", ru: "Студия" },
  loft: { fr: "Loft", en: "Loft", es: "Loft", ru: "Лофт" },
  duplex: { fr: "Duplex", en: "Duplex", es: "Dúplex", ru: "Двухуровневая квартира" },
  triplex: { fr: "Triplex", en: "Triplex", es: "Tríplex", ru: "Трехуровневая квартира" },
  penthouse: { fr: "Penthouse", en: "Penthouse", es: "Ático", ru: "Пентхаус" },
  land: { fr: "Terrain", en: "Land", es: "Terreno", ru: "Участок" },
  terrain: { fr: "Terrain", en: "Land", es: "Terreno", ru: "Участок" },
  office: { fr: "Bureau", en: "Office", es: "Oficina", ru: "Офис" },
  bureau: { fr: "Bureau", en: "Office", es: "Oficina", ru: "Офис" },
  garage: { fr: "Garage", en: "Garage", es: "Garaje", ru: "Гараж" },
  parking: { fr: "Parking", en: "Parking", es: "Parking", ru: "Парковка" },
  building: { fr: "Immeuble", en: "Building", es: "Edificio", ru: "Здание" },
  immeuble: { fr: "Immeuble", en: "Building", es: "Edificio", ru: "Здание" },
  shop: {
    fr: "Local commercial",
    en: "Commercial space",
    es: "Local comercial",
    ru: "Коммерческое помещение",
  },
  commercial: {
    fr: "Local commercial",
    en: "Commercial space",
    es: "Local comercial",
    ru: "Коммерческое помещение",
  },
  retail: {
    fr: "Local commercial",
    en: "Commercial space",
    es: "Local comercial",
    ru: "Коммерческое помещение",
  },
  other: { fr: "Autre", en: "Other", es: "Otro", ru: "Другое" },
  autre: { fr: "Autre", en: "Other", es: "Otro", ru: "Другое" },
};

const CLIENT_PROJECT_TYPE_LABELS: Record<string, Record<AppLocale, string>> = {
  seller: {
    fr: "Projet vendeur",
    en: "Seller project",
    es: "Proyecto vendedor",
    ru: "Проект продавца",
  },
  buyer: {
    fr: "Projet acquéreur",
    en: "Buyer project",
    es: "Proyecto comprador",
    ru: "Проект покупателя",
  },
  rental: { fr: "Projet location", en: "Rental project", es: "Proyecto alquiler", ru: "Проект аренды" },
  wealth: {
    fr: "Projet patrimonial",
    en: "Wealth project",
    es: "Proyecto patrimonial",
    ru: "Инвестиционный проект",
  },
};

const SELLER_PROJECT_STATUS_LABELS: Record<string, Record<AppLocale, string>> = {
  draft: { fr: "Brouillon", en: "Draft", es: "Borrador", ru: "Черновик" },
  active: { fr: "Actif", en: "Active", es: "Activo", ru: "Активен" },
  valuation_ready: {
    fr: "Estimation disponible",
    en: "Valuation available",
    es: "Valoración disponible",
    ru: "Оценка доступна",
  },
  mandate_signed: {
    fr: "Mandat signé",
    en: "Mandate signed",
    es: "Mandato firmado",
    ru: "Мандат подписан",
  },
  listing_live: {
    fr: "Commercialisation en cours",
    en: "Listing live",
    es: "Comercialización en curso",
    ru: "Объект опубликован",
  },
  sold: { fr: "Vendu", en: "Sold", es: "Vendido", ru: "Продано" },
  archived: { fr: "Archivé", en: "Archived", es: "Archivado", ru: "В архиве" },
};

const MANDATE_STATUS_LABELS: Record<string, Record<AppLocale, string>> = {
  none: { fr: "Aucun", en: "None", es: "Ninguno", ru: "Нет" },
  pending: { fr: "En préparation", en: "Pending", es: "En preparación", ru: "Подготовка" },
  signed: { fr: "Signé", en: "Signed", es: "Firmado", ru: "Подписан" },
  expired: { fr: "Expiré", en: "Expired", es: "Caducado", ru: "Истек" },
  revoked: { fr: "Révoqué", en: "Revoked", es: "Revocado", ru: "Отозван" },
};

const GENERIC_STATUS_LABELS: Record<string, Record<AppLocale, string>> = {
  new: { fr: "Nouveau", en: "New", es: "Nuevo", ru: "Новый" },
  active: { fr: "Actif", en: "Active", es: "Activo", ru: "Активен" },
  on_hold: { fr: "En pause", en: "On hold", es: "En pausa", ru: "На паузе" },
  qualified: { fr: "Qualifié", en: "Qualified", es: "Cualificado", ru: "Квалифицирован" },
  active_search: {
    fr: "Recherche active",
    en: "Active search",
    es: "Búsqueda activa",
    ru: "Активный поиск",
  },
  visit: { fr: "Visites", en: "Visits", es: "Visitas", ru: "Показы" },
  won: { fr: "Conclu", en: "Won", es: "Cerrado", ru: "Успешно" },
  lost: { fr: "Perdu", en: "Lost", es: "Perdido", ru: "Потерян" },
  search_profile_ready: {
    fr: "Recherche prête",
    en: "Search ready",
    es: "Búsqueda lista",
    ru: "Поиск готов",
  },
  project_shell_only: {
    fr: "Projet initialisé",
    en: "Project initialized",
    es: "Proyecto inicializado",
    ru: "Проект создан",
  },
};

const ADMIN_ROLE_LABELS: Record<AdminRole, Record<AppLocale, string>> = {
  collaborateur: {
    fr: "Collaborateur",
    en: "Advisor",
    es: "Asesor",
    ru: "Консультант",
  },
  manager: { fr: "Manager", en: "Manager", es: "Manager", ru: "Менеджер" },
  administrateur: {
    fr: "Administrateur",
    en: "Administrator",
    es: "Administrador",
    ru: "Администратор",
  },
};

const ADMIN_TEAM_TITLE_LABELS: Record<AdminTeamTitle, Record<AppLocale, string>> = {
  Directeur: { fr: "Directeur", en: "Director", es: "Director", ru: "Директор" },
  Manager: { fr: "Manager", en: "Manager", es: "Manager", ru: "Менеджер" },
  "Conseiller Senior": {
    fr: "Conseiller Senior",
    en: "Senior Advisor",
    es: "Asesor sénior",
    ru: "Старший консультант",
  },
  "Conseiller Junior": {
    fr: "Conseiller Junior",
    en: "Junior Advisor",
    es: "Asesor júnior",
    ru: "Младший консультант",
  },
  Stagiaire: { fr: "Stagiaire", en: "Intern", es: "Becario", ru: "Стажёр" },
};

const EXPOSURE_LABELS: Record<string, Record<AppLocale, string>> = {
  north: { fr: "Nord", en: "North", es: "Norte", ru: "Север" },
  north_east: { fr: "Nord Est", en: "North-East", es: "Noreste", ru: "Северо-восток" },
  east: { fr: "Est", en: "East", es: "Este", ru: "Восток" },
  south_east: { fr: "Sud Est", en: "South-East", es: "Sureste", ru: "Юго-восток" },
  south: { fr: "Sud", en: "South", es: "Sur", ru: "Юг" },
  south_west: { fr: "Sud Ouest", en: "South-West", es: "Suroeste", ru: "Юго-запад" },
  west: { fr: "Ouest", en: "West", es: "Oeste", ru: "Запад" },
  north_west: { fr: "Nord Ouest", en: "North-West", es: "Noroeste", ru: "Северо-запад" },
};

const SEA_VIEW_LABELS: Record<string, Record<AppLocale, string>> = {
  none: { fr: "Non", en: "No", es: "No", ru: "Нет" },
  panoramic: {
    fr: "Vue mer panoramique",
    en: "Panoramic sea view",
    es: "Vista panorámica al mar",
    ru: "Панорамный вид на море",
  },
  classic: {
    fr: "Vue mer classique",
    en: "Sea view",
    es: "Vista al mar",
    ru: "Вид на море",
  },
  lateral: {
    fr: "Vue mer latérale",
    en: "Partial sea view",
    es: "Vista lateral al mar",
    ru: "Боковой вид на море",
  },
};

const APARTMENT_CONDITION_LABELS: Record<string, Record<AppLocale, string>> = {
  a_renover: { fr: "À rénover", en: "To renovate", es: "Para reformar", ru: "Под ремонт" },
  renove_20_ans: {
    fr: "Rénové il y a 20 ans",
    en: "Renovated 20 years ago",
    es: "Reformado hace 20 años",
    ru: "Отремонтировано 20 лет назад",
  },
  renove_10_ans: {
    fr: "Rénové il y a 10 ans",
    en: "Renovated 10 years ago",
    es: "Reformado hace 10 años",
    ru: "Отремонтировано 10 лет назад",
  },
  renove_moins_5_ans: {
    fr: "Rénové il y a moins de 5 ans",
    en: "Renovated less than 5 years ago",
    es: "Reformado hace menos de 5 años",
    ru: "Отремонтировано менее 5 лет назад",
  },
  neuf: { fr: "Neuf", en: "New", es: "Nuevo", ru: "Новый" },
};

const BUILDING_AGE_LABELS: Record<string, Record<AppLocale, string>> = {
  ancien_1950: {
    fr: "Ancien (jusqu'à 1950)",
    en: "Historic (up to 1950)",
    es: "Antiguo (hasta 1950)",
    ru: "Старинное (до 1950 года)",
  },
  recent_1950_1970: {
    fr: "Récent (1950-1970)",
    en: "Recent (1950-1970)",
    es: "Reciente (1950-1970)",
    ru: "Современное (1950-1970)",
  },
  moderne_1980_today: {
    fr: "Moderne (1980 - Aujourd'hui)",
    en: "Modern (1980 - today)",
    es: "Moderno (1980 - hoy)",
    ru: "Современное (1980 - по настоящее время)",
  },
};

const toTitleCase = (value: string) =>
  value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const normalizeValue = (value: string) => value.trim().toLowerCase().replace(/[_-]+/g, " ");

const translateFromMap = (
  value: string | null | undefined,
  locale: AppLocale,
  map: Record<string, Record<AppLocale, string>>
) => {
  if (typeof value !== "string") return null;
  const normalized = normalizeValue(value);
  if (!normalized) return null;
  return map[normalized]?.[locale] ?? map[normalized]?.fr ?? toTitleCase(normalized);
};

export const formatPropertyTypeLabel = (value: string | null | undefined, locale: AppLocale) => {
  return translateFromMap(value, locale, PROPERTY_TYPE_LABELS);
};

export const getClientProjectTypeLabel = (value: string | null | undefined, locale: AppLocale) => {
  return translateFromMap(value, locale, CLIENT_PROJECT_TYPE_LABELS) ?? translateGenericStatus(value, locale);
};

export const getSellerProjectStatusLabel = (value: string | null | undefined, locale: AppLocale) => {
  return translateFromMap(value, locale, SELLER_PROJECT_STATUS_LABELS);
};

export const getMandateStatusLabel = (value: string | null | undefined, locale: AppLocale) => {
  return translateFromMap(value, locale, MANDATE_STATUS_LABELS);
};

export const translateGenericStatus = (value: string | null | undefined, locale: AppLocale) => {
  return translateFromMap(value, locale, GENERIC_STATUS_LABELS);
};

export const getAdminRoleLabel = (role: AdminRole, locale: AppLocale) => ADMIN_ROLE_LABELS[role][locale];

export const getAdminTeamTitleLabel = (value: AdminTeamTitle | null, locale: AppLocale) =>
  value ? ADMIN_TEAM_TITLE_LABELS[value][locale] : null;

export const getExposureLabel = (value: string | null | undefined, locale: AppLocale) =>
  translateFromMap(value, locale, EXPOSURE_LABELS);

export const getSeaViewLabel = (value: string | null | undefined, locale: AppLocale) =>
  translateFromMap(value, locale, SEA_VIEW_LABELS);

export const getApartmentConditionLabel = (value: string | null | undefined, locale: AppLocale) =>
  translateFromMap(value, locale, APARTMENT_CONDITION_LABELS);

export const getBuildingAgeLabel = (value: string | null | undefined, locale: AppLocale) =>
  translateFromMap(value, locale, BUILDING_AGE_LABELS);
