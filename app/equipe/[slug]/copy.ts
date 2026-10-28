import type { AppLocale } from "@/lib/i18n/config";

export type TeamCardCopy = {
  agencyLine: string;
  call: string;
  whatsapp: string;
  email: string;
  saveContact: string;
  saveContactHint: string;
  share: string;
  shareCopied: string;
  shareText: (name: string, title: string | null) => string;
  qrTitle: string;
  qrHint: string;
  reviews: string;
  listingsTitleOwn: string;
  listingsTitleAgency: string;
  listingsAll: string;
  agencyTitle: string;
  agencyCall: string;
  agencyDirections: string;
  legalTitle: string;
  legalLinks: { legal: string; fees: string };
  seoTitle: (name: string, title: string | null) => string;
  seoDescription: (name: string, title: string | null) => string;
  portraitAlt: (name: string) => string;
};

const base = {
  fr: {
    agencyLine: "Sillage Immo · Nice",
    call: "Appeler",
    whatsapp: "WhatsApp",
    email: "E-mail",
    saveContact: "Enregistrer le contact",
    saveContactHint: "Ajoute ma fiche à vos contacts en un geste.",
    share: "Partager ma carte",
    shareCopied: "Lien copié",
    shareText: (name: string, title: string | null) =>
      `${name}${title ? `, ${title}` : ""} — Sillage Immo, agence immobilière à Nice. Mes coordonnées :`,
    qrTitle: "Faites scanner ce code",
    qrHint: "Il ouvre cette carte sur le téléphone de votre interlocuteur.",
    reviews: "Laisser un avis Google",
    listingsTitleOwn: "Ses biens du moment",
    listingsTitleAgency: "Les biens du moment",
    listingsAll: "Voir tous les biens",
    agencyTitle: "L'agence",
    agencyCall: "Appeler l'agence",
    agencyDirections: "Itinéraire",
    legalTitle: "Mentions légales",
    legalLinks: { legal: "Mentions légales complètes", fees: "Honoraires" },
    seoTitle: (name: string, title: string | null) =>
      `${name}${title ? ` — ${title}` : ""} · Sillage Immo, agence immobilière à Nice`,
    seoDescription: (name: string, title: string | null) =>
      `${name}${title ? `, ${title.toLowerCase()}` : ""} chez Sillage Immo, agence immobilière au Port de Nice. Appel, WhatsApp, e-mail et fiche contact à enregistrer.`,
    portraitAlt: (name: string) => `Portrait de ${name}`,
  },
  en: {
    agencyLine: "Sillage Immo · Nice",
    call: "Call",
    whatsapp: "WhatsApp",
    email: "Email",
    saveContact: "Save contact",
    saveContactHint: "Adds my card to your contacts in one tap.",
    share: "Share my card",
    shareCopied: "Link copied",
    shareText: (name: string, title: string | null) =>
      `${name}${title ? `, ${title}` : ""} — Sillage Immo, real estate agency in Nice. My contact details:`,
    qrTitle: "Let them scan this code",
    qrHint: "It opens this card on the other person's phone.",
    reviews: "Leave a Google review",
    listingsTitleOwn: "Current listings",
    listingsTitleAgency: "Current listings",
    listingsAll: "See all properties",
    agencyTitle: "The agency",
    agencyCall: "Call the agency",
    agencyDirections: "Directions",
    legalTitle: "Legal notice",
    legalLinks: { legal: "Full legal notice", fees: "Fees" },
    seoTitle: (name: string, title: string | null) =>
      `${name}${title ? ` — ${title}` : ""} · Sillage Immo, real estate agency in Nice`,
    seoDescription: (name: string, title: string | null) =>
      `${name}${title ? `, ${title.toLowerCase()}` : ""} at Sillage Immo, real estate agency in the Port of Nice. Call, WhatsApp, email and a contact card to save.`,
    portraitAlt: (name: string) => `Portrait of ${name}`,
  },
  es: {
    agencyLine: "Sillage Immo · Niza",
    call: "Llamar",
    whatsapp: "WhatsApp",
    email: "E-mail",
    saveContact: "Guardar contacto",
    saveContactHint: "Añade mi ficha a tus contactos con un toque.",
    share: "Compartir mi tarjeta",
    shareCopied: "Enlace copiado",
    shareText: (name: string, title: string | null) =>
      `${name}${title ? `, ${title}` : ""} — Sillage Immo, agencia inmobiliaria en Niza. Mis datos de contacto:`,
    qrTitle: "Haga escanear este código",
    qrHint: "Abre esta tarjeta en el teléfono de su interlocutor.",
    reviews: "Dejar una reseña en Google",
    listingsTitleOwn: "Sus inmuebles del momento",
    listingsTitleAgency: "Inmuebles del momento",
    listingsAll: "Ver todos los inmuebles",
    agencyTitle: "La agencia",
    agencyCall: "Llamar a la agencia",
    agencyDirections: "Cómo llegar",
    legalTitle: "Aviso legal",
    legalLinks: { legal: "Aviso legal completo", fees: "Honorarios" },
    seoTitle: (name: string, title: string | null) =>
      `${name}${title ? ` — ${title}` : ""} · Sillage Immo, agencia inmobiliaria en Niza`,
    seoDescription: (name: string, title: string | null) =>
      `${name}${title ? `, ${title.toLowerCase()}` : ""} en Sillage Immo, agencia inmobiliaria en el Puerto de Niza. Llamada, WhatsApp, e-mail y ficha de contacto para guardar.`,
    portraitAlt: (name: string) => `Retrato de ${name}`,
  },
  ru: {
    agencyLine: "Sillage Immo · Ницца",
    call: "Позвонить",
    whatsapp: "WhatsApp",
    email: "E-mail",
    saveContact: "Сохранить контакт",
    saveContactHint: "Добавьте мою визитку в контакты одним касанием.",
    share: "Поделиться визиткой",
    shareCopied: "Ссылка скопирована",
    shareText: (name: string, title: string | null) =>
      `${name}${title ? `, ${title}` : ""} — Sillage Immo, агентство недвижимости в Ницце. Мои контакты:`,
    qrTitle: "Дайте отсканировать этот код",
    qrHint: "Он открывает эту визитку на телефоне собеседника.",
    reviews: "Оставить отзыв в Google",
    listingsTitleOwn: "Актуальные объекты",
    listingsTitleAgency: "Актуальные объекты",
    listingsAll: "Все объекты",
    agencyTitle: "Агентство",
    agencyCall: "Позвонить в агентство",
    agencyDirections: "Маршрут",
    legalTitle: "Правовая информация",
    legalLinks: { legal: "Полная правовая информация", fees: "Комиссия" },
    seoTitle: (name: string, title: string | null) =>
      `${name}${title ? ` — ${title}` : ""} · Sillage Immo, агентство недвижимости в Ницце`,
    seoDescription: (name: string, title: string | null) =>
      `${name}${title ? `, ${title}` : ""} — Sillage Immo, агентство недвижимости в порту Ниццы. Звонок, WhatsApp, e-mail и визитка для сохранения в контакты.`,
    portraitAlt: (name: string) => `Портрет: ${name}`,
  },
} satisfies Record<AppLocale, TeamCardCopy>;

export const TEAM_CARD_COPY: Record<AppLocale, TeamCardCopy> = base;
