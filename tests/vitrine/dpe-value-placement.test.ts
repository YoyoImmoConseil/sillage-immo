import { describe, expect, it } from "vitest";
import { DPE_BAR_WIDTHS, DPE_CLASSES, resolveDpeValuePlacement, type DpeClass } from "@/lib/vitrine/dpe";
import { DPE_COLUMN_RIGHT, DPE_SCALE } from "@/lib/vitrine/poster-layout";

// Largeurs mesurées avec Montserrat Bold (fontkit) à 13,5 pt : « 157 kWh/m²/an »
// 105,6 pt, « 282 kWh/m²/an » 108,9, « 1 024 kWh/m²/an » 119,4, « 34 kg CO₂/m²/an »
// 116,0, « 61 kg CO₂/m²/an » 112,5. Le test fige des largeurs proportionnelles au
// corps pour ne pas dépendre du fichier de police.
const measureFor = (widthAt13_5: number) => (size: number) => (widthAt13_5 * size) / DPE_SCALE.valueSize;

const place = (dpeClass: DpeClass, column: "energy" | "climate", widthAt13_5: number) =>
  resolveDpeValuePlacement({
    barLeft: column === "energy" ? DPE_SCALE.energyX : DPE_SCALE.climateX,
    barWidth: DPE_BAR_WIDTHS[dpeClass],
    tip: DPE_SCALE.tip,
    outline: DPE_SCALE.selectedOutline,
    gap: DPE_SCALE.valueGap,
    columnRight: DPE_COLUMN_RIGHT[column],
    letterWidth: DPE_SCALE.letterInset + DPE_SCALE.letterWidth,
    insidePadding: DPE_SCALE.insidePadding,
    fontSize: DPE_SCALE.valueSize,
    minFontSize: DPE_SCALE.valueMinSize,
    measure: measureFor(widthAt13_5),
  });

describe("resolveDpeValuePlacement — valeur dehors jusqu'en D, dans la flèche dès E", () => {
  it("énergie : A à D dehors (V2), E à G dans la flèche, corps 13,5 conservé", () => {
    for (const dpeClass of ["A", "B", "C", "D"] as const) {
      expect(place(dpeClass, "energy", 108.9), dpeClass).toEqual({ mode: "outside", fontSize: 13.5 });
    }
    for (const dpeClass of ["E", "F", "G"] as const) {
      expect(place(dpeClass, "energy", 108.9), dpeClass).toEqual({ mode: "inside", fontSize: 13.5 });
    }
  });

  it("climat : même règle, avec la colonne bornée par le cadre QR", () => {
    for (const dpeClass of ["A", "B", "C", "D"] as const) {
      expect(place(dpeClass, "climate", 116), dpeClass).toEqual({ mode: "outside", fontSize: 13.5 });
    }
    for (const dpeClass of ["E", "F", "G"] as const) {
      expect(place(dpeClass, "climate", 112.5), dpeClass).toEqual({ mode: "inside", fontSize: 13.5 });
    }
  });

  it("valeur à quatre chiffres en D : ne tient plus dehors, passe dans la flèche", () => {
    // « 1 024 kWh/m²/an » 119,4 pt : 427,5 + 148 + 2,5 + 11 + 119,4 = 708,4 > 703,5.
    // Dans la flèche D : 148 − 9 − 4 − 15,5 = 119,5 pt utiles → tient à 13,5 pt.
    expect(place("D", "energy", 119.4)).toEqual({ mode: "inside", fontSize: 13.5 });
    // Un peu plus large : réduite par pas de 0,5 pt jusqu'à tenir.
    expect(place("D", "energy", 126)).toEqual({ mode: "inside", fontSize: 12.5 });
  });

  it("ne descend jamais sous le corps minimal", () => {
    const result = place("E", "energy", 400);
    expect(result.mode).toBe("inside");
    expect(result.fontSize).toBe(DPE_SCALE.valueMinSize);
  });

  it("les flèches restent celles de la V2", () => {
    expect(DPE_CLASSES.map((c) => DPE_BAR_WIDTHS[c])).toEqual([71, 97, 123, 148, 174, 200, 225]);
  });
});
