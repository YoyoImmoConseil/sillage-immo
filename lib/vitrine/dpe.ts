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

export const DPE_EXCESSIVE_SENTENCE = "Logement à consommation énergétique excessive.";
export const GEORISQUES_SENTENCE =
  "Informations sur les risques auxquels ce bien est exposé : www.georisques.gouv.fr";
export const DPE_BLANK_SENTENCE =
  "Diagnostic de performance énergétique vierge : consommations non exploitables.";
export const DPE_EXEMPT_SENTENCE = "Bien non soumis au diagnostic de performance énergétique.";
