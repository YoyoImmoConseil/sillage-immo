import { describe, expect, it } from "vitest";
import {
  buildPortalWelcomeSummaryLines,
  pickFirstName,
} from "@/lib/client-space/portal-welcome-summary";

describe("pickFirstName", () => {
  it("prend le prénom, sinon le premier mot du nom complet", () => {
    expect(pickFirstName({ firstName: "Laura", fullName: "Laura Pfauwadel" })).toBe("Laura");
    expect(pickFirstName({ firstName: null, fullName: "Jean Dupont" })).toBe("Jean");
  });

  it("nettoie les capitales des imports et les « N/A »", () => {
    expect(pickFirstName({ firstName: "FLORENTINA", fullName: null })).toBe("Florentina");
    expect(pickFirstName({ firstName: "jean-pierre", fullName: null })).toBe("Jean-Pierre");
    expect(pickFirstName({ firstName: "N/A", fullName: "N/A" })).toBeNull();
    expect(pickFirstName({ firstName: "", fullName: "  " })).toBeNull();
  });
});

describe("buildPortalWelcomeSummaryLines", () => {
  it("résume une recherche de location", () => {
    expect(
      buildPortalWelcomeSummaryLines({
        firstName: "Florentina",
        seller: null,
        search: {
          businessType: "rental",
          cities: ["Nice", "Villefranche-sur-Mer"],
          propertyTypes: ["apartment"],
          budgetMin: null,
          budgetMax: 1365,
          roomsMin: 2,
          bedroomsMin: null,
          livingAreaMin: null,
        },
      })
    ).toEqual([
      "Location · Appartement",
      "Secteur : Nice, Villefranche-sur-Mer",
      "Budget : jusqu'à 1\u00a0365 €/mois",
      "2 pièces min.",
    ]);
  });

  it("résume une recherche d'achat avec fourchette", () => {
    expect(
      buildPortalWelcomeSummaryLines({
        firstName: null,
        seller: null,
        search: {
          businessType: "sale",
          cities: ["Nice"],
          propertyTypes: ["apartment", "house"],
          budgetMin: 250000,
          budgetMax: 300000,
          roomsMin: null,
          bedroomsMin: 1,
          livingAreaMin: 50,
        },
      })
    ).toEqual([
      "Achat · Appartement ou maison",
      "Secteur : Nice",
      "Budget : de 250\u00a0000 à 300\u00a0000 €",
      "1 chambre min. · 50 m² min.",
    ]);
  });

  it("résume un projet de vente", () => {
    expect(
      buildPortalWelcomeSummaryLines({
        firstName: "Paul",
        search: null,
        seller: {
          propertyType: "appartement",
          propertyAddress: "12 rue Arson",
          city: "Nice",
          postalCode: "06300",
        },
      })
    ).toEqual(["Vente · Appartement à 06300 Nice", "12 rue Arson"]);
  });

  it("ne dit rien quand on ne sait rien", () => {
    expect(buildPortalWelcomeSummaryLines({ firstName: null, search: null, seller: null })).toEqual([]);
  });
});
