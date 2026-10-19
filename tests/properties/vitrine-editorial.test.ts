import { describe, expect, it } from "vitest";
import {
  deriveVitrineQuartierFromTitle,
  normalizeVitrineHighlights,
  normalizeVitrineQuartier,
  validateVitrineHighlights,
  validateVitrineQuartier,
} from "@/lib/properties/vitrine-editorial";

describe("normalizeVitrineHighlights", () => {
  it("accepte un tableau ou un texte multi-lignes, trim et ignore les vides", () => {
    expect(normalizeVitrineHighlights(["  Vue mer  ", "", "Terrasse   plein sud", "   "])).toEqual([
      "Vue mer",
      "Terrasse plein sud",
    ]);
    expect(normalizeVitrineHighlights("Vue mer\r\n\r\nCave et parking\n")).toEqual([
      "Vue mer",
      "Cave et parking",
    ]);
  });

  it("ignore les entrées non textuelles", () => {
    expect(normalizeVitrineHighlights([1, null, "Calme absolu", { a: 1 }])).toEqual(["Calme absolu"]);
    expect(normalizeVitrineHighlights(undefined)).toEqual([]);
  });
});

describe("validateVitrineHighlights", () => {
  it("exige entre 3 et 5 lignes", () => {
    expect(validateVitrineHighlights(["a", "b"]).errors).toHaveLength(1);
    expect(validateVitrineHighlights(["a", "b", "c"]).errors).toHaveLength(0);
    expect(validateVitrineHighlights(["a", "b", "c", "d", "e"]).errors).toHaveLength(0);
    expect(validateVitrineHighlights(["a", "b", "c", "d", "e", "f"]).errors).toHaveLength(1);
  });

  it("accepte la liste vide uniquement avec allowEmpty (effacement)", () => {
    expect(validateVitrineHighlights([]).errors).toHaveLength(1);
    expect(validateVitrineHighlights([], { allowEmpty: true }).errors).toHaveLength(0);
  });

  it("refuse les lignes de plus de 28 caractères, comptées en points de code", () => {
    const exact = "Terrasse plein sud de 25 m²"; // 27 caractères
    const long = "Terrasse plein sud de 25 m² !!"; // 30 caractères
    expect(validateVitrineHighlights([exact, "b", "c"]).errors).toHaveLength(0);
    const { errors } = validateVitrineHighlights([long, "b", "c"]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/Ligne 1 : 30 caractères/);
  });
});

describe("quartier", () => {
  it("normalise et borne le quartier", () => {
    expect(normalizeVitrineQuartier("  Église   Russe ")).toBe("Église Russe");
    expect(normalizeVitrineQuartier("   ")).toBeNull();
    expect(normalizeVitrineQuartier(42)).toBeNull();
    expect(validateVitrineQuartier("x".repeat(41))).toHaveLength(1);
    expect(validateVitrineQuartier(null)).toHaveLength(0);
  });

  it("pré-remplit le quartier depuis les titres SweepBright réels", () => {
    expect(deriveVitrineQuartierFromTitle("NICE – EGLISE RUSSE 2 PIÈCES AVEC BALCON – 4e ÉTAGE – ASCENSEUR – CAVE")).toBe("Eglise Russe");
    expect(deriveVitrineQuartierFromTitle("NICE SAINT-AUGUSTIN – 2 PIÈCES VUE MER – AVANT-DERNIER ÉTAGE")).toBe("Saint-Augustin");
    expect(deriveVitrineQuartierFromTitle("NICE MUSICIENS – SUPERBE 5 PIÈCES BELLE ÉPOQUE – PARKING")).toBe("Musiciens");
    expect(deriveVitrineQuartierFromTitle("Nice – Palais des Expositions | 3 pièces vendu loué – Investissement locatif")).toBe("Palais des Expositions");
    expect(deriveVitrineQuartierFromTitle("NICE – AVENUE PAUL ARÈNE – Studio lumineux de 21,40 m²")).toBe("Avenue Paul Arène");
    expect(deriveVitrineQuartierFromTitle("NICE MONT-ALBAN – 3 PIÈCES 89 M² – VUE MER")).toBe("Mont-Alban");
    expect(deriveVitrineQuartierFromTitle("NICE CENTRE – 3 PIÈCES À RÉNOVER")).toBe("Centre");
    expect(deriveVitrineQuartierFromTitle("Mont Boron - Appartement vue mer")).toBe("Mont Boron");
  });

  it("ne propose rien quand le titre ne contient pas de quartier", () => {
    expect(deriveVitrineQuartierFromTitle("Appartement 3 pièces vue mer")).toBeNull();
    expect(deriveVitrineQuartierFromTitle("NICE – 2 PIÈCES RÉNOVÉ – BALCON")).toBeNull();
    expect(deriveVitrineQuartierFromTitle("NICE – Studio lumineux")).toBeNull();
    expect(deriveVitrineQuartierFromTitle(null)).toBeNull();
    expect(deriveVitrineQuartierFromTitle("")).toBeNull();
  });
});
