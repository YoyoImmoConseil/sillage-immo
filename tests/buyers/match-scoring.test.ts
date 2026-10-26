import { describe, expect, it } from "vitest";
import {
  ALERT_SCORE_THRESHOLD,
  buildMatchScore,
  isAlertConsentSource,
  isLeadEligibleForAlerts,
  isMatchRetained,
  MATCH_MAX_SCORE,
  MATCH_MIN_SCORE,
  MATCH_POINTS,
  type MatchListingFacts,
  type MatchProfileCriteria,
} from "@/lib/buyers/match-scoring";

/** Musiciens tel qu'en base le 26/10/2026. */
const musiciens: MatchListingFacts = {
  business_type: "sale",
  property_type: "apartment",
  city: "Nice",
  price_amount: 635000,
  rooms: 5,
  bedrooms: 4,
  living_area: 120.65,
  floor: 1,
  has_terrace: false,
  has_elevator: null,
};

const profile = (overrides: Partial<MatchProfileCriteria> = {}): MatchProfileCriteria => ({
  business_type: "sale",
  property_types: [],
  cities: [],
  budget_min: null,
  budget_max: null,
  rooms_min: null,
  rooms_max: null,
  bedrooms_min: null,
  living_area_min: null,
  living_area_max: null,
  floor_min: null,
  floor_max: null,
  requires_terrace: null,
  requires_elevator: null,
  ...overrides,
});

describe("grille de correspondance (26/10/2026)", () => {
  it("seuil unique 65 : conservé = affiché = alerté ; maximum 120", () => {
    expect(MATCH_MIN_SCORE).toBe(65);
    expect(ALERT_SCORE_THRESHOLD).toBe(65);
    expect(MATCH_MAX_SCORE).toBe(120);
  });

  it("Lenara (achat, Nice, 500–670 k€) : 70 points, conservée et alertée", () => {
    const evaluation = buildMatchScore(profile({ cities: ["Nice"], budget_min: 500000, budget_max: 670000 }), musiciens);
    expect(evaluation.blockers).toEqual([]);
    expect(evaluation.score).toBe(70);
    expect(isMatchRetained(evaluation)).toBe(true);
  });

  it("recherche vide (transaction seule) : 25 points, jamais listée", () => {
    const evaluation = buildMatchScore(profile(), musiciens);
    expect(evaluation.score).toBe(MATCH_POINTS.businessType);
    expect(evaluation.blockers).toEqual([]);
    expect(isMatchRetained(evaluation)).toBe(false);
  });

  it("ville + budget max suffisent tout juste (65) ; sans ville il faut pièces et surface", () => {
    expect(buildMatchScore(profile({ cities: ["nice"], budget_max: 700000 }), musiciens).score).toBe(65);
    const noCity = buildMatchScore(profile({ budget_max: 700000, rooms_min: 4, living_area_min: 100 }), musiciens);
    expect(noCity.score).toBe(65);
    expect(buildMatchScore(profile({ budget_max: 700000, rooms_min: 4 }), musiciens).score).toBe(55);
  });

  it("un critère non renseigné vaut 0 et ne bloque jamais ; achat / location différent bloque", () => {
    const rental = buildMatchScore(profile({ business_type: "rental", cities: ["Nice"] }), musiciens);
    expect(rental.blockers).toContain("business_type");
    expect(isMatchRetained(rental)).toBe(false);
  });

  it("budget max : 10 % de tolérance, bloquant au-delà", () => {
    // 635 000 ≤ 580 000 × 1,10 = 638 000 → passe, marqué « tolerance ».
    const tolerated = buildMatchScore(profile({ cities: ["Nice"], budget_max: 580000 }), musiciens);
    expect(tolerated.blockers).toEqual([]);
    expect(tolerated.score).toBe(65);
    expect(tolerated.matchedCriteria.budgetMax).toBe("tolerance");
    // 635 000 > 570 000 × 1,10 = 627 000 → bloque.
    const blocked = buildMatchScore(profile({ cities: ["Nice"], budget_max: 570000 }), musiciens);
    expect(blocked.blockers).toContain("budget_max");
  });

  it("budget min : 5 points au-dessus, 0 jusqu'à −30 %, écarté au-delà ; chambres min : jamais bloquant", () => {
    // 635 000 ≥ 700 000 × 0,7 = 490 000 : sous le minimum mais dans la marge → 0 point, pas de blocage.
    const within = buildMatchScore(profile({ cities: ["Nice"], budget_max: 800000, budget_min: 700000, bedrooms_min: 6 }), musiciens);
    expect(within.blockers).toEqual([]);
    expect(within.score).toBe(65);
    // 635 000 < 950 000 × 0,7 = 665 000 → écarté.
    const far = buildMatchScore(profile({ cities: ["Nice"], budget_max: 1000000, budget_min: 950000 }), musiciens);
    expect(far.blockers).toContain("budget_min_floor");
    const met = buildMatchScore(profile({ cities: ["Nice"], budget_max: 700000, budget_min: 600000, bedrooms_min: 3 }), musiciens);
    expect(met.score).toBe(75);
  });

  it("Lenara (500–670 k€) ne reçoit pas un 2 pièces à 195 k€ : 195 000 < 350 000", () => {
    const egliseRusse = { ...musiciens, price_amount: 195000, rooms: 2, bedrooms: 1, living_area: 32.18, floor: 4 };
    const evaluation = buildMatchScore(profile({ cities: ["Nice"], budget_min: 500000, budget_max: 670000 }), egliseRusse);
    expect(evaluation.blockers).toEqual(["budget_min_floor"]);
    expect(isMatchRetained(evaluation)).toBe(false);
  });

  it("surface : −10 % admis sous le minimum, +10 % admis au-dessus du maximum", () => {
    // 120,65 ≥ 130 × 0,9 = 117 → passe en tolérance ; 120,65 < 135 × 0,9 = 121,5 → bloque.
    const tolerated = buildMatchScore(profile({ cities: ["Nice"], budget_max: 700000, living_area_min: 130 }), musiciens);
    expect(tolerated.blockers).toEqual([]);
    expect(tolerated.score).toBe(75);
    expect(tolerated.matchedCriteria.livingAreaMin).toBe("tolerance");
    expect(buildMatchScore(profile({ living_area_min: 135 }), musiciens).blockers).toContain("living_area_min");
    // max 110 → 121 admis ; max 105 → 115,5 : bloque.
    expect(buildMatchScore(profile({ living_area_max: 110 }), musiciens).blockers).toEqual([]);
    expect(buildMatchScore(profile({ living_area_max: 105 }), musiciens).blockers).toContain("living_area_max");
  });

  it("pièces, type, étage, terrasse, ascenseur : bloquants quand renseignés et non satisfaits", () => {
    expect(buildMatchScore(profile({ rooms_min: 6 }), musiciens).blockers).toContain("rooms_min");
    expect(buildMatchScore(profile({ rooms_max: 4 }), musiciens).blockers).toContain("rooms_max");
    expect(buildMatchScore(profile({ property_types: ["house"] }), musiciens).blockers).toContain("property_type");
    expect(buildMatchScore(profile({ floor_min: 2 }), musiciens).blockers).toContain("floor_min");
    expect(buildMatchScore(profile({ floor_max: 0 }), musiciens).blockers).toContain("floor_max");
    expect(buildMatchScore(profile({ requires_terrace: true }), musiciens).blockers).toContain("requires_terrace");
    // Ascenseur inconnu sur l'annonce (null) = non satisfait.
    expect(buildMatchScore(profile({ requires_elevator: true }), musiciens).blockers).toContain("requires_elevator");
  });

  it("tout satisfait : 120", () => {
    const full = buildMatchScore(
      profile({
        property_types: ["Apartment"],
        cities: ["NICE"],
        budget_min: 600000,
        budget_max: 650000,
        rooms_min: 5,
        bedrooms_min: 4,
        living_area_min: 120,
        floor_min: 1,
        requires_terrace: true,
        requires_elevator: true,
      }),
      { ...musiciens, has_terrace: true, has_elevator: true }
    );
    expect(full.blockers).toEqual([]);
    expect(full.score).toBe(120);
  });
});

describe("consentement à l'alerte e-mail", () => {
  it("formulaires du site et saisie par l'équipe : sans attendre la vérification ; Zapier : adresse vérifiée exigée", () => {
    expect(isAlertConsentSource("website_buyer_signup")).toBe(true);
    expect(isAlertConsentSource("website_home_buyer_assistant")).toBe(true);
    expect(isAlertConsentSource("admin_manual_creation")).toBe(true);
    expect(isAlertConsentSource("zapier_integration")).toBe(false);
    expect(isAlertConsentSource(null)).toBe(false);

    expect(isLeadEligibleForAlerts({ email: "l@yahoo.com", email_verified_at: null, source: "website_buyer_signup" })).toBe(true);
    expect(isLeadEligibleForAlerts({ email: "c@hotmail.fr", email_verified_at: null, source: "zapier_integration" })).toBe(false);
    expect(isLeadEligibleForAlerts({ email: "c@hotmail.fr", email_verified_at: "2026-10-01T00:00:00Z", source: "zapier_integration" })).toBe(true);
    expect(isLeadEligibleForAlerts({ email: "", email_verified_at: "2026-10-01T00:00:00Z", source: "website_buyer_signup" })).toBe(false);
  });
});
