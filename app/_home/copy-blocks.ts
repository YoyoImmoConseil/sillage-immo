import type { AppLocale } from "@/lib/i18n/config";

/**
 * Textes des blocs de l'accueil resserré (sept. 2026) : biens en vente sous le
 * hero, chiffres nominatifs, approche fusionnée (approche + méthode + comparatif)
 * et « vos outils » (espace client + assistant). Séparé de `copy.ts` pour ne pas
 * toucher aux quatre blocs de langue historiques.
 */
export type HomeBlocksCopy = {
  latest: { eyebrow: string; title: string; subtitle: string; cta: string };
  proof: {
    items: { figure: string; label: string }[];
    attribution: string;
  };
  approach: {
    eyebrow: string;
    title: string;
    intro: string;
    pillars: { title: string; body: string }[];
    ctaPrimary: string;
    ctaSecondary: string;
  };
  tools: {
    eyebrow: string;
    title: string;
    subtitle: string;
    assistantLead: string;
  };
};

export const HOME_BLOCKS_COPY: Record<AppLocale, HomeBlocksCopy> = {
  fr: {
    latest: {
      eyebrow: "À vendre en ce moment",
      title: "Les derniers biens confiés à Sillage",
      subtitle:
        "Douze mandats au maximum en même temps : chaque bien est préparé, photographié et suivi par un conseiller nommé.",
      cta: "Voir tous les biens à vendre",
    },
    proof: {
      items: [
        { figure: "30 ans", label: "de métier, juriste de formation" },
        { figure: "350+", label: "vendeurs accompagnés à Nice" },
        { figure: "12 max", label: "mandats en simultané, pour rester disponible" },
        { figure: "4 langues", label: "français, anglais, espagnol, russe" },
      ],
      attribution:
        "Yoann Uzzan, fondateur, et une équipe qui vous répond en direct : un interlocuteur, un numéro, un espace client.",
    },
    approach: {
      eyebrow: "Notre approche",
      title: "Une agence boutique, une plateforme intelligente",
      intro:
        "Nous ne prenons pas tous les mandats. Ceux que nous prenons, nous les vendons avec un prix argumenté, une préparation soignée et des engagements écrits.",
      pillars: [
        {
          title: "Un prix défendable",
          body: "Une estimation appuyée sur les ventes réelles du quartier et sur les comparables, pas sur une intuition. Vous repartez avec le raisonnement, pas seulement le chiffre.",
        },
        {
          title: "Un mandat sans engagement de durée",
          body: "Quinze jours de préavis, à tout moment. Honoraires publics. Douze mandats au maximum en même temps : nous restons joignables.",
        },
        {
          title: "Un interlocuteur, un espace",
          body: "Le même conseiller du premier échange à la signature, et chaque étape consignée dans votre espace client : visites, offres, documents, délais.",
        },
      ],
      ctaPrimary: "Estimer mon bien",
      ctaSecondary: "Notre méthode en six étapes",
    },
    tools: {
      eyebrow: "Vos outils Sillage",
      title: "Votre espace Sillage : un seul lien, zéro mot de passe",
      subtitle:
        "Vendeur ou acquéreur, vous accédez à votre projet par magic link sécurisé. Pas de mot de passe à retenir, pas d'échanges dispersés, pas d'information perdue.",
      assistantLead:
        "Vous ne savez pas par où commencer ? Décrivez votre projet, l'assistant Sillage vous oriente en quelques secondes, et un conseiller reste à un appel.",
    },
  },
  en: {
    latest: {
      eyebrow: "For sale right now",
      title: "The latest properties entrusted to Sillage",
      subtitle:
        "Twelve mandates at most at any one time: every property is prepared, photographed and followed by a named advisor.",
      cta: "See all properties for sale",
    },
    proof: {
      items: [
        { figure: "30 years", label: "in the business, trained as a lawyer" },
        { figure: "350+", label: "sellers supported in Nice" },
        { figure: "12 max", label: "mandates at a time, so we stay available" },
        { figure: "4 languages", label: "French, English, Spanish, Russian" },
      ],
      attribution:
        "Yoann Uzzan, founder, and a team that answers you directly: one contact, one number, one client space.",
    },
    approach: {
      eyebrow: "Our approach",
      title: "A boutique agency, an intelligent platform",
      intro:
        "We don't take every mandate. The ones we take, we sell with a reasoned price, careful preparation and written commitments.",
      pillars: [
        {
          title: "A defensible price",
          body: "A valuation built on real sales in the neighbourhood and on comparables, not on instinct. You leave with the reasoning, not just the figure.",
        },
        {
          title: "A mandate with no lock-in",
          body: "Fifteen days' notice, at any time. Public fees. Twelve mandates at most at once: we stay reachable.",
        },
        {
          title: "One contact, one space",
          body: "The same advisor from first call to signing, and every step recorded in your client space: viewings, offers, documents, deadlines.",
        },
      ],
      ctaPrimary: "Value my property",
      ctaSecondary: "Our six-step method",
    },
    tools: {
      eyebrow: "Your Sillage tools",
      title: "Your Sillage space: one link, no password",
      subtitle:
        "Seller or buyer, you reach your project through a secure magic link. No password to remember, no scattered exchanges, no lost information.",
      assistantLead:
        "Not sure where to start? Describe your project and the Sillage assistant points you in the right direction in seconds, with an advisor one call away.",
    },
  },
  es: {
    latest: {
      eyebrow: "En venta ahora mismo",
      title: "Las últimas propiedades confiadas a Sillage",
      subtitle:
        "Doce mandatos como máximo a la vez: cada propiedad se prepara, se fotografía y la sigue un asesor con nombre.",
      cta: "Ver todas las propiedades en venta",
    },
    proof: {
      items: [
        { figure: "30 años", label: "de oficio, jurista de formación" },
        { figure: "350+", label: "vendedores acompañados en Niza" },
        { figure: "12 máx.", label: "mandatos a la vez, para seguir disponibles" },
        { figure: "4 idiomas", label: "francés, inglés, español, ruso" },
      ],
      attribution:
        "Yoann Uzzan, fundador, y un equipo que le responde directamente: un interlocutor, un número, un espacio cliente.",
    },
    approach: {
      eyebrow: "Nuestro enfoque",
      title: "Una agencia boutique, una plataforma inteligente",
      intro:
        "No aceptamos todos los mandatos. Los que aceptamos, los vendemos con un precio argumentado, una preparación cuidada y compromisos por escrito.",
      pillars: [
        {
          title: "Un precio defendible",
          body: "Una valoración basada en las ventas reales del barrio y en comparables, no en la intuición. Se lleva el razonamiento, no solo la cifra.",
        },
        {
          title: "Un mandato sin permanencia",
          body: "Quince días de preaviso, en cualquier momento. Honorarios públicos. Doce mandatos como máximo a la vez: seguimos localizables.",
        },
        {
          title: "Un interlocutor, un espacio",
          body: "El mismo asesor desde el primer contacto hasta la firma, y cada etapa registrada en su espacio cliente: visitas, ofertas, documentos, plazos.",
        },
      ],
      ctaPrimary: "Valorar mi propiedad",
      ctaSecondary: "Nuestro método en seis etapas",
    },
    tools: {
      eyebrow: "Sus herramientas Sillage",
      title: "Su espacio Sillage: un solo enlace, sin contraseña",
      subtitle:
        "Vendedor o comprador, accede a su proyecto mediante un magic link seguro. Sin contraseña que recordar, sin intercambios dispersos, sin información perdida.",
      assistantLead:
        "¿No sabe por dónde empezar? Describa su proyecto y el asistente Sillage le orienta en segundos, con un asesor a una llamada.",
    },
  },
  ru: {
    latest: {
      eyebrow: "В продаже сейчас",
      title: "Последние объекты, доверенные Sillage",
      subtitle:
        "Не более двенадцати договоров одновременно: каждый объект подготовлен, отснят и сопровождается именным консультантом.",
      cta: "Все объекты в продаже",
    },
    proof: {
      items: [
        { figure: "30 лет", label: "в профессии, юрист по образованию" },
        { figure: "350+", label: "продавцов сопровождено в Ницце" },
        { figure: "12 макс.", label: "договоров одновременно, чтобы оставаться на связи" },
        { figure: "4 языка", label: "французский, английский, испанский, русский" },
      ],
      attribution:
        "Йоанн Уззан, основатель, и команда, которая отвечает вам напрямую: один контакт, один номер, один личный кабинет.",
    },
    approach: {
      eyebrow: "Наш подход",
      title: "Бутик-агентство, умная платформа",
      intro:
        "Мы берём не все договоры. Те, что берём, продаём с обоснованной ценой, тщательной подготовкой и письменными обязательствами.",
      pillars: [
        {
          title: "Обоснованная цена",
          body: "Оценка на основе реальных продаж района и сопоставимых объектов, а не интуиции. Вы получаете рассуждение, а не только цифру.",
        },
        {
          title: "Договор без привязки по сроку",
          body: "Уведомление за пятнадцать дней, в любой момент. Открытые комиссии. Не более двенадцати договоров одновременно: мы остаёмся на связи.",
        },
        {
          title: "Один контакт, один кабинет",
          body: "Один и тот же консультант от первого разговора до подписания, и каждый этап зафиксирован в личном кабинете: показы, предложения, документы, сроки.",
        },
      ],
      ctaPrimary: "Оценить мою недвижимость",
      ctaSecondary: "Наш метод в шесть этапов",
    },
    tools: {
      eyebrow: "Ваши инструменты Sillage",
      title: "Ваш кабинет Sillage: одна ссылка, без пароля",
      subtitle:
        "Продавец или покупатель, вы входите в свой проект по защищённой magic-ссылке. Без пароля, без разрозненной переписки, без потерянной информации.",
      assistantLead:
        "Не знаете, с чего начать? Опишите свой проект, и ассистент Sillage за несколько секунд подскажет направление, а консультант всегда на расстоянии звонка.",
    },
  },
};
