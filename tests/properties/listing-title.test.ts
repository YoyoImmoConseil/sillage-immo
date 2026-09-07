import { describe, expect, it } from "vitest";
import { humanizeListingTitle } from "@/lib/properties/listing-title";

describe("humanizeListingTitle", () => {
  it("repasse un titre tout en capitales en casse normale avec les noms propres", () => {
    expect(
      humanizeListingTitle("NICE MUSICIENS – SUPERBE 5 PIÈCES BELLE ÉPOQUE – PARKING – BALCON")
    ).toBe("Nice Musiciens – Superbe 5 pièces Belle Époque – Parking – Balcon");
  });

  it("gère m², les quartiers composés et la vue mer", () => {
    expect(
      humanizeListingTitle("NICE MONT-ALBAN – 3 PIÈCES 89 M² – VUE MER – TERRASSE 13,5 M² – GARAGE")
    ).toBe("Nice Mont-Alban – 3 pièces 89 m² – Vue mer – Terrasse 13,5 m² – Garage");
  });

  it("laisse intact un titre déjà en casse mixte", () => {
    const title = "Nice – Palais des Expositions | 3 pièces vendu loué – Investissement locatif";
    expect(humanizeListingTitle(title)).toBe(title);
  });

  it("renvoie null sans titre", () => {
    expect(humanizeListingTitle(null)).toBeNull();
  });
});
