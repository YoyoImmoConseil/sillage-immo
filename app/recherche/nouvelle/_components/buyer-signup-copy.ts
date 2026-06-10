import type { AppLocale } from "@/lib/i18n/config";

export type BuyerSignupCopy = {
  steps: string[];
  sections: {
    criteria: string;
    criteriaIntro: string;
    zone: string;
    zoneHint: string;
    zoneReassurance: string;
    contact: string;
    contactIntro: string;
    contactControl: string;
  };
  fields: {
    businessType: string;
    sale: string;
    rental: string;
    city: string;
    cityPlaceholder: string;
    propertyType: string;
    allTypes: string;
    minBudget: string;
    maxBudget: string;
    minRooms: string;
    maxRooms: string;
    minSurface: string;
    maxSurface: string;
    minFloor: string;
    maxFloor: string;
    terrace: string;
    elevator: string;
    indifferent: string;
    yes: string;
    no: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    phoneHint: string;
    rgpd: string;
  };
  buttons: {
    next: string;
    back: string;
    submit: string;
  };
  validation: {
    emailInvalid: string;
    nameMissing: string;
    rgpdMissing: string;
  };
  success: {
    title: string;
    body: (email: string) => string;
    goHome: string;
    goLogin: string;
  };
  emailFail: {
    title: string;
    body: string;
    goLogin: string;
  };
  generic: string;
};

export const buyerSignupCopy: Record<AppLocale, BuyerSignupCopy> = {
  fr: {
    steps: ["Critères", "Contact"],
    sections: {
      criteria: "Vos critères de recherche",
      criteriaIntro:
        "Indiquez vos critères actuels, même s'ils sont encore approximatifs. Vous pourrez les ajuster ensuite dans votre espace Sillage, et un conseiller pourra vous aider à les affiner.",
      zone: "Dessinez votre zone idéale",
      zoneHint:
        "Tracez les rues, quartiers ou secteurs qui vous intéressent. Cette zone nous aide à mieux filtrer les biens automatiquement, mais aussi à guider le travail de votre conseiller lorsqu'il recherche des opportunités pour vous.",
      zoneReassurance:
        "Plus votre zone est précise, plus les alertes et les recherches de votre conseiller seront pertinentes.",
      contact: "Recevez vos alertes et soyez accompagné",
      contactIntro:
        "Votre email permet de créer votre espace Sillage sécurisé, sans mot de passe. Votre téléphone permet à un conseiller de vous rappeler si une opportunité sérieuse correspond à votre projet ou si votre recherche mérite d'être affinée.",
      contactControl:
        "Vous gardez la main : votre recherche peut être modifiée, mise en pause ou supprimée à tout moment depuis votre espace Sillage.",
    },
    fields: {
      businessType: "Type de transaction",
      sale: "Achat",
      rental: "Location",
      city: "Ville ou secteur",
      cityPlaceholder: "Nice, Cannes, Antibes…",
      propertyType: "Type de bien",
      allTypes: "Tous les types",
      minBudget: "Budget min (€)",
      maxBudget: "Budget max (€)",
      minRooms: "Pièces min",
      maxRooms: "Pièces max",
      minSurface: "Surface min (m²)",
      maxSurface: "Surface max (m²)",
      minFloor: "Étage min",
      maxFloor: "Étage max",
      terrace: "Terrasse",
      elevator: "Ascenseur",
      indifferent: "Indifférent",
      yes: "Oui",
      no: "Non",
      firstName: "Prénom",
      lastName: "Nom",
      email: "Email",
      phone: "Téléphone",
      phoneHint: "Facultatif mais recommandé pour être rappelé.",
      rgpd:
        "J'accepte que Sillage Immo conserve ces informations pour traiter ma recherche et m'envoyer des alertes. Je peux me désabonner à tout moment.",
    },
    buttons: {
      next: "Valider mes critères",
      back: "Retour",
      submit: "Activer ma recherche Sillage",
    },
    validation: {
      emailInvalid: "Merci de renseigner un email valide.",
      nameMissing: "Nom et prénom sont obligatoires.",
      rgpdMissing: "Merci de valider la case RGPD pour continuer.",
    },
    success: {
      title: "Votre recherche est enregistrée !",
      body: (email: string) =>
        `Nous venons d'envoyer un lien de confirmation à ${email}. Cliquez dessus pour activer votre espace Sillage et lancer les alertes.`,
      goHome: "Retour à l'accueil",
      goLogin: "J'ai déjà un compte",
    },
    emailFail: {
      title: "Recherche enregistrée, email à renvoyer",
      body:
        "Votre recherche est bien enregistrée, mais l'envoi du lien de confirmation a échoué. Allez sur la page de connexion et cliquez sur « Recevoir un nouveau lien » avec votre adresse email.",
      goLogin: "Recevoir un nouveau lien",
    },
    generic: "Une erreur est survenue. Merci de réessayer dans un instant.",
  },
  en: {
    steps: ["Criteria", "Contact"],
    sections: {
      criteria: "Your search criteria",
      criteriaIntro:
        "Share your current criteria, even if they're still approximate. You'll be able to adjust them later in your Sillage space, and an advisor can help you refine them.",
      zone: "Draw your ideal zone",
      zoneHint:
        "Trace the streets, neighborhoods or sectors that matter to you. This zone helps us filter properties automatically, and it also guides your advisor when searching for opportunities on your behalf.",
      zoneReassurance:
        "The more precise your zone, the more relevant your alerts and your advisor's search work will be.",
      contact: "Receive your alerts and stay supported",
      contactIntro:
        "Your email lets us create your secure Sillage space without any password. Your phone lets an advisor call you back if a serious opportunity matches your project, or if your search deserves to be refined.",
      contactControl:
        "You stay in control: your search can be edited, paused or deleted at any time from your Sillage space.",
    },
    fields: {
      businessType: "Transaction type",
      sale: "Buy",
      rental: "Rent",
      city: "City or area",
      cityPlaceholder: "Nice, Cannes, Antibes…",
      propertyType: "Property type",
      allTypes: "All types",
      minBudget: "Min budget (€)",
      maxBudget: "Max budget (€)",
      minRooms: "Min rooms",
      maxRooms: "Max rooms",
      minSurface: "Min surface (sqm)",
      maxSurface: "Max surface (sqm)",
      minFloor: "Min floor",
      maxFloor: "Max floor",
      terrace: "Terrace",
      elevator: "Elevator",
      indifferent: "Any",
      yes: "Yes",
      no: "No",
      firstName: "First name",
      lastName: "Last name",
      email: "Email",
      phone: "Phone",
      phoneHint: "Optional but recommended if you'd like a callback.",
      rgpd:
        "I agree that Sillage Immo can keep this information to process my search and send me alerts. I can unsubscribe at any time.",
    },
    buttons: {
      next: "Validate my criteria",
      back: "Back",
      submit: "Activate my Sillage search",
    },
    validation: {
      emailInvalid: "Please provide a valid email.",
      nameMissing: "First and last name are required.",
      rgpdMissing: "Please accept the GDPR notice to continue.",
    },
    success: {
      title: "Your search is saved!",
      body: (email: string) =>
        `We just sent a confirmation link to ${email}. Click it to activate your Sillage account and start receiving alerts.`,
      goHome: "Back to homepage",
      goLogin: "I already have an account",
    },
    emailFail: {
      title: "Search saved, email needs resending",
      body:
        "Your search is saved but the confirmation email could not be delivered. Open the login page and request a new link with your email.",
      goLogin: "Send a new link",
    },
    generic: "Something went wrong. Please try again shortly.",
  },
  es: {
    steps: ["Criterios", "Contacto"],
    sections: {
      criteria: "Sus criterios de búsqueda",
      criteriaIntro:
        "Indique sus criterios actuales, aunque aún sean aproximados. Podrá ajustarlos después en su espacio Sillage, y un asesor podrá ayudarle a afinarlos.",
      zone: "Dibuje su zona ideal",
      zoneHint:
        "Trace las calles, barrios o sectores que le interesan. Esta zona nos ayuda a filtrar mejor los bienes automáticamente, y también orienta el trabajo de su asesor cuando busca oportunidades para usted.",
      zoneReassurance:
        "Cuanto más precisa sea su zona, más pertinentes serán las alertas y las búsquedas de su asesor.",
      contact: "Reciba sus alertas y sea acompañado",
      contactIntro:
        "Su email permite crear su espacio Sillage seguro, sin contraseña. Su teléfono permite que un asesor le llame si una oportunidad seria coincide con su proyecto, o si su búsqueda merece ser afinada.",
      contactControl:
        "Usted lleva el control: su búsqueda puede modificarse, pausarse o eliminarse en cualquier momento desde su espacio Sillage.",
    },
    fields: {
      businessType: "Tipo de operación",
      sale: "Compra",
      rental: "Alquiler",
      city: "Ciudad o zona",
      cityPlaceholder: "Niza, Cannes, Antibes…",
      propertyType: "Tipo de inmueble",
      allTypes: "Todos los tipos",
      minBudget: "Presupuesto mín. (€)",
      maxBudget: "Presupuesto máx. (€)",
      minRooms: "Mín. habitaciones",
      maxRooms: "Máx. habitaciones",
      minSurface: "Superficie mín. (m²)",
      maxSurface: "Superficie máx. (m²)",
      minFloor: "Planta mín.",
      maxFloor: "Planta máx.",
      terrace: "Terraza",
      elevator: "Ascensor",
      indifferent: "Indiferente",
      yes: "Sí",
      no: "No",
      firstName: "Nombre",
      lastName: "Apellido",
      email: "Email",
      phone: "Teléfono",
      phoneHint: "Opcional pero recomendado para ser contactado.",
      rgpd:
        "Acepto que Sillage Immo conserve estos datos para procesar mi búsqueda y enviarme alertas. Puedo darme de baja en cualquier momento.",
    },
    buttons: {
      next: "Validar mis criterios",
      back: "Atrás",
      submit: "Activar mi búsqueda Sillage",
    },
    validation: {
      emailInvalid: "Por favor indique un email válido.",
      nameMissing: "Nombre y apellido son obligatorios.",
      rgpdMissing: "Por favor acepte el aviso RGPD para continuar.",
    },
    success: {
      title: "¡Su búsqueda está guardada!",
      body: (email: string) =>
        `Acabamos de enviar un enlace de confirmación a ${email}. Haga clic para activar su espacio Sillage e iniciar las alertas.`,
      goHome: "Volver a inicio",
      goLogin: "Ya tengo cuenta",
    },
    emailFail: {
      title: "Búsqueda guardada, email por reenviar",
      body:
        "Su búsqueda está guardada pero no se pudo enviar el email de confirmación. Abra la página de acceso y solicite un nuevo enlace con su email.",
      goLogin: "Enviar nuevo enlace",
    },
    generic: "Algo salió mal. Por favor inténtelo de nuevo en un momento.",
  },
  ru: {
    steps: ["Критерии", "Контакты"],
    sections: {
      criteria: "Критерии поиска",
      criteriaIntro:
        "Укажите текущие критерии, даже если они пока приблизительны. Вы сможете скорректировать их в вашем кабинете Sillage, а консультант поможет их уточнить.",
      zone: "Нарисуйте идеальную зону",
      zoneHint:
        "Обозначьте улицы, кварталы или сектора, которые вам интересны. Эта зона помогает нам точнее фильтровать объекты автоматически и направляет работу вашего консультанта, когда он ищет возможности для вас.",
      zoneReassurance:
        "Чем точнее ваша зона, тем релевантнее уведомления и тем полезнее поисковая работа консультанта.",
      contact: "Получайте уведомления и сопровождение",
      contactIntro:
        "Email нужен, чтобы создать ваш защищённый кабинет Sillage без пароля. Телефон позволит консультанту перезвонить, если появится серьёзная возможность, соответствующая проекту, или если поиск стоит уточнить.",
      contactControl:
        "Вы сохраняете контроль: запрос можно изменить, поставить на паузу или удалить в любой момент из кабинета Sillage.",
    },
    fields: {
      businessType: "Тип сделки",
      sale: "Покупка",
      rental: "Аренда",
      city: "Город или район",
      cityPlaceholder: "Ницца, Канны, Антиб…",
      propertyType: "Тип объекта",
      allTypes: "Любой тип",
      minBudget: "Бюджет от (€)",
      maxBudget: "Бюджет до (€)",
      minRooms: "Мин. комнат",
      maxRooms: "Макс. комнат",
      minSurface: "Площадь от (м²)",
      maxSurface: "Площадь до (м²)",
      minFloor: "Этаж от",
      maxFloor: "Этаж до",
      terrace: "Терраса",
      elevator: "Лифт",
      indifferent: "Неважно",
      yes: "Да",
      no: "Нет",
      firstName: "Имя",
      lastName: "Фамилия",
      email: "Email",
      phone: "Телефон",
      phoneHint: "Необязательно, но поможет связаться с вами.",
      rgpd:
        "Я согласен, чтобы Sillage Immo хранила эти данные для обработки моего запроса и отправки уведомлений. Я могу отписаться в любой момент.",
    },
    buttons: {
      next: "Подтвердить критерии",
      back: "Назад",
      submit: "Активировать мой поиск Sillage",
    },
    validation: {
      emailInvalid: "Укажите корректный email.",
      nameMissing: "Имя и фамилия обязательны.",
      rgpdMissing: "Примите уведомление RGPD, чтобы продолжить.",
    },
    success: {
      title: "Ваш запрос сохранён!",
      body: (email: string) =>
        `Мы отправили ссылку для подтверждения на ${email}. Перейдите по ней, чтобы активировать кабинет Sillage и включить уведомления.`,
      goHome: "На главную",
      goLogin: "У меня уже есть аккаунт",
    },
    emailFail: {
      title: "Запрос сохранён, письмо нужно отправить снова",
      body:
        "Запрос сохранён, но письмо с подтверждением не удалось отправить. Перейдите на страницу входа и запросите новую ссылку.",
      goLogin: "Получить новую ссылку",
    },
    generic: "Что-то пошло не так. Попробуйте ещё раз через минуту.",
  },
};
