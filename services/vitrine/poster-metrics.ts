import "server-only";
import path from "node:path";
import { openSync, type FontkitFont } from "fontkit";

/**
 * Mesure de texte avec les polices embarquées de l'affiche (les mêmes
 * fichiers que ceux enregistrés dans react-pdf), pour décider d'un placement
 * avant le rendu — par exemple la valeur DPE, dehors ou dans la flèche.
 */
export type PosterFontFace = "sans-bold";

const FONT_DIR = path.join(process.cwd(), "assets", "vitrine", "fonts");
const FONT_FILES: Record<PosterFontFace, string> = {
  "sans-bold": "Montserrat-Bold.ttf",
};

const cache = new Map<PosterFontFace, FontkitFont>();

const loadFont = (face: PosterFontFace): FontkitFont => {
  const cached = cache.get(face);
  if (cached) return cached;
  const font = openSync(path.join(FONT_DIR, FONT_FILES[face]));
  cache.set(face, font);
  return font;
};

/** Largeur d'avance du texte (pt) à la taille donnée, sans interlettrage. */
export const measurePosterText = (face: PosterFontFace, text: string, size: number): number => {
  const font = loadFont(face);
  return (font.layout(text).advanceWidth / font.unitsPerEm) * size;
};
