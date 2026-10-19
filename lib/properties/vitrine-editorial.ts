/**
 * Fiche vitrine — règles pures des champs éditoriaux (points forts, quartier).
 *
 * Volontairement sans dépendance serveur : partagé entre le service, les
 * routes API et le composant client (compteur de caractères, bornes), et
 * couvert par des tests unitaires.
 */

export const VITRINE_HIGHLIGHT_MAX_LENGTH = 28;
export const VITRINE_HIGHLIGHTS_MIN = 3;
export const VITRINE_HIGHLIGHTS_MAX = 5;
export const VITRINE_QUARTIER_MAX_LENGTH = 40;

export type VitrineHighlightsValidation = {
  highlights: string[];
  errors: string[];
};

const collapseWhitespace = (value: string) => value.replace(/\s+/g, " ").trim();

/**
 * Normalise une saisie brute (tableau ou texte multi-lignes) : trim, espaces
 * multiples réduits, lignes vides ignorées. Ne valide pas.
 */
export const normalizeVitrineHighlights = (input: unknown): string[] => {
  const rawLines: unknown[] = Array.isArray(input)
    ? input
    : typeof input === "string"
      ? input.split(/\r?\n/)
      : [];
  return rawLines
    .filter((line): line is string => typeof line === "string")
    .map(collapseWhitespace)
    .filter((line) => line.length > 0);
};

/**
 * Valide une liste de points forts déjà normalisée.
 *
 * `allowEmpty` : une liste vide est acceptée (effacement) ; sinon la règle
 * « 3 à 5 lignes » s'applique. La longueur de chaque ligne (28 caractères,
 * comptés en points de code pour que « é » ou « ² » comptent 1) est toujours
 * contrôlée.
 */
export const validateVitrineHighlights = (
  highlights: string[],
  options?: { allowEmpty?: boolean }
): VitrineHighlightsValidation => {
  const errors: string[] = [];
  const count = highlights.length;

  if (count === 0 && options?.allowEmpty) {
    return { highlights, errors };
  }
  if (count < VITRINE_HIGHLIGHTS_MIN || count > VITRINE_HIGHLIGHTS_MAX) {
    errors.push(
      `Il faut entre ${VITRINE_HIGHLIGHTS_MIN} et ${VITRINE_HIGHLIGHTS_MAX} points forts (${count} saisi${count > 1 ? "s" : ""}).`
    );
  }
  highlights.forEach((line, index) => {
    const length = Array.from(line).length;
    if (length > VITRINE_HIGHLIGHT_MAX_LENGTH) {
      errors.push(
        `Ligne ${index + 1} : ${length} caractères, maximum ${VITRINE_HIGHLIGHT_MAX_LENGTH}.`
      );
    }
  });
  return { highlights, errors };
};

export const normalizeVitrineQuartier = (input: unknown): string | null => {
  if (typeof input !== "string") return null;
  const value = collapseWhitespace(input);
  return value.length > 0 ? value : null;
};

export const validateVitrineQuartier = (quartier: string | null): string[] => {
  if (quartier === null) return [];
  const length = Array.from(quartier).length;
  return length > VITRINE_QUARTIER_MAX_LENGTH
    ? [`Quartier : ${length} caractères, maximum ${VITRINE_QUARTIER_MAX_LENGTH}.`]
    : [];
};

// Titres SweepBright : « NICE – Église Russe – Appartement 3 pièces… »,
// « Nice - Cimiez - … », « Mont Boron – Villa… ». Le quartier est le premier
// segment une fois la ville retirée.
const TITLE_SEPARATOR = /\s*[–—]\s*|\s+-\s+|\s*\|\s*/;
const LEADING_CITY = /^(nice|villefranche(?:-sur-mer)?|beaulieu(?:-sur-mer)?|saint-jean-cap-ferrat|cap d'ail|èze|eze|cagnes(?:-sur-mer)?|saint-laurent-du-var)\b[\s,:–—-]*/i;

/**
 * Pré-remplissage du quartier à partir du titre : segment avant le premier
 * tiret, débarrassé d'une ville en tête. Renvoie null si rien d'exploitable.
 */
export const deriveVitrineQuartierFromTitle = (title: string | null | undefined): string | null => {
  if (!title) return null;
  const segments = title
    .split(TITLE_SEPARATOR)
    .map(collapseWhitespace)
    .filter((segment) => segment.length > 0);
  if (segments.length === 0) return null;

  let candidate = segments[0];
  if (LEADING_CITY.test(candidate)) {
    const stripped = collapseWhitespace(candidate.replace(LEADING_CITY, ""));
    // « NICE – Cimiez » : la ville occupait tout le premier segment, on prend
    // le suivant.
    candidate = stripped.length > 0 ? stripped : (segments[1] ?? "");
  }
  candidate = collapseWhitespace(candidate);
  if (candidate.length === 0) return null;
  if (Array.from(candidate).length > VITRINE_QUARTIER_MAX_LENGTH) return null;
  // Un segment qui ressemble à une désignation de bien n'est pas un quartier.
  if (/\b(appartement|villa|maison|studio|pi[èe]ces?|m²|duplex|penthouse|loft|terrain|local|parking|cave|t\d|f\d)\b/i.test(candidate)) {
    return null;
  }
  return candidate;
};
