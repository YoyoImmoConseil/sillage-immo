import type { AppLocale } from "@/lib/i18n/config";

/** Titres et descriptions des pages fixes, par langue. Un seul endroit à éditer. */
export const PAGE_SEO: Record<
  "home" | "estimation" | "buyerSearch" | "clientLogin",
  Record<AppLocale, { title: string; description: string }>
> = {
  home: {
    fr: {
      title: "Agence immobilière à Nice — Estimation, vente, recherche accompagnée | Sillage Immo",
      description:
        "Sillage Immo, agence immobilière indépendante à Nice : estimation argumentée de votre bien, vente avec une vraie stratégie, recherche acquéreur sur mesure et espace client sécurisé.",
    },
    en: {
      title: "Real estate agency in Nice — Valuation, sales, guided property search | Sillage Immo",
      description:
        "Sillage Immo, independent real estate boutique in Nice: reasoned valuation of your property, sales with a real strategy, tailored buyer search and a secure client portal.",
    },
    es: {
      title: "Agencia inmobiliaria en Niza — Valoración, venta, búsqueda acompañada | Sillage Immo",
      description:
        "Sillage Immo, agencia inmobiliaria independiente en Niza: valoración argumentada de su propiedad, venta con una verdadera estrategia, búsqueda a medida y espacio cliente seguro.",
    },
    ru: {
      title: "Агентство недвижимости в Ницце — Оценка, продажа, подбор объектов | Sillage Immo",
      description:
        "Sillage Immo, независимое агентство недвижимости в Ницце: обоснованная оценка вашего объекта, продажа со стратегией, индивидуальный подбор и защищённый личный кабинет.",
    },
  },
  estimation: {
    fr: {
      title: "Estimation immobilière à Nice — Gratuite et argumentée | Sillage Immo",
      description:
        "Estimez votre appartement ou votre maison à Nice avec une lecture claire du marché : fourchette de valeur, relecture par un conseiller et stratégie de mise en vente.",
    },
    en: {
      title: "Property valuation in Nice — Free and reasoned | Sillage Immo",
      description:
        "Get a clear market reading for your apartment or house in Nice: value range, review by an advisor and a strategy to sell at the right price.",
    },
    es: {
      title: "Valoración inmobiliaria en Niza — Gratuita y argumentada | Sillage Immo",
      description:
        "Valore su piso o casa en Niza con una lectura clara del mercado: rango de valor, revisión por un asesor y estrategia de venta.",
    },
    ru: {
      title: "Оценка недвижимости в Ницце — бесплатно и обоснованно | Sillage Immo",
      description:
        "Оцените квартиру или дом в Ницце с ясным пониманием рынка: диапазон стоимости, проверка консультантом и стратегия продажи.",
    },
  },
  buyerSearch: {
    fr: {
      title: "Confier ma recherche immobilière à Nice | Sillage Immo",
      description:
        "Dessinez votre zone, indiquez vos critères et recevez les biens qui correspondent vraiment, suivis par un conseiller Sillage à Nice et sur la Côte d'Azur.",
    },
    en: {
      title: "Entrust your property search in Nice | Sillage Immo",
      description:
        "Draw your area, set your criteria and receive the properties that truly match, followed by a Sillage advisor in Nice and on the French Riviera.",
    },
    es: {
      title: "Confiar mi búsqueda inmobiliaria en Niza | Sillage Immo",
      description:
        "Dibuje su zona, indique sus criterios y reciba las propiedades que realmente coinciden, con el seguimiento de un asesor Sillage en Niza y la Costa Azul.",
    },
    ru: {
      title: "Доверить поиск недвижимости в Ницце | Sillage Immo",
      description:
        "Обозначьте зону, укажите критерии и получайте только подходящие объекты при сопровождении консультанта Sillage в Ницце и на Лазурном Берегу.",
    },
  },
  clientLogin: {
    fr: {
      title: "Mon espace Sillage — Connexion | Sillage Immo",
      description: "Accédez à votre espace client Sillage Immo par lien sécurisé, sans mot de passe.",
    },
    en: {
      title: "My Sillage portal — Sign in | Sillage Immo",
      description: "Access your Sillage Immo client portal with a secure link, no password needed.",
    },
    es: {
      title: "Mi espacio Sillage — Acceso | Sillage Immo",
      description: "Acceda a su espacio cliente Sillage Immo mediante un enlace seguro, sin contraseña.",
    },
    ru: {
      title: "Мой кабинет Sillage — вход | Sillage Immo",
      description: "Войдите в личный кабинет Sillage Immo по защищённой ссылке, без пароля.",
    },
  },
};
