import type { AppLocale } from "@/lib/i18n/config";
import type { QuartierPlaceKind } from "./data";

/** Libellés d'interface des pages quartiers (le contenu éditorial est en français). */
export type QuartiersUiCopy = {
  indexEyebrow: string;
  indexTitle: string;
  indexIntro: string;
  medianLabel: string;
  seeQuartier: string;
  breadcrumbHome: string;
  breadcrumbIndex: string;
  marketEyebrow: string;
  marketTitle: (name: string) => string;
  apartmentsMedian: string;
  apartmentsRange: string;
  apartmentsTop: string;
  apartmentsTopHint: string;
  housesMedian: string;
  housesSurface: string;
  housesFew: string;
  salesCount: (n: number, year: string) => string;
  niceMedian: string;
  seafrontTitle: string;
  seafrontAll: string;
  seafrontCentre: string;
  sourceLabel: string;
  methodLabel: string;
  estimateCta: string;
  whoTitle: string;
  transportTitle: string;
  placesEyebrow: string;
  placesTitle: string;
  placesIntro: string;
  adviceEyebrow: string;
  listingsTitle: (name: string) => string;
  listingsEmpty: (name: string) => string;
  listingsCta: string;
  alertCta: string;
  otherQuartiers: string;
  frenchOnlyNote: string;
  kinds: Record<QuartierPlaceKind, string>;
};

export const QUARTIERS_UI: Record<AppLocale, QuartiersUiCopy> = {
  fr: {
    indexEyebrow: "Nos quartiers",
    indexTitle: "Les quartiers de Nice, vus de la rue",
    indexIntro:
      "Douze quartiers que nous vendons, louons et gérons au quotidien. Pour chacun : ce qui fait le quartier, qui y achète, les prix réels des ventes notariées, et quelques adresses que nous recommandons vraiment.",
    medianLabel: "Appartements, prix médian",
    seeQuartier: "Découvrir le quartier",
    breadcrumbHome: "Accueil",
    breadcrumbIndex: "Quartiers",
    marketEyebrow: "Le marché",
    marketTitle: (name) => `Les prix à ${name}, d'après les ventes réelles`,
    apartmentsMedian: "Appartements — prix médian",
    apartmentsRange: "Fourchette courante (Q1–Q3)",
    apartmentsTop: "Haut du marché",
    apartmentsTopHint: "Les 10 % de ventes les plus chères : vue, étage, standing.",
    housesMedian: "Maisons — prix médian",
    housesSurface: "surface médiane",
    housesFew: "Trop peu de ventes de maisons pour une médiane fiable.",
    salesCount: (n, year) => `${n} ventes en ${year}`,
    niceMedian: "Nice, toute la ville",
    seafrontTitle: "Sur la Promenade elle-même",
    seafrontAll: "Adresses sur la Promenade",
    seafrontCentre: "Tronçon centre (n° 1 à 60)",
    sourceLabel: "Source",
    methodLabel: "Méthode",
    estimateCta: "Estimer mon bien dans ce quartier",
    whoTitle: "Qui achète ici",
    transportTitle: "Se déplacer",
    placesEyebrow: "Nos adresses",
    placesTitle: "Ce que nous recommandons vraiment",
    placesIntro:
      "Ni les plus chers, ni les moins chers : des lieux typiques, tenus, où l'on retourne. Nous les fréquentons ; nous ne sommes rémunérés par aucun d'eux.",
    adviceEyebrow: "Le regard de Sillage",
    listingsTitle: (name) => `Nos biens à ${name}`,
    listingsEmpty: (name) => `Aucun bien Sillage n'est en ligne à ${name} en ce moment. Créez une alerte et vous serez prévenu dès la prochaine publication.`,
    listingsCta: "Voir tout le catalogue",
    alertCta: "Créer une alerte sur ce quartier",
    otherQuartiers: "Les autres quartiers",
    frenchOnlyNote: "",
    kinds: {
      bouche: "Commerce de bouche",
      restaurant: "Restaurant",
      cafe: "Café, bar",
      ecole: "École",
      parc: "Parc, plage",
      marche: "Marché",
      culture: "Culture",
      sport: "Sport",
    },
  },
  en: {
    indexEyebrow: "Our neighbourhoods",
    indexTitle: "Nice's neighbourhoods, seen from the street",
    indexIntro:
      "Twelve districts we sell, let and manage every day. For each: what makes it, who buys there, real prices from notarised sales, and a few addresses we truly recommend.",
    medianLabel: "Apartments, median price",
    seeQuartier: "Discover the district",
    breadcrumbHome: "Home",
    breadcrumbIndex: "Neighbourhoods",
    marketEyebrow: "The market",
    marketTitle: (name) => `Prices in ${name}, from actual sales`,
    apartmentsMedian: "Apartments — median price",
    apartmentsRange: "Usual range (Q1–Q3)",
    apartmentsTop: "Top of the market",
    apartmentsTopHint: "The 10% most expensive sales: view, floor, standing.",
    housesMedian: "Houses — median price",
    housesSurface: "median area",
    housesFew: "Too few house sales for a reliable median.",
    salesCount: (n, year) => `${n} sales in ${year}`,
    niceMedian: "Nice, whole city",
    seafrontTitle: "On the Promenade itself",
    seafrontAll: "Addresses on the Promenade",
    seafrontCentre: "Central stretch (nos. 1 to 60)",
    sourceLabel: "Source",
    methodLabel: "Method",
    estimateCta: "Value my property in this district",
    whoTitle: "Who buys here",
    transportTitle: "Getting around",
    placesEyebrow: "Our addresses",
    placesTitle: "What we really recommend",
    placesIntro:
      "Neither the most expensive nor the cheapest: typical, well-run places we go back to. We are not paid by any of them.",
    adviceEyebrow: "Sillage's view",
    listingsTitle: (name) => `Our properties in ${name}`,
    listingsEmpty: (name) => `No Sillage property is online in ${name} right now. Create an alert and you will hear about the next one first.`,
    listingsCta: "See the full catalogue",
    alertCta: "Create an alert for this district",
    otherQuartiers: "Other neighbourhoods",
    frenchOnlyNote: "The detailed guide below is in French; the summary and the figures are for everyone.",
    kinds: {
      bouche: "Food shop",
      restaurant: "Restaurant",
      cafe: "Café, bar",
      ecole: "School",
      parc: "Park, beach",
      marche: "Market",
      culture: "Culture",
      sport: "Sport",
    },
  },
  es: {
    indexEyebrow: "Nuestros barrios",
    indexTitle: "Los barrios de Niza, vistos desde la calle",
    indexIntro:
      "Doce barrios que vendemos, alquilamos y gestionamos a diario. Para cada uno: lo que lo define, quién compra, los precios reales de las ventas notariales y algunas direcciones que recomendamos de verdad.",
    medianLabel: "Pisos, precio mediano",
    seeQuartier: "Descubrir el barrio",
    breadcrumbHome: "Inicio",
    breadcrumbIndex: "Barrios",
    marketEyebrow: "El mercado",
    marketTitle: (name) => `Los precios en ${name}, según las ventas reales`,
    apartmentsMedian: "Pisos — precio mediano",
    apartmentsRange: "Horquilla habitual (Q1–Q3)",
    apartmentsTop: "Parte alta del mercado",
    apartmentsTopHint: "El 10 % de ventas más caras: vistas, planta, categoría.",
    housesMedian: "Casas — precio mediano",
    housesSurface: "superficie mediana",
    housesFew: "Muy pocas ventas de casas para una mediana fiable.",
    salesCount: (n, year) => `${n} ventas en ${year}`,
    niceMedian: "Niza, toda la ciudad",
    seafrontTitle: "En el propio Paseo",
    seafrontAll: "Direcciones en el Paseo",
    seafrontCentre: "Tramo central (n.º 1 a 60)",
    sourceLabel: "Fuente",
    methodLabel: "Método",
    estimateCta: "Valorar mi propiedad en este barrio",
    whoTitle: "Quién compra aquí",
    transportTitle: "Moverse",
    placesEyebrow: "Nuestras direcciones",
    placesTitle: "Lo que recomendamos de verdad",
    placesIntro:
      "Ni los más caros ni los más baratos: lugares típicos, bien llevados, a los que volvemos. Ninguno nos paga.",
    adviceEyebrow: "La mirada de Sillage",
    listingsTitle: (name) => `Nuestras propiedades en ${name}`,
    listingsEmpty: (name) => `No hay ninguna propiedad Sillage en línea en ${name} ahora mismo. Cree una alerta y será el primero en saberlo.`,
    listingsCta: "Ver todo el catálogo",
    alertCta: "Crear una alerta para este barrio",
    otherQuartiers: "Los demás barrios",
    frenchOnlyNote: "La guía detallada está en francés; el resumen y las cifras son para todos.",
    kinds: {
      bouche: "Comercio de alimentación",
      restaurant: "Restaurante",
      cafe: "Café, bar",
      ecole: "Colegio",
      parc: "Parque, playa",
      marche: "Mercado",
      culture: "Cultura",
      sport: "Deporte",
    },
  },
  ru: {
    indexEyebrow: "Наши районы",
    indexTitle: "Районы Ниццы — взгляд с улицы",
    indexIntro:
      "Двенадцать районов, где мы продаём, сдаём и управляем каждый день. Для каждого: что его определяет, кто здесь покупает, реальные цены нотариальных сделок и несколько адресов, которые мы действительно рекомендуем.",
    medianLabel: "Квартиры, медианная цена",
    seeQuartier: "Открыть район",
    breadcrumbHome: "Главная",
    breadcrumbIndex: "Районы",
    marketEyebrow: "Рынок",
    marketTitle: (name) => `Цены в районе ${name} по реальным сделкам`,
    apartmentsMedian: "Квартиры — медианная цена",
    apartmentsRange: "Обычный диапазон (Q1–Q3)",
    apartmentsTop: "Верх рынка",
    apartmentsTopHint: "10 % самых дорогих сделок: вид, этаж, класс дома.",
    housesMedian: "Дома — медианная цена",
    housesSurface: "медианная площадь",
    housesFew: "Слишком мало продаж домов для надёжной медианы.",
    salesCount: (n, year) => `${n} сделок в ${year} г.`,
    niceMedian: "Ницца, весь город",
    seafrontTitle: "На самой набережной",
    seafrontAll: "Адреса на набережной",
    seafrontCentre: "Центральный участок (№ 1–60)",
    sourceLabel: "Источник",
    methodLabel: "Метод",
    estimateCta: "Оценить мой объект в этом районе",
    whoTitle: "Кто здесь покупает",
    transportTitle: "Транспорт",
    placesEyebrow: "Наши адреса",
    placesTitle: "Что мы действительно рекомендуем",
    placesIntro:
      "Не самые дорогие и не самые дешёвые: типичные, ухоженные места, куда возвращаются. Никто из них нам не платит.",
    adviceEyebrow: "Взгляд Sillage",
    listingsTitle: (name) => `Наши объекты в районе ${name}`,
    listingsEmpty: (name) => `Сейчас в районе ${name} нет объектов Sillage онлайн. Создайте уведомление — и узнаете о следующем первым.`,
    listingsCta: "Весь каталог",
    alertCta: "Создать уведомление по району",
    otherQuartiers: "Другие районы",
    frenchOnlyNote: "Подробный гид ниже — на французском; резюме и цифры — для всех.",
    kinds: {
      bouche: "Продукты",
      restaurant: "Ресторан",
      cafe: "Кафе, бар",
      ecole: "Школа",
      parc: "Парк, пляж",
      marche: "Рынок",
      culture: "Культура",
      sport: "Спорт",
    },
  },
};
