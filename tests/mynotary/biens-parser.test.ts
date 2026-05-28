import { describe, expect, it } from "vitest";
import {
  isEntrySigned,
  parseAddressFromBiens,
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
