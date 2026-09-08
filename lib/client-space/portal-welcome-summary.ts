/**
 * Récapitulatif inséré dans l'email « Votre espace Sillage est prêt » :
 * prénom + rappel du projet (critères de recherche ou bien à vendre).
 * Pur (sans accès base) pour être testé et réutilisé.
 */

export type PortalWelcomeSearch = {
  businessType: string | null;
  cities: string[];
  propertyTypes: string[];
  budgetMin: number | null;
  budgetMax: number | null;
  roomsMin: number | null;
  bedroomsMin: number | null;
  livingAreaMin: number | null;
};

export type PortalWelcomeSeller = {
  propertyType: string | null;
  propertyAddress: string | null;
  city: string | null;
  postalCode: string | null;
};

export type PortalWelcomeContext = {
  firstName: string | null;
  search: PortalWelcomeSearch | null;
  seller: PortalWelcomeSeller | null;
};

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: "appartement",
  appartement: "appartement",
  flat: "appartement",
  house: "maison",
  maison: "maison",
  villa: "villa",
  studio: "studio",
  land: "terrain",
  terrain: "terrain",
  parking: "parking",
  commercial: "local commercial",
  office: "bureaux",
  building: "immeuble",
  autre: "bien",
  other: "bien",
};

// Espace insécable classique plutôt que l'espace fine d'Intl (mal rendue
// par certains clients mail).
const formatAmount = (value: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 })
    .format(value)
    .replace(/[\u202f\u00a0]/g, "\u00a0");

const capitalize = (value: string) =>
  value.length > 0 ? value.charAt(0).toUpperCase() + value.slice(1) : value;

/** « Jean Dupont » → « Jean » ; nettoie les saisies en capitales ou avec « N/A ». */
export function pickFirstName(input: {
  firstName?: string | null;
  fullName?: string | null;
}): string | null {
  const raw = (input.firstName?.trim() || input.fullName?.trim().split(/\s+/)[0] || "")
    .replace(/^n\/a$/i, "")
    .trim();
  if (!raw) return null;
  // Tout en capitales (import Zapier) → première lettre seulement, en gardant les tirets.
  const normalized =
    raw === raw.toUpperCase() ? raw.toLowerCase() : raw;
  return normalized
    .split("-")
    .map((part) => capitalize(part))
    .join("-");
}

export function buildSearchSummaryLines(search: PortalWelcomeSearch): string[] {
  const isRental = search.businessType === "rental";
  const types = search.propertyTypes
    .map((type) => PROPERTY_TYPE_LABELS[type.toLowerCase()] ?? null)
    .filter((label): label is string => Boolean(label));
  const uniqueTypes = Array.from(new Set(types));

  const what = uniqueTypes.length > 0 ? uniqueTypes.join(" ou ") : "bien";
  const lines: string[] = [];
  lines.push(`${isRental ? "Location" : "Achat"} · ${capitalize(what)}`);

  if (search.cities.length > 0) {
    lines.push(`Secteur : ${search.cities.join(", ")}`);
  }

  const unit = isRental ? " €/mois" : " €";
  if (search.budgetMin && search.budgetMax) {
    lines.push(`Budget : de ${formatAmount(search.budgetMin)} à ${formatAmount(search.budgetMax)}${unit}`);
  } else if (search.budgetMax) {
    lines.push(`Budget : jusqu'à ${formatAmount(search.budgetMax)}${unit}`);
  } else if (search.budgetMin) {
    lines.push(`Budget : à partir de ${formatAmount(search.budgetMin)}${unit}`);
  }

  const details: string[] = [];
  if (search.roomsMin) details.push(`${search.roomsMin} pièce${search.roomsMin > 1 ? "s" : ""} min.`);
  if (search.bedroomsMin) details.push(`${search.bedroomsMin} chambre${search.bedroomsMin > 1 ? "s" : ""} min.`);
  if (search.livingAreaMin) details.push(`${formatAmount(search.livingAreaMin)} m² min.`);
  if (details.length > 0) lines.push(details.join(" · "));

  return lines;
}

export function buildSellerSummaryLines(seller: PortalWelcomeSeller): string[] {
  const type = seller.propertyType
    ? PROPERTY_TYPE_LABELS[seller.propertyType.toLowerCase()] ?? seller.propertyType
    : "bien";
  const place = [seller.postalCode, seller.city].filter(Boolean).join(" ");
  const lines = [`Vente · ${capitalize(type)}${place ? ` à ${place}` : ""}`];
  if (seller.propertyAddress) lines.push(seller.propertyAddress);
  return lines;
}

/** Lignes du récapitulatif (vide si on ne sait rien du projet). */
export function buildPortalWelcomeSummaryLines(context: PortalWelcomeContext): string[] {
  if (context.search) return buildSearchSummaryLines(context.search);
  if (context.seller) return buildSellerSummaryLines(context.seller);
  return [];
}
