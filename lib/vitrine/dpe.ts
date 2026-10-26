/**
 * Fiche vitrine — échelles DPE (énergie et climat) telles que dessinées sur
 * la V2 : couleurs, largeurs croissantes des flèches, texte réglementaire.
 */

export const DPE_CLASSES = ["A", "B", "C", "D", "E", "F", "G"] as const;
export type DpeClass = (typeof DPE_CLASSES)[number];

export const ENERGY_SCALE_COLORS: Record<DpeClass, string> = {
  A: "#009C6D",
  B: "#52B153",
  C: "#78BD76",
  D: "#F4E70F",
  E: "#F0B40F",
  F: "#EB8235",
  G: "#D7221F",
};

export const CLIMATE_SCALE_COLORS: Record<DpeClass, string> = {
  A: "#F6EDFD",
  B: "#E4C7FB",
  C: "#D5AAF6",
  D: "#CB95F3",
  E: "#BA72EF",
  F: "#A74DEB",
  G: "#8A19DF",
};

/** Lettres blanches sur les teintes foncées, marine sur les teintes claires. */
export const ENERGY_LETTER_LIGHT: Record<DpeClass, boolean> = {
  A: true,
  B: true,
  C: false,
  D: false,
  E: false,
  F: false,
  G: true,
};
export const CLIMATE_LETTER_LIGHT: Record<DpeClass, boolean> = {
  A: false,
  B: false,
  C: false,
  D: false,
  E: false,
  F: true,
  G: true,
};

/** Largeur (pt) de chaque flèche, A → G, mesurée sur la V2. */
export const DPE_BAR_WIDTHS: Record<DpeClass, number> = {
  A: 71,
  B: 97,
  C: 123,
  D: 148,
  E: 174,
  F: 200,
  G: 225,
};

export type DpeValuePlacement =
  | { mode: "outside"; fontSize: number }
  | { mode: "inside"; fontSize: number };

/**
 * Où écrire la valeur (« 282 kWh/m²/an ») sur la ligne de la classe choisie.
 * La V2 Canva la pose à droite de la flèche, ce qui ne tient que jusqu'en D :
 * dès E la flèche est trop longue et la valeur passerait sous la colonne
 * voisine (décision du 26/10/2026). Règle :
 * 1. dehors, à `valueGap` de la pointe, si elle tient avant `columnRight` ;
 * 2. sinon dans la flèche, en blanc, alignée à droite avant la pointe ;
 * 3. si elle ne tient pas non plus dedans, le corps descend par pas de 0,5 pt
 *    jusqu'à `minFontSize`, puis on garde ce minimum.
 * `measure(size)` renvoie la largeur du texte au corps donné.
 */
export const resolveDpeValuePlacement = (input: {
  barLeft: number;
  barWidth: number;
  tip: number;
  outline: number;
  gap: number;
  columnRight: number;
  letterWidth: number;
  insidePadding: number;
  fontSize: number;
  minFontSize: number;
  measure: (fontSize: number) => number;
}): DpeValuePlacement => {
  const outsideLeft = input.barLeft + input.barWidth + input.outline + input.gap;
  if (outsideLeft + input.measure(input.fontSize) <= input.columnRight) {
    return { mode: "outside", fontSize: input.fontSize };
  }
  const insideWidth = input.barWidth - input.tip - input.insidePadding - input.letterWidth;
  let fontSize = input.fontSize;
  while (fontSize > input.minFontSize && input.measure(fontSize) > insideWidth) {
    fontSize = Math.max(input.minFontSize, fontSize - 0.5);
  }
  return { mode: "inside", fontSize };
};

export const isDpeClass = (value: unknown): value is DpeClass =>
  typeof value === "string" && (DPE_CLASSES as readonly string[]).includes(value.toUpperCase());

export const toDpeClass = (value: unknown): DpeClass | null =>
  isDpeClass(value) ? (value.toUpperCase() as DpeClass) : null;

export type DpeStatus =
  | { kind: "scales"; energyClass: DpeClass; climateClass: DpeClass }
  | { kind: "blank" }
  | { kind: "exempt" }
  | { kind: "missing" };

const BLANK_PATTERN = /^(vi|vierge|blank|dpe.?vierge|non.?(communiqu|renseign))/i;
const EXEMPT_PATTERN = /^(ns|non.?soumis|exempt|not.?applicable|n\/a|na)$/i;

/**
 * Interprète la paire (classe énergie, classe climat) de SweepBright. Un DPE
 * « vierge » ou un bien « non soumis » reçoit un texte dédié à la place des
 * échelles ; une classe absente est bloquante.
 */
export const resolveDpeStatus = (energyLabel: unknown, climateLabel: unknown): DpeStatus => {
  const energy = typeof energyLabel === "string" ? energyLabel.trim() : "";
  const climate = typeof climateLabel === "string" ? climateLabel.trim() : "";
  if (EXEMPT_PATTERN.test(energy)) return { kind: "exempt" };
  if (BLANK_PATTERN.test(energy)) return { kind: "blank" };
  const energyClass = toDpeClass(energy);
  const climateClass = toDpeClass(climate);
  if (energyClass && climateClass) return { kind: "scales", energyClass, climateClass };
  return { kind: "missing" };
};

/**
 * Mentions réglementaires des annonces (CCH art. R126-21 à R126-24 ; arrêté
 * du 22 décembre 2021 pour les classes F et G ; code de l'environnement
 * art. L125-5 pour Géorisques). Libellés repris mot pour mot : la DGCCRF les
 * contrôle, et leur taille doit être au moins celle du texte courant de
 * l'annonce.
 */
export const dpeClassesSentence = (energyClass: DpeClass, climateClass: DpeClass) =>
  `CLASSE ÉNERGIE : ${energyClass} · CLASSE CLIMAT : ${climateClass}.`;
export const dpeExcessiveSentence = (energyClass: DpeClass) =>
  `Logement à consommation énergétique excessive : classe ${energyClass}.`;
export const GEORISQUES_SENTENCE =
  "Les informations sur les risques auxquels ce bien est exposé sont disponibles sur le site Géorisques : www.georisques.gouv.fr";
export const DPE_BLANK_SENTENCE =
  "DPE vierge : diagnostic de performance énergétique réalisé sans estimation des consommations.";
export const DPE_EXEMPT_SENTENCE = "Non soumis au DPE.";
