import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { measurePosterText } from "@/services/vitrine/poster-metrics";

describe("measurePosterText — Montserrat Bold embarquée", () => {
  it("mesure les valeurs DPE à 13,5 pt dans les ordres de grandeur attendus", () => {
    const energy = measurePosterText("sans-bold", "282\u00a0kWh/m²/an", 13.5);
    const climate = measurePosterText("sans-bold", "61\u00a0kg CO₂/m²/an", 13.5);
    expect(energy).toBeGreaterThan(95);
    expect(energy).toBeLessThan(125);
    expect(climate).toBeGreaterThan(100);
    expect(climate).toBeLessThan(130);
    // Proportionnel au corps.
    expect(measurePosterText("sans-bold", "282\u00a0kWh/m²/an", 27)).toBeCloseTo(energy * 2, 6);
  });

  it("les glyphes utilisés (², ₂, espace insécable) existent dans la police", () => {
    const notdef = measurePosterText("sans-bold", "\uFFFF", 10);
    for (const glyph of ["²", "₂", "\u00a0", "/"]) {
      expect(measurePosterText("sans-bold", glyph, 10), glyph).not.toBe(notdef);
    }
  });
});
