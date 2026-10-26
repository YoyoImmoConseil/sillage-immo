// Déclaration minimale de fontkit (dépendance de @react-pdf/renderer, sans
// typage livré) : juste ce qu'utilise services/vitrine/poster-metrics.ts.
declare module "fontkit" {
  export interface FontkitGlyphRun {
    advanceWidth: number;
  }
  export interface FontkitFont {
    unitsPerEm: number;
    capHeight: number;
    ascent: number;
    descent: number;
    layout(text: string): FontkitGlyphRun;
  }
  export function openSync(path: string): FontkitFont;
}
