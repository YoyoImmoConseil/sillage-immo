/**
 * Fiche vitrine — repère de l'affiche A3 paysage, en points PDF (1/72 pouce),
 * mesuré sur la V2 Canva (1190,55 × 841,89 pt ; les cotes du brief en pixels
 * à 96 dpi se divisent par 4/3).
 */

export const PAGE = { width: 1190.55, height: 841.89 } as const;

export const COLORS = {
  navy: "#141446",
  sand: "#F4ECE4",
  white: "#FFFFFF",
} as const;

export const FONTS = {
  serif: "Playfair Display",
  sans: "Montserrat",
  text: "Hanken Grotesk",
} as const;

/** Carte marine à gauche. */
export const CARD = { x: 30, y: 30, w: 352.5, h: 754.5, inset: 14.5 } as const;
export const CARD_PHOTO = { x: 44.5, y: 44.5, w: 323.5, h: 218 } as const;
export const CARD_CENTER_X = CARD.x + CARD.w / 2;
export const CARD_TEXT_WIDTH = 300;

/** Photo principale à droite. */
export const MAIN_PHOTO = { x: 408.75, y: 30, w: 751.5, h: 534 } as const;
export const REFERENCE_TOP = 566;

/** Bloc DPE (sable) et bloc QR (marine). */
// Blocs allongés de 5 pt par rapport à la V2 (206 → 211) : les mentions
// réglementaires passent en 12 pt (taille du texte courant), les flèches DPE
// sont légèrement resserrées.
export const DPE_BLOCK = { x: 409.5, y: 579, w: 576, h: 211 } as const;
export const QR_BLOCK = { x: 997.5, y: 579, w: 163, h: 211 } as const;
export const QR_FRAME = { size: 99, padding: 7.5, top: 588 } as const;
export const QR_CAPTION_TOP = 694;
export const LOGO = { width: 80, top: 708 } as const;

export const DPE_TITLE_TOP = 586;
export const DPE_SCALE_LABEL_TOP = 601;
export const DPE_SCALE = {
  energyX: 427.5,
  climateX: 709.5,
  firstBarTop: 613,
  pitch: 15,
  barHeight: 13,
  tip: 9,
  letterInset: 4.5,
  valueGap: 11,
  selectedOutline: 2.5,
} as const;
/** Mentions réglementaires : 12 pt, comme le texte courant de la carte. */
export const DPE_TEXT = { x: 427.5, top: 720, width: 546, size: 12, lineHeight: 13.2 } as const;

export const FOOTER = { x: 35, top: 797, width: 1120 } as const;

/** Rythme vertical de la carte (hauts de glyphes mesurés sur la V2). */
export const CARD_RHYTHM = {
  headlineTop: 287,
  dots1Top: 334.5,
  typeTop: 350,
  locationTop: 375,
  dots2Top: 406,
  priceTop: 431,
  legalTop: 488,
  legalPitch: 17.5,
  dots3GapAfterLegal: 33,
  highlightsGapAfterDots: 17,
  highlightsPitch: 22,
  characteristicsGapAfterHighlights: 37,
  characteristicsPitch: 18,
} as const;

export const DOTS = { count: 15, size: 2.4, gap: 6, width: 86 } as const;
