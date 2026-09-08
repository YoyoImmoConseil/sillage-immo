import type { AppLocale } from "@/lib/i18n/config";

/**
 * Ventes récentes mises en avant sur l'accueil (preuve de résultat).
 *
 * Données figées volontairement : ce sont des biens VENDUS, sortis du
 * catalogue, dont on montre la vitesse de vente. Photos rapatriées dans
 * `public/ventes/` (les URLs SweepBright sont signées et expirent).
 * Pour ajouter une vente : une entrée ici + une photo 16:9 dans le dossier.
 */
export type RecentSale = {
  id: string;
  image: string;
  /** Prix de vente affiché, en euros (arrondi). */
  priceEur: number;
  /** Délai entre la mise en vente et l'offre acceptée. */
  soldInDays: number;
  surfaceM2: number;
  city: string;
  postalCode: string;
  label: Record<AppLocale, string>;
  imageAlt: Record<AppLocale, string>;
};

export const RECENT_SALES: RecentSale[] = [
  {
    id: "feefc744",
    image: "/ventes/vaugrenier.jpg",
    priceEur: 1_200_000,
    soldInDays: 10,
    surfaceM2: 157,
    city: "Villeneuve-Loubet",
    postalCode: "06270",
    label: {
      fr: "Maison avec piscine, Hauts de Vaugrenier",
      en: "Villa with pool, Hauts de Vaugrenier",
      es: "Casa con piscina, Hauts de Vaugrenier",
      ru: "Дом с бассейном, О-де-Вогренье",
    },
    imageAlt: {
      fr: "Maison avec piscine et jardin, Hauts de Vaugrenier à Villeneuve-Loubet",
      en: "House with pool and garden, Hauts de Vaugrenier in Villeneuve-Loubet",
      es: "Casa con piscina y jardín, Hauts de Vaugrenier en Villeneuve-Loubet",
      ru: "Дом с бассейном и садом, О-де-Вогренье, Вильнёв-Лубе",
    },
  },
  {
    id: "0a187bdf",
    image: "/ventes/buffa.jpg",
    priceEur: 1_050_000,
    soldInDays: 20,
    surfaceM2: 196,
    city: "Nice",
    postalCode: "06000",
    label: {
      fr: "Appartement de caractère, rue de la Buffa",
      en: "Character apartment, rue de la Buffa",
      es: "Piso con carácter, rue de la Buffa",
      ru: "Квартира с характером, рю де ла Бюффа",
    },
    imageAlt: {
      fr: "Salle à manger sous verrière d'un appartement bourgeois, rue de la Buffa à Nice",
      en: "Dining room under a glass roof in a bourgeois apartment, rue de la Buffa in Nice",
      es: "Comedor bajo una claraboya en un piso burgués, rue de la Buffa en Niza",
      ru: "Столовая под стеклянной крышей в буржуазной квартире, рю де ла Бюффа, Ницца",
    },
  },
  {
    id: "015bb821",
    image: "/ventes/port-place-du-pin.jpg",
    priceEur: 460_000,
    soldInDays: 30,
    surfaceM2: 79,
    city: "Nice",
    postalCode: "06300",
    label: {
      fr: "4 pièces avec balcons, Port / Place du Pin",
      en: "3-bedroom with balconies, Port / Place du Pin",
      es: "4 estancias con balcones, Port / Place du Pin",
      ru: "4 комнаты с балконами, Порт / Плас-дю-Пен",
    },
    imageAlt: {
      fr: "Vue depuis le balcon d'un appartement du quartier du Port à Nice",
      en: "View from the balcony of an apartment in the Port district of Nice",
      es: "Vista desde el balcón de un piso en el barrio del Puerto de Niza",
      ru: "Вид с балкона квартиры в районе Порта, Ницца",
    },
  },
];

export const RECENT_SALES_COPY: Record<
  AppLocale,
  {
    eyebrow: string;
    title: string;
    intro: string;
    soldIn: (days: number) => string;
    soldLabel: string;
    surface: (m2: number) => string;
    cta: string;
    ctaSecondary: string;
    disclaimer: string;
  }
> = {
  fr: {
    eyebrow: "Résultats",
    title: "Vendu vite, au bon prix",
    intro:
      "Quelques ventes récentes, du mandat à l'offre acceptée. Une préparation soignée, un prix juste et une diffusion ciblée : c'est ce qui fait la différence.",
    soldIn: (days) => `Vendu en ${days} jours`,
    soldLabel: "Vendu",
    surface: (m2) => `${m2} m²`,
    cta: "Estimer mon bien",
    ctaSecondary: "Voir notre méthode",
    disclaimer:
      "Délai entre la mise en vente et l'offre acceptée. Chaque bien est unique : ces exemples ne préjugent pas du délai de vente du vôtre.",
  },
  en: {
    eyebrow: "Results",
    title: "Sold fast, at the right price",
    intro:
      "A few recent sales, from mandate to accepted offer. Careful preparation, a fair price and targeted marketing make the difference.",
    soldIn: (days) => `Sold in ${days} days`,
    soldLabel: "Sold",
    surface: (m2) => `${m2} sqm`,
    cta: "Value my property",
    ctaSecondary: "See our method",
    disclaimer:
      "Time between listing and accepted offer. Every property is unique: these examples are no guarantee of how long yours will take to sell.",
  },
  es: {
    eyebrow: "Resultados",
    title: "Vendido rápido, al precio justo",
    intro:
      "Algunas ventas recientes, del mandato a la oferta aceptada. Una preparación cuidada, un precio justo y una difusión dirigida marcan la diferencia.",
    soldIn: (days) => `Vendido en ${days} días`,
    soldLabel: "Vendido",
    surface: (m2) => `${m2} m²`,
    cta: "Valorar mi propiedad",
    ctaSecondary: "Ver nuestro método",
    disclaimer:
      "Plazo entre la puesta en venta y la oferta aceptada. Cada propiedad es única: estos ejemplos no garantizan el plazo de venta de la suya.",
  },
  ru: {
    eyebrow: "Результаты",
    title: "Продано быстро и по правильной цене",
    intro:
      "Несколько недавних продаж — от договора до принятого предложения. Тщательная подготовка, справедливая цена и адресное продвижение делают разницу.",
    soldIn: (days) => `Продано за ${days} дн.`,
    soldLabel: "Продано",
    surface: (m2) => `${m2} м²`,
    cta: "Оценить мою недвижимость",
    ctaSecondary: "Наш метод",
    disclaimer:
      "Срок между выставлением на продажу и принятым предложением. Каждый объект уникален: эти примеры не гарантируют срок продажи вашего.",
  },
};

export function formatSalePrice(priceEur: number, locale: AppLocale) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(priceEur);
}
