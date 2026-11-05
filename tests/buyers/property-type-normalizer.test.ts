import { describe, expect, it } from "vitest";

import { normalizeBuyerPropertyTypes, toCanonicalBuyerPropertyTypes } from "@/lib/buyers/property-type-normalizer";

describe("normalizeBuyerPropertyTypes", () => {
  it("garde les types canoniques tels quels", () => {
    expect(toCanonicalBuyerPropertyTypes(["apartment", "house"])).toEqual(["apartment", "house"]);
    expect(toCanonicalBuyerPropertyTypes(["Apartment ", "VILLA"])).toEqual(["apartment", "villa"]);
  });
  it("traduit les paires de booléens Zapier", () => {
    expect(toCanonicalBuyerPropertyTypes(["TrueFalse"])).toEqual(["apartment"]);
    expect(toCanonicalBuyerPropertyTypes(["FalseTrue"])).toEqual(["house"]);
    expect(toCanonicalBuyerPropertyTypes(["TrueTrue"])).toEqual(["apartment", "house"]);
    expect(normalizeBuyerPropertyTypes(["FalseFalse"])).toEqual({ propertyTypes: [], roomsHint: null, unrecognized: [] });
  });
  it("lit les libellés libres et les pièces", () => {
    expect(normalizeBuyerPropertyTypes(["T3"])).toEqual({ propertyTypes: ["apartment"], roomsHint: 3, unrecognized: [] });
    expect(normalizeBuyerPropertyTypes(["2 piece"])).toEqual({ propertyTypes: ["apartment"], roomsHint: 2, unrecognized: [] });
    expect(normalizeBuyerPropertyTypes(["Appartement"])).toEqual({ propertyTypes: ["apartment"], roomsHint: null, unrecognized: [] });
    expect(normalizeBuyerPropertyTypes(["TrueFalse appartement T3"])).toEqual({ propertyTypes: ["apartment"], roomsHint: 3, unrecognized: [] });
    expect(normalizeBuyerPropertyTypes(["Maison avec piscine"])).toEqual({ propertyTypes: ["house"], roomsHint: null, unrecognized: [] });
  });
  it("classe les parkings en « other » et signale l'inconnu", () => {
    expect(normalizeBuyerPropertyTypes(["Parking box"])).toEqual({ propertyTypes: ["other"], roomsHint: null, unrecognized: [] });
    expect(normalizeBuyerPropertyTypes(["n'importe quoi"])).toEqual({ propertyTypes: [], roomsHint: null, unrecognized: ["n'importe quoi"] });
  });
  it("dédoublonne et ignore le vide", () => {
    expect(toCanonicalBuyerPropertyTypes(["TrueFalse", "apartment", "", "  "])).toEqual(["apartment"]);
  });
});
