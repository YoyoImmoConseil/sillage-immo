import type { AppLocale } from "@/lib/i18n/config";

type SiteHeaderCopy = {
  home: string;
  sale: string;
  rental: string;
  valuation: string;
  buy: string;
  clientSpace: string;
  openMenu: string;
  closeMenu: string;
};

export const SITE_HEADER_COPY: Record<AppLocale, SiteHeaderCopy> = {
  fr: {
    home: "Accueil",
    sale: "Vente",
    rental: "Location",
    valuation: "Estimation",
    buy: "Acheter",
    clientSpace: "Mon Espace Sillage",
    openMenu: "Ouvrir le menu",
    closeMenu: "Fermer le menu",
  },
  en: {
    home: "Home",
    sale: "Sales",
    rental: "Rentals",
    valuation: "Valuation",
    buy: "Buy",
    clientSpace: "My Sillage Space",
    openMenu: "Open menu",
    closeMenu: "Close menu",
  },
  es: {
    home: "Inicio",
    sale: "Venta",
    rental: "Alquiler",
    valuation: "Valoración",
    buy: "Comprar",
    clientSpace: "Mi Espacio Sillage",
    openMenu: "Abrir el menú",
    closeMenu: "Cerrar el menú",
  },
  ru: {
    home: "Главная",
    sale: "Продажа",
    rental: "Аренда",
    valuation: "Оценка",
    buy: "Купить",
    clientSpace: "Моё пространство Sillage",
    openMenu: "Открыть меню",
    closeMenu: "Закрыть меню",
  },
};
