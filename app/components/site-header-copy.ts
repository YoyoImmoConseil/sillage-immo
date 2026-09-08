import type { AppLocale } from "@/lib/i18n/config";

type SiteHeaderCopy = {
  home: string;
  sale: string;
  rental: string;
  valuation: string;
  buy: string;
  sell: string;
  rent: string;
  agency: string;
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
    sell: "Vendre",
    rent: "Louer",
    agency: "L'agence",
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
    sell: "Sell",
    rent: "Rent",
    agency: "The agency",
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
    sell: "Vender",
    rent: "Alquilar",
    agency: "La agencia",
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
    sell: "Продать",
    rent: "Аренда",
    agency: "Агентство",
    clientSpace: "Моё пространство Sillage",
    openMenu: "Открыть меню",
    closeMenu: "Закрыть меню",
  },
};
