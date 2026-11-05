import { CANONICAL_SALE_PROPERTY_TYPES } from "@/lib/properties/canonical-types";

/**
 * Types de biens d'un profil de recherche acquéreur : normalisation vers le
 * vocabulaire canonique du site (apartment, house, villa, studio…).
 *
 * Origine du problème (relevé du 05/11/2026) : le Zap SweepBright concatène
 * deux booléens « appartement ? » / « maison ? » en une chaîne (« TrueFalse »,
 * « FalseTrue », « FalseFalse ») et laisse passer des libellés libres
 * (« T3 », « 2 piece », « Parking box »). Comme le rapprochement bloque dès que
 * la liste est non vide et que le type du bien n'y figure pas, 478 profils
 * « TrueFalse » n'ont jamais pu correspondre à aucun bien.
 */

export type NormalizedPropertyTypes = {
  propertyTypes: string[];
  /** Nombre de pièces déduit d'un libellé « T3 » / « 2 pièces » (null sinon). */
  roomsHint: number | null;
  /** Libellés non reconnus, conservés pour information. */
  unrecognized: string[];
};

const CANONICAL = new Set(CANONICAL_SALE_PROPERTY_TYPES);

const fold = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

const BOOLEAN_PAIRS: Record<string, string[]> = {
  truefalse: ["apartment"],
  falsetrue: ["house"],
  truetrue: ["apartment", "house"],
  falsefalse: [],
};

const KEYWORDS: Array<[RegExp, string]> = [
  [/\b(appartement|appartment|apartment|appart|apt|flat)\b/, "apartment"],
  [/\bstudio\b/, "studio"],
  [/\bvilla\b/, "villa"],
  [/\b(maison|house|home)\b/, "house"],
  [/\bloft\b/, "loft"],
  [/\bduplex\b/, "duplex"],
  [/\b(penthouse|attique|dernier etage)\b/, "penthouse"],
  [/\b(terrain|land)\b/, "land"],
  [/\b(immeuble|building)\b/, "building"],
  [/\b(bureau|bureaux|office)\b/, "office"],
  [/\b(commerce|commercial|local|boutique|fonds)\b/, "commercial"],
  [/\b(parking|box|garage|cave)\b/, "other"],
];

const ROOMS_RE = /\b(?:t|f)\s?([1-9])\b|\b([1-9])\s?(?:p|pieces?|piece|pcs?)\b/;

/** Normalise une liste de libellés (un libellé peut en contenir plusieurs). */
export const normalizeBuyerPropertyTypes = (values: readonly string[]): NormalizedPropertyTypes => {
  const propertyTypes = new Set<string>();
  const unrecognized: string[] = [];
  let roomsHint: number | null = null;

  for (const raw of values) {
    if (typeof raw !== "string") continue;
    const folded = fold(raw);
    if (!folded) continue;
    if (CANONICAL.has(folded)) {
      propertyTypes.add(folded);
      continue;
    }
    let recognized = false;
    // Paires de booléens Zapier, éventuellement suivies d'un libellé.
    for (const [pair, types] of Object.entries(BOOLEAN_PAIRS)) {
      if (folded === pair || folded.startsWith(`${pair} `)) {
        for (const type of types) propertyTypes.add(type);
        recognized = true;
        break;
      }
    }
    const remainder = folded.replace(/^(truefalse|falsetrue|truetrue|falsefalse)\s*/, "");
    for (const [pattern, type] of KEYWORDS) {
      if (pattern.test(remainder)) {
        propertyTypes.add(type);
        recognized = true;
      }
    }
    const rooms = remainder.match(ROOMS_RE);
    if (rooms) {
      const count = Number.parseInt(rooms[1] ?? rooms[2] ?? "", 10);
      if (Number.isFinite(count) && count > 0) {
        roomsHint = roomsHint === null ? count : Math.min(roomsHint, count);
        // « T3 » seul désigne un appartement par convention.
        if (!KEYWORDS.some(([pattern]) => pattern.test(remainder))) propertyTypes.add("apartment");
        recognized = true;
      }
    }
    if (!recognized) unrecognized.push(raw.trim());
  }

  return { propertyTypes: Array.from(propertyTypes), roomsHint, unrecognized };
};

/** Raccourci : liste normalisée seule (les libellés inconnus sont écartés). */
export const toCanonicalBuyerPropertyTypes = (values: readonly string[]): string[] =>
  normalizeBuyerPropertyTypes(values).propertyTypes;
