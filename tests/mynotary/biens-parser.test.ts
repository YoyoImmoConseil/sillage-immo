import { describe, expect, it } from "vitest";
import { parseAddressFromBiens } from "@/lib/mynotary/register-entry-parsers";

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
