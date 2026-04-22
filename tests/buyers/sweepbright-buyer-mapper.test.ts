import { describe, expect, it } from "vitest";
import { mapBuyerSearchProfileToSweepBrightPreferences } from "@/services/buyers/sweepbright-buyer-mapper";
import type { BuyerSearchProfileSnapshot } from "@/types/domain/buyers";

const baseProfile: BuyerSearchProfileSnapshot = {
  id: "profile-1",
  buyerLeadId: "lead-1",
  businessType: "sale",
  status: "active",
  locationText: null,
  cities: [],
  propertyTypes: [],
  budgetMin: null,
  budgetMax: null,
  roomsMin: null,
  roomsMax: null,
  bedroomsMin: null,
  livingAreaMin: null,
  livingAreaMax: null,
  floorMin: null,
  floorMax: null,
  requiresTerrace: null,
  requiresElevator: null,
  criteria: {},
};

describe("mapBuyerSearchProfileToSweepBrightPreferences", () => {
  it("defaults negotiation to 'sale' for purchase searches and omits empty fields", () => {
    const result = mapBuyerSearchProfileToSweepBrightPreferences(baseProfile);
    expect(result.preferences).toEqual({ negotiation: "sale" });
    expect(result.locationPreference).toBeUndefined();
  });

  it("maps rental searches to negotiation 'let'", () => {
    const result = mapBuyerSearchProfileToSweepBrightPreferences({
      ...baseProfile,
      businessType: "rental",
    });
    expect(result.preferences.negotiation).toBe("let");
  });

  it("includes property types, budget, rooms, bedrooms, area and floor ranges", () => {
    const result = mapBuyerSearchProfileToSweepBrightPreferences({
      ...baseProfile,
      propertyTypes: ["apartment", "house"],
      budgetMin: 200_000,
      budgetMax: 450_000,
      roomsMin: 2,
      roomsMax: 4,
      bedroomsMin: 1,
      livingAreaMin: 50,
      livingAreaMax: 120,
      floorMin: 1,
      floorMax: 6,
    });

    expect(result.preferences).toEqual({
      negotiation: "sale",
      property_types: ["apartment", "house"],
      price: { min: 200_000, max: 450_000 },
      rooms: { min: 2, max: 4 },
      bedrooms: { min: 1 },
      living_area: { min: 50, max: 120 },
      floor: { min: 1, max: 6 },
    });
  });

  it("emits features list only when requirements are true", () => {
    const noneRequired = mapBuyerSearchProfileToSweepBrightPreferences(baseProfile);
    expect(noneRequired.preferences.features).toBeUndefined();

    const terraceOnly = mapBuyerSearchProfileToSweepBrightPreferences({
      ...baseProfile,
      requiresTerrace: true,
      requiresElevator: false,
    });
    expect(terraceOnly.preferences.features).toEqual(["terrace"]);

    const both = mapBuyerSearchProfileToSweepBrightPreferences({
      ...baseProfile,
      requiresTerrace: true,
      requiresElevator: true,
    });
    expect(both.preferences.features).toEqual(["terrace", "elevator"]);
  });

  it("builds locationPreference from cities and falls back to locationText", () => {
    const withCities = mapBuyerSearchProfileToSweepBrightPreferences({
      ...baseProfile,
      cities: ["Nice", "Cannes"],
      locationText: "Côte d'Azur",
    });
    expect(withCities.locationPreference).toEqual({
      cities: ["Nice", "Cannes"],
      note: "Côte d'Azur",
    });

    const textOnly = mapBuyerSearchProfileToSweepBrightPreferences({
      ...baseProfile,
      locationText: "Arrière-pays niçois",
    });
    expect(textOnly.locationPreference).toEqual({ note: "Arrière-pays niçois" });
  });

  it("supports partial ranges where only min or max is set", () => {
    const minOnly = mapBuyerSearchProfileToSweepBrightPreferences({
      ...baseProfile,
      budgetMin: 300_000,
      livingAreaMax: 80,
    });
    expect(minOnly.preferences.price).toEqual({ min: 300_000 });
    expect(minOnly.preferences.living_area).toEqual({ max: 80 });
  });
});
