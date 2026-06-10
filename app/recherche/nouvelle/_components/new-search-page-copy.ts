import type { AppLocale } from "@/lib/i18n/config";

export type NewSearchPageCopy = {
  kicker: string;
  title: string;
  intro: string;
  microProofs: string[];
  whyTitle: string;
  whyCards: { title: string; body: string }[];
  afterTitle: string;
  afterSteps: { title: string; body: string }[];
  differentiation: string;
  existingAccountTitle: string;
  existingAccountBody: string;
  existingAccountCta: string;
  newAccountTitle: string;
  newAccountBody: string;
};

export const newSearchPageCopy: Record<AppLocale, NewSearchPageCopy> = {
  fr: {
    kicker: "Recherche acquéreur accompagnée",
    title: "Confiez-nous votre recherche immobilière à Nice et sur la Côte d'Azur",
    intro:
      "Dessinez votre zone, indiquez vos critères et recevez les biens qui correspondent vraiment à votre projet. Votre recherche peut aussi être suivie par un conseiller Sillage, qui l'active dans nos outils métier et notre réseau professionnel Côte d'Azur.",
    microProofs: [
      "Zone dessinée sur carte",
      "Alertes automatiques",
      "Conseiller Sillage",
      "Réseau professionnel Côte d'Azur",
    ],
    whyTitle: "Pourquoi créer une recherche Sillage ?",
    whyCards: [
      {
        title: "Une zone précise, pas une ville entière",
        body: "Tracez les rues, quartiers ou secteurs qui comptent vraiment pour vous.",
      },
      {
        title: "Des alertes plus pertinentes",
        body: "Recevez moins de biens hors sujet et plus d'opportunités réellement compatibles.",
      },
      {
        title: "Un conseiller peut prendre le relais",
        body: "Votre recherche peut être analysée, affinée et activée dans nos outils métier par un conseiller Sillage.",
      },
    ],
    afterTitle: "Ce qui se passe après votre recherche",
    afterSteps: [
      {
        title: "Votre recherche est enregistrée",
        body: "Vos critères, votre budget et votre zone sont centralisés dans votre espace Sillage pour être suivis et ajustés facilement.",
      },
      {
        title: "Notre système surveille les biens",
        body: "Vous recevez une alerte lorsqu'un bien correspond à vos critères, avec un matching plus précis qu'une simple recherche par ville.",
      },
      {
        title: "Un conseiller Sillage peut l'analyser",
        body: "Votre projet peut être relu par un conseiller pour affiner les critères, comprendre vos priorités et éviter les opportunités hors sujet.",
      },
      {
        title: "Nous activons notre réseau professionnel",
        body: "Lorsque votre projet le justifie, nous pouvons rechercher des opportunités au-delà de notre propre catalogue, via nos bases métier et notre réseau d'agences partenaires sur la Côte d'Azur.",
      },
    ],
    differentiation:
      "Votre recherche ne reste pas une simple alerte : elle peut devenir un vrai brief acquéreur, suivi par un conseiller et activé dans notre réseau professionnel Côte d'Azur.",
    existingAccountTitle: "Déjà un Espace Sillage (vendeur ou acheteur) ?",
    existingAccountBody:
      "Connectez-vous pour associer cette nouvelle recherche à votre espace existant.",
    existingAccountCta: "Me connecter",
    newAccountTitle: "Je n'ai pas encore de compte",
    newAccountBody:
      "Remplissez le formulaire ci-dessous. Nous créons votre espace Sillage et vous envoyons un lien magique par email pour l'activer, sans mot de passe.",
  },
  en: {
    kicker: "Supported buyer search",
    title: "Entrust us with your property search in Nice and on the French Riviera",
    intro:
      "Draw your zone, set your criteria and receive properties that truly match your project. Your search can also be followed by a Sillage advisor, who activates it in our professional tools and our French Riviera partner network.",
    microProofs: [
      "Zone drawn on the map",
      "Automatic alerts",
      "Sillage advisor",
      "French Riviera partner network",
    ],
    whyTitle: "Why create a Sillage search?",
    whyCards: [
      {
        title: "A precise zone, not a whole city",
        body: "Draw the streets, neighborhoods or sectors that really matter to you.",
      },
      {
        title: "Alerts that actually fit",
        body: "Fewer irrelevant listings and more opportunities that truly match your project.",
      },
      {
        title: "An advisor can take over",
        body: "Your search can be reviewed, refined and activated in our professional tools by a Sillage advisor.",
      },
    ],
    afterTitle: "What happens after your search",
    afterSteps: [
      {
        title: "Your search is saved",
        body: "Your criteria, budget and zone are centralized in your Sillage space, easy to follow and adjust.",
      },
      {
        title: "Our system monitors listings",
        body: "You receive an alert when a property matches your criteria, with sharper matching than a simple city search.",
      },
      {
        title: "A Sillage advisor can review it",
        body: "Your project can be read by an advisor to refine the criteria, understand your priorities and avoid off-target opportunities.",
      },
      {
        title: "We activate our partner network",
        body: "When your project justifies it, we can search for opportunities beyond our own catalogue, through our professional databases and our partner agencies on the French Riviera.",
      },
    ],
    differentiation:
      "Your search is more than a simple alert: it can become a real buyer brief, followed by an advisor and activated in our French Riviera partner network.",
    existingAccountTitle: "Already have a Sillage Space (seller or buyer)?",
    existingAccountBody:
      "Sign in to attach this new search to your existing space.",
    existingAccountCta: "Sign in",
    newAccountTitle: "I don't have an account yet",
    newAccountBody:
      "Fill out the form below. We create your Sillage account and send you a magic login link by email, no password required.",
  },
  es: {
    kicker: "Búsqueda comprador acompañada",
    title: "Confíenos su búsqueda inmobiliaria en Niza y en la Costa Azul",
    intro:
      "Dibuje su zona, indique sus criterios y reciba los bienes que realmente corresponden a su proyecto. Su búsqueda también puede ser seguida por un asesor Sillage, que la activa en nuestras herramientas profesionales y en nuestra red de la Costa Azul.",
    microProofs: [
      "Zona dibujada en el mapa",
      "Alertas automáticas",
      "Asesor Sillage",
      "Red profesional Costa Azul",
    ],
    whyTitle: "¿Por qué crear una búsqueda Sillage?",
    whyCards: [
      {
        title: "Una zona precisa, no una ciudad entera",
        body: "Trace las calles, barrios o sectores que realmente cuentan para usted.",
      },
      {
        title: "Alertas más pertinentes",
        body: "Reciba menos bienes fuera de contexto y más oportunidades realmente compatibles.",
      },
      {
        title: "Un asesor puede tomar el relevo",
        body: "Su búsqueda puede ser analizada, afinada y activada en nuestras herramientas profesionales por un asesor Sillage.",
      },
    ],
    afterTitle: "Lo que sucede después de su búsqueda",
    afterSteps: [
      {
        title: "Su búsqueda queda registrada",
        body: "Sus criterios, su presupuesto y su zona se centralizan en su espacio Sillage, fáciles de seguir y de ajustar.",
      },
      {
        title: "Nuestro sistema vigila los bienes",
        body: "Recibe una alerta cuando un bien coincide con sus criterios, con un matching más preciso que una simple búsqueda por ciudad.",
      },
      {
        title: "Un asesor Sillage puede analizarla",
        body: "Su proyecto puede ser revisado por un asesor para afinar los criterios, entender sus prioridades y evitar oportunidades fuera de contexto.",
      },
      {
        title: "Activamos nuestra red profesional",
        body: "Cuando su proyecto lo justifica, podemos buscar oportunidades más allá de nuestro propio catálogo, a través de nuestras bases profesionales y nuestra red de agencias asociadas en la Costa Azul.",
      },
    ],
    differentiation:
      "Su búsqueda no se queda en una simple alerta: puede convertirse en un verdadero brief de comprador, seguido por un asesor y activado en nuestra red profesional de la Costa Azul.",
    existingAccountTitle: "¿Ya tiene un Espacio Sillage (vendedor o comprador)?",
    existingAccountBody:
      "Inicie sesión para añadir esta búsqueda a su espacio existente.",
    existingAccountCta: "Iniciar sesión",
    newAccountTitle: "Aún no tengo cuenta",
    newAccountBody:
      "Complete el formulario de abajo. Creamos su espacio Sillage y le enviamos un enlace mágico por email para activarlo, sin contraseña.",
  },
  ru: {
    kicker: "Сопровождаемый поиск покупателя",
    title: "Доверьте нам поиск недвижимости в Ницце и на Лазурном Берегу",
    intro:
      "Нарисуйте зону, укажите критерии и получайте объекты, действительно соответствующие вашему проекту. Вашу заявку также может вести консультант Sillage — он активирует её в наших профессиональных инструментах и в нашей партнёрской сети Лазурного Берега.",
    microProofs: [
      "Зона, нарисованная на карте",
      "Автоматические уведомления",
      "Консультант Sillage",
      "Профсеть Лазурного Берега",
    ],
    whyTitle: "Зачем создавать поиск Sillage?",
    whyCards: [
      {
        title: "Точная зона, а не целый город",
        body: "Обозначьте улицы, кварталы или районы, которые действительно для вас важны.",
      },
      {
        title: "Более релевантные уведомления",
        body: "Меньше нерелевантных объектов, больше реально подходящих возможностей.",
      },
      {
        title: "Консультант может подхватить",
        body: "Ваш поиск может быть проанализирован, уточнён и активирован в наших профессиональных инструментах консультантом Sillage.",
      },
    ],
    afterTitle: "Что происходит после вашего запроса",
    afterSteps: [
      {
        title: "Ваш запрос сохранён",
        body: "Критерии, бюджет и зона централизованы в вашем кабинете Sillage — их легко отслеживать и корректировать.",
      },
      {
        title: "Система наблюдает за объектами",
        body: "Вы получаете уведомление, когда объект соответствует критериям, с более точным подбором, чем простой поиск по городу.",
      },
      {
        title: "Консультант может его рассмотреть",
        body: "Ваш проект может быть прочитан консультантом, чтобы уточнить критерии, понять приоритеты и избежать нерелевантных предложений.",
      },
      {
        title: "Мы активируем профессиональную сеть",
        body: "Когда это оправдано проектом, мы ищем возможности за пределами нашего собственного каталога — через профессиональные базы и сеть партнёрских агентств Лазурного Берега.",
      },
    ],
    differentiation:
      "Ваш поиск — не просто уведомление: он может стать настоящим брифом покупателя, который ведёт консультант и который активируется в нашей профессиональной сети Лазурного Берега.",
    existingAccountTitle: "Уже есть кабинет Sillage (продавец или покупатель)?",
    existingAccountBody:
      "Войдите, чтобы привязать этот запрос к существующему кабинету.",
    existingAccountCta: "Войти",
    newAccountTitle: "У меня ещё нет аккаунта",
    newAccountBody:
      "Заполните форму ниже. Мы создадим кабинет Sillage и отправим ссылку для входа на email — без пароля.",
  },
};
