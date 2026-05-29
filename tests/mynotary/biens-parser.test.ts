import { describe, expect, it } from "vitest";
import {
  isEntrySigned,
  parseAddressFromBiens,
  parseAddressFromOperationLabel,
  parseSellerNamesFromMandants,
} from "@/lib/mynotary/register-entry-parsers";

describe("parseAddressFromBiens", () => {
  it("strips the 'Typologie :' prefix", () => {
    expect(
      parseAddressFromBiens(
        "Typologie : Appartement - 52 Avenue de la Californie, Nice (06200), France"
      )
    ).toBe("52 Avenue de la Californie, Nice (06200), France");
  });

  it("strips the 'Type :' prefix with an em dash", () => {
    expect(
      parseAddressFromBiens("Type : Maison — 12 Rue Foo, Paris (75009), France")
    ).toBe("12 Rue Foo, Paris (75009), France");
  });

  it("takes only the first non-empty line on multi-property mandates", () => {
    const input =
      "Typologie : Appartement - 1 Rue A, Nice (06000), France\nTypologie : Garage - 2 Rue B, Nice (06000), France";
    expect(parseAddressFromBiens(input)).toBe("1 Rue A, Nice (06000), France");
  });

  it("returns the raw line when no Typologie prefix is present", () => {
    expect(parseAddressFromBiens("21 Rue Fontaine, Nice (06300), France")).toBe(
      "21 Rue Fontaine, Nice (06300), France"
    );
  });

  it("rejects values without any digit (street number / postal code)", () => {
    expect(parseAddressFromBiens("Typologie : Appartement")).toBeNull();
    expect(parseAddressFromBiens("Appartement")).toBeNull();
  });

  it("returns null on empty / nullish input", () => {
    expect(parseAddressFromBiens(null)).toBeNull();
    expect(parseAddressFromBiens(undefined)).toBeNull();
    expect(parseAddressFromBiens("")).toBeNull();
    expect(parseAddressFromBiens("   \n  ")).toBeNull();
  });
});

describe("isEntrySigned", () => {
  it("treats VALIDATED entries as signed", () => {
    expect(
      isEntrySigned({
        status: "VALIDATED",
        observations:
          "Date de lancement de la signature du mandat : 26/03/2026\nDate de signature du mandat : 07/04/2026",
      })
    ).toBe(true);
  });

  it("treats RESERVED entries without confirmed signature as not signed", () => {
    expect(
      isEntrySigned({
        status: "RESERVED",
        observations:
          "Date de lancement de la signature du mandat : 27/05/2026",
      })
    ).toBe(false);
  });

  it("treats RESERVED entries with an explicit signature date as signed (defensive)", () => {
    expect(
      isEntrySigned({
        status: "RESERVED",
        observations:
          "Date de lancement de la signature du mandat : 27/05/2026\nDate de signature du mandat : 28/05/2026",
      })
    ).toBe(true);
  });

  it("treats CLOSED entries as not signed unless observations confirm a signature", () => {
    expect(
      isEntrySigned({
        status: "CLOSED",
        observations: "",
      })
    ).toBe(false);
  });

  it("treats entries without a status as not signed", () => {
    expect(isEntrySigned({})).toBe(false);
  });
});

describe("parseSellerNamesFromMandants", () => {
  it("extracts two mandants and strips civilities + addresses", () => {
    const input =
      "Monsieur LEVI Mickaël Roland - 81 Rue Saint-Lazare, Paris (75009), France\n" +
      "Madame UZZAN Vanessa Ketty - 81 Rue Saint-Lazare, Paris (75009), France";
    expect(parseSellerNamesFromMandants(input)).toEqual([
      "LEVI Mickaël Roland",
      "UZZAN Vanessa Ketty",
    ]);
  });

  it("strips legal-form prefixes (SCI / SAS / SARL)", () => {
    const input = "Autre, SCI NONO - 8 Impasse Jean Mermoz, CAGNES-SUR-MER (06800)";
    // "Autre, " is a tag MyNotary puts before legal entities. We don't
    // model it explicitly, but the parser must NOT keep the leading
    // "Autre," fragment either — it should leave the SCI name visible.
    const out = parseSellerNamesFromMandants(input);
    expect(out.length).toBe(1);
    expect(out[0]).toContain("SCI NONO");
  });

  it("supports the em-dash separator between name and address", () => {
    expect(
      parseSellerNamesFromMandants("Monsieur DUTTO Julien — 12 Rue X, Nice")
    ).toEqual(["DUTTO Julien"]);
  });

  it("dedupes identical mandants", () => {
    const input =
      "Monsieur LEVI Mickaël - addr1\nMonsieur LEVI Mickaël - addr2";
    expect(parseSellerNamesFromMandants(input)).toEqual(["LEVI Mickaël"]);
  });

  it("returns an empty list on empty / nullish input", () => {
    expect(parseSellerNamesFromMandants(null)).toEqual([]);
    expect(parseSellerNamesFromMandants(undefined)).toEqual([]);
    expect(parseSellerNamesFromMandants("")).toEqual([]);
    expect(parseSellerNamesFromMandants("   \n  ")).toEqual([]);
  });
});

describe("parseAddressFromOperationLabel", () => {
  it("extracts the address from a simple operation label", () => {
    const out = parseAddressFromOperationLabel(
      "8 Boulevard de Riquier, Nice (06300), FranceNom vendeurNom acquéreur"
    );
    expect(out).toContain("8 Boulevard de Riquier");
    expect(out).toContain("Nice");
    expect(out).toContain("France");
    expect(out).not.toContain("vendeur");
  });

  it("strips a leading register-number prefix", () => {
    const out = parseAddressFromOperationLabel(
      "N°169 / 2 Boulevard Jean-Baptiste Vérany, Nice, France (06300) / SCI NONO / Nom acquéreur"
    );
    expect(out).toContain("2 Boulevard Jean-Baptiste Vérany");
    expect(out).toContain("France");
    expect(out).not.toContain("SCI NONO");
  });

  it("returns null when there is no plausible address", () => {
    expect(parseAddressFromOperationLabel("Nom vendeurNom acquéreur")).toBeNull();
    expect(parseAddressFromOperationLabel(null)).toBeNull();
    expect(parseAddressFromOperationLabel("")).toBeNull();
  });
});
