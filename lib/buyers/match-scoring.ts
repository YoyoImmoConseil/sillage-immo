/**
 * Grille de correspondance acquéreur ↔ bien (décision de Yoann, 26/10/2026).
 *
 * Principe : le score part de 0 et additionne les points des critères
 * satisfaits. Un critère que l'acquéreur n'a pas renseigné vaut 0 et ne
 * bloque jamais. Un critère renseigné et non satisfait est un bloqueur (la
 * correspondance est écartée), sauf le budget minimum et le nombre de
 * chambres minimum, qui ne font que rapporter des points.
 *
 * Tolérances : prix admis jusqu'à budget max + 10 % ; surface admise dès
 * surface min − 10 % et jusqu'à surface max + 10 %. Budget minimum : des
 * points au-dessus, rien en dessous, mais un bien à plus de 30 % sous le
 * minimum est écarté (un acquéreur à 500–670 k€ ne reçoit pas un studio à
 * 195 k€ — décision du 26/10/2026).
 *
 * Seuil unique (65) : une correspondance n'est conservée, affichée dans
 * « Acquéreurs compatibles » et alertée par e-mail qu'à partir de 65 points
 * (Yoann, 26/10/2026 : « ceux qui ne remplissent pas ces critères minimum ne
 * doivent pas apparaître »). Une recherche sans critère (transaction seule)
 * plafonne à 25 : jamais listée, jamais alertée. Ville + budget max suffisent
 * tout juste (25 + 20 + 20 = 65).
 */
export const MATCH_POINTS = {
  businessType: 25,
  city: 20,
  budgetMax: 20,
  roomsMin: 10,
  livingAreaMin: 10,
  propertyType: 10,
  budgetMin: 5,
  bedroomsMin: 5,
  floorMin: 3,
  terrace: 6,
  elevator: 6,
} as const;

export const MATCH_TOLERANCE = {
  /** Prix ≤ budget max × (1 + 0,10). */
  budgetMax: 0.1,
  /** Prix < budget min × (1 − 0,30) → écarté ; entre les deux : 0 point, pas de blocage. */
  budgetMinFloor: 0.3,
  /** Surface ≥ min × (1 − 0,10) ; surface ≤ max × (1 + 0,10). */
  livingArea: 0.1,
} as const;

/** Score minimal pour conserver et afficher une correspondance. */
export const MATCH_MIN_SCORE = 65;
/** Score minimal pour l'alerte automatique par e-mail (même seuil). */
export const ALERT_SCORE_THRESHOLD = MATCH_MIN_SCORE;

export const MATCH_MAX_SCORE = Object.values(MATCH_POINTS).reduce((sum, value) => sum + value, 0);

export type MatchProfileCriteria = {
  business_type: string;
  property_types: string[];
  cities: string[];
  budget_min: number | null;
  budget_max: number | null;
  rooms_min: number | null;
  rooms_max: number | null;
  bedrooms_min: number | null;
  living_area_min: number | null;
  living_area_max: number | null;
  floor_min: number | null;
  floor_max: number | null;
  requires_terrace: boolean | null;
  requires_elevator: boolean | null;
};

export type MatchListingFacts = {
  business_type: string;
  property_type: string | null;
  city: string | null;
  price_amount: number | null;
  rooms: number | null;
  bedrooms: number | null;
  living_area: number | null;
  floor: number | null;
  has_terrace: boolean | null;
  has_elevator: boolean | null;
};

export type MatchEvaluation = {
  score: number;
  blockers: string[];
  matchedCriteria: Record<string, unknown>;
};

export const normalizeMatchToken = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

export const buildMatchScore = (profile: MatchProfileCriteria, listing: MatchListingFacts): MatchEvaluation => {
  let score = 0;
  const matchedCriteria: Record<string, unknown> = {};
  const blockers: string[] = [];

  // Achat / location : toujours renseigné, bloquant.
  if (profile.business_type !== listing.business_type) {
    blockers.push("business_type");
  } else {
    score += MATCH_POINTS.businessType;
    matchedCriteria.businessType = true;
  }

  // Type de bien : bloquant si renseigné.
  if (profile.property_types.length > 0) {
    const propertyType = normalizeMatchToken(listing.property_type ?? "");
    const allowedTypes = profile.property_types.map(normalizeMatchToken);
    if (!propertyType || !allowedTypes.includes(propertyType)) {
      blockers.push("property_type");
    } else {
      score += MATCH_POINTS.propertyType;
      matchedCriteria.propertyType = listing.property_type;
    }
  }

  // Ville : bloquant si renseignée.
  if (profile.cities.length > 0) {
    const city = normalizeMatchToken(listing.city ?? "");
    const allowedCities = profile.cities.map(normalizeMatchToken);
    if (!city || !allowedCities.includes(city)) {
      blockers.push("city");
    } else {
      score += MATCH_POINTS.city;
      matchedCriteria.city = listing.city;
    }
  }

  // Budget max + 10 % : bloquant au-delà.
  if (isNumber(profile.budget_max) && isNumber(listing.price_amount)) {
    const ceiling = profile.budget_max * (1 + MATCH_TOLERANCE.budgetMax);
    if (listing.price_amount > ceiling) {
      blockers.push("budget_max");
    } else {
      score += MATCH_POINTS.budgetMax;
      matchedCriteria.budgetMax = listing.price_amount <= profile.budget_max ? true : "tolerance";
    }
  }

  // Budget min : des points au-dessus ; en dessous, rien, sauf à plus de
  // 30 % sous le minimum, où le bien est écarté.
  if (isNumber(profile.budget_min) && isNumber(listing.price_amount)) {
    if (listing.price_amount >= profile.budget_min) {
      score += MATCH_POINTS.budgetMin;
      matchedCriteria.budgetMin = true;
    } else if (listing.price_amount < profile.budget_min * (1 - MATCH_TOLERANCE.budgetMinFloor)) {
      blockers.push("budget_min_floor");
    }
  }

  // Pièces min : bloquant si renseigné (bien sans nombre de pièces = non satisfait).
  if (isNumber(profile.rooms_min)) {
    if (!isNumber(listing.rooms) || listing.rooms < profile.rooms_min) {
      blockers.push("rooms_min");
    } else {
      score += MATCH_POINTS.roomsMin;
      matchedCriteria.roomsMin = true;
    }
  }
  // Pièces max : bloquant, sans points.
  if (isNumber(profile.rooms_max) && isNumber(listing.rooms) && listing.rooms > profile.rooms_max) {
    blockers.push("rooms_max");
  }

  // Chambres min : des points, jamais bloquant.
  if (isNumber(profile.bedrooms_min) && isNumber(listing.bedrooms) && listing.bedrooms >= profile.bedrooms_min) {
    score += MATCH_POINTS.bedroomsMin;
    matchedCriteria.bedroomsMin = true;
  }

  // Surface min − 10 % : bloquant en dessous.
  if (isNumber(profile.living_area_min)) {
    const floorArea = profile.living_area_min * (1 - MATCH_TOLERANCE.livingArea);
    if (!isNumber(listing.living_area) || listing.living_area < floorArea) {
      blockers.push("living_area_min");
    } else {
      score += MATCH_POINTS.livingAreaMin;
      matchedCriteria.livingAreaMin = listing.living_area >= profile.living_area_min ? true : "tolerance";
    }
  }
  // Surface max + 10 % : bloquant, sans points.
  if (isNumber(profile.living_area_max) && isNumber(listing.living_area)) {
    const ceiling = profile.living_area_max * (1 + MATCH_TOLERANCE.livingArea);
    if (listing.living_area > ceiling) {
      blockers.push("living_area_max");
    }
  }

  // Étage min : bloquant si renseigné ; étage max : bloquant, sans points.
  if (isNumber(profile.floor_min)) {
    if (!isNumber(listing.floor) || listing.floor < profile.floor_min) {
      blockers.push("floor_min");
    } else {
      score += MATCH_POINTS.floorMin;
      matchedCriteria.floorMin = true;
    }
  }
  if (isNumber(profile.floor_max) && isNumber(listing.floor) && listing.floor > profile.floor_max) {
    blockers.push("floor_max");
  }

  // Terrasse / ascenseur exigés : bloquants.
  if (profile.requires_terrace === true) {
    if (listing.has_terrace !== true) {
      blockers.push("requires_terrace");
    } else {
      score += MATCH_POINTS.terrace;
      matchedCriteria.requiresTerrace = true;
    }
  }
  if (profile.requires_elevator === true) {
    if (listing.has_elevator !== true) {
      blockers.push("requires_elevator");
    } else {
      score += MATCH_POINTS.elevator;
      matchedCriteria.requiresElevator = true;
    }
  }

  return { score, blockers, matchedCriteria };
};

/** Une correspondance est conservée si rien ne bloque et si le score atteint le minimum. */
export const isMatchRetained = (evaluation: MatchEvaluation) =>
  evaluation.blockers.length === 0 && evaluation.score >= MATCH_MIN_SCORE;

/**
 * Origines de contact où l'acquéreur a lui-même demandé des alertes à
 * l'agence (formulaires et assistant du site, saisie par l'équipe) : l'alerte
 * part sans attendre la confirmation de l'adresse. Les contacts importés des
 * portails (Zapier) ont demandé un renseignement sur un bien, pas un flux :
 * ils ne sont alertés qu'une fois leur adresse vérifiée.
 */
export const isAlertConsentSource = (source: string | null | undefined) => {
  if (typeof source !== "string") return false;
  return source.startsWith("website_") || source === "admin_manual_creation";
};

export const isLeadEligibleForAlerts = (lead: {
  email: string | null;
  email_verified_at: string | null;
  source: string | null;
}) => Boolean(lead.email && lead.email.trim()) && (Boolean(lead.email_verified_at) || isAlertConsentSource(lead.source));

/**
 * Créneaux d'envoi des alertes groupées : 9 h, 12 h et 18 h, heure de Paris,
 * été comme hiver (décision du 26/10/2026). La tâche Vercel tourne en UTC aux
 * heures candidates (7, 8, 10, 11, 16, 17) et ne poursuit que si l'heure de
 * Paris est l'une des trois.
 */
export const BUYER_ALERT_PARIS_HOURS: readonly number[] = [9, 12, 18];

export const parisHour = (date: Date) =>
  Number.parseInt(
    new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "numeric", hour12: false }).format(date),
    10
  );

export const isBuyerAlertSlot = (date: Date) => BUYER_ALERT_PARIS_HOURS.includes(parisHour(date));

/**
 * Baisse de prix : nouveau prix actif strictement inférieur au précédent
 * (une hausse ou un prix identique ne déclenchent rien).
 */
export const detectPriceDrop = (
  previousPrice: number | null | undefined,
  currentPrice: number | null | undefined
): { previousPrice: number; currentPrice: number } | null => {
  if (typeof previousPrice !== "number" || typeof currentPrice !== "number") return null;
  if (!(previousPrice > 0 && currentPrice > 0)) return null;
  return currentPrice < previousPrice ? { previousPrice, currentPrice } : null;
};
