import { describe, expect, it } from "vitest";
import { buildVitrinePosterContent, formatArea, formatEuros } from "@/lib/vitrine/poster-content";
import { resolveDpeStatus } from "@/lib/vitrine/dpe";
import { deriveVitrineQuartierFromTitle } from "@/lib/properties/vitrine-editorial";
import type { Database } from "@/types/db/supabase";

type PropertyRow = Database["public"]["Tables"]["properties"]["Row"];

const STAMP = "2026-01-01T00:00:00.000Z";
const NBSP = " ";

/** Bien Église Russe tel que synchronisé depuis SweepBright (extrait). */
const egliseRusseRaw = {
  price: { amount: 195000, currency: "EUR" },
  vendor_percentage: 6,
  buyer_percentage: null,
  mandate: { number: "177" },
  sizes: { liveable_area: { size: 32.18 }, loi_carrez_area: { size: 32.18 } },
  rooms: [
    { size: 10.17, type: "bedrooms" },
    { size: 3.33, type: "shower_rooms" },
    { size: 13.94, type: "living_room" },
    { size: 4.7, type: "balcony" },
  ],
  amenities: ["basement", "balcony", "lift"],
  bathrooms: 0,
  shower_rooms: 1,
  living_rooms: 1,
  bedrooms: 1,
  features: { heating_cooling: { air_conditioning: true } },
  building: { construction: { year: 1965, residential_lots: 40 }, units_of_building: 102, number_of_floor_building: 5 },
  price_yearly_budgeted_building_costs: { amount: 1735, currency: "EUR" },
};

const egliseRusseLegal = {
  energy: {
    dpe: "D",
    dpe_date: "2026-07-22",
    epc_value: 168,
    co2_emissions: 33,
    greenhouse_emissions: "D",
    estimated_energy_costs: { year: 2023, maximum: { amount: 880 }, minimum: { amount: 610 } },
  },
  regulations: { ongoing_litigation: false },
};

const makeProperty = (overrides: Partial<PropertyRow> = {}): PropertyRow => ({
  id: "prop-1",
  created_at: STAMP,
  updated_at: STAMP,
  last_synced_at: STAMP,
  source: "sweepbright",
  source_ref: "estate-1",
  company_id: null,
  project_id: null,
  is_project: false,
  kind: "sale",
  negotiation: "sale",
  title: "NICE – EGLISE RUSSE 2 PIÈCES AVEC BALCON – 4e ÉTAGE – ASCENSEUR – CAVE",
  description: null,
  property_type: "apartment",
  sub_type: null,
  availability_status: "available",
  general_condition: null,
  street: "Avenue Gay",
  street_number: "19",
  postal_code: "06000",
  city: "Nice",
  country: "FR",
  formatted_address: null,
  latitude: null,
  longitude: null,
  living_area: 32.18,
  plot_area: null,
  bedrooms: 1,
  bathrooms: 0,
  rooms: 2,
  floor: 4,
  has_terrace: false,
  has_elevator: true,
  virtual_tour_url: null,
  video_url: null,
  appointment_service_url: null,
  negotiator: {},
  legal: egliseRusseLegal,
  raw_payload: egliseRusseRaw,
  metadata: {},
  vitrine_highlights: ["2 pièces avec balcon", "Avant-dernier étage", "Ascenseur · cave"],
  vitrine_quartier: "Église Russe",
  vitrine_updated_at: null,
  vitrine_updated_by: null,
  ...overrides,
});

const listing = { price_amount: 195000, canonical_path: "/06000/dfb5c26e", business_type: "sale" as const };
const build = (overrides: Partial<PropertyRow> = {}) =>
  buildVitrinePosterContent({ property: makeProperty(overrides), listing, siteUrl: "https://sillage-immo.com/" });

describe("buildVitrinePosterContent — Église Russe (V2)", () => {
  it("reproduit les textes de la V2 sans erreur bloquante", () => {
    const { content, errors, warnings } = build();
    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
    expect(content.headline).toBe("Bien à vendre");
    expect(content.typeLine).toBe(`APPARTEMENT 2${NBSP}PIÈCES · 32,18${NBSP}m²`);
    expect(content.locationLine).toBe("NICE · ÉGLISE RUSSE (06000)");
    expect(content.priceLine).toBe(`195${NBSP}000${NBSP}€`);
    expect(content.legalLines).toEqual([
      "Honoraires à la charge du vendeur",
      `Copropriété de 102${NBSP}lots, dont 40${NBSP}lots d’habitation`,
      `Charges courantes : 1${NBSP}735${NBSP}€/an (quote-part)`,
      "Aucune procédure en cours (art. L721-1 CCH)",
    ]);
    expect(content.characteristicsLine.replace(/ /g, " ")).toBe(
      "32,18 m² Carrez · 1 pièce de vie · 1 chambre · 1 salle de douche · climatisation · ascenseur · avant-dernier étage · balcon de 4,70 m² · cave"
    );
    expect(content.reference).toBe("177");
    expect(content.energy).toEqual({ kind: "scales", energyClass: "D", energyValue: 168, climateClass: "D", climateValue: 33 });
    expect(content.dpeParagraph.replace(/ /g, " ")).toBe(
      "Montant estimé des dépenses annuelles d’énergie pour un usage standard : entre 610 € et 880 € par an. " +
        "Prix moyens des énergies indexés au 1er janvier 2023 (abonnements compris). " +
        "Informations sur les risques auxquels ce bien est exposé : www.georisques.gouv.fr"
    );
    expect(content.qrUrl).toBe("https://sillage-immo.com/06000/dfb5c26e");
    expect(content.footer).toContain("SARL au capital de 8 003,57 €");
  });

  it("bloque quand « procédure en cours » est absente ou null", () => {
    expect(build({ legal: { ...egliseRusseLegal, regulations: {} } }).errors).toContainEqual(expect.stringMatching(/procédure en cours/));
    expect(build({ legal: { ...egliseRusseLegal, regulations: { ongoing_litigation: null } } }).errors).toContainEqual(
      expect.stringMatching(/procédure en cours/)
    );
    const withLitigation = build({ legal: { ...egliseRusseLegal, regulations: { ongoing_litigation: true } } });
    expect(withLitigation.errors).toEqual([]);
    expect(withLitigation.content.legalLines).toContain("Procédure en cours (art. L721-1 CCH)");
  });

  it("bloque sans charges de copropriété et sans moins de 3 points forts", () => {
    const noCharges = build({ raw_payload: { ...egliseRusseRaw, price_yearly_budgeted_building_costs: { amount: null } } });
    expect(noCharges.errors).toContainEqual(expect.stringMatching(/charges courantes/));
    const twoHighlights = build({ vitrine_highlights: ["Un", "Deux"] });
    expect(twoHighlights.errors).toContainEqual(expect.stringMatching(/Points forts : 2 lignes/));
  });

  it("masque la référence quand le numéro de mandat est absent ou non numérique, sans bloquer", () => {
    const named = build({ raw_payload: { ...egliseRusseRaw, mandate: { number: "GEORCLEM" } } });
    expect(named.content.reference).toBeNull();
    expect(named.errors).toEqual([]);
    expect(named.warnings).toContainEqual(expect.stringMatching(/Référence/));
    const missing = build({ raw_payload: { ...egliseRusseRaw, mandate: {} } });
    expect(missing.content.reference).toBeNull();
  });

  it("honoraires acquéreur : pourcentage TTC et prix hors honoraires", () => {
    const { content, errors } = build({
      raw_payload: { ...egliseRusseRaw, vendor_percentage: null, buyer_percentage: 5 },
    });
    expect(errors).toEqual([]);
    expect(content.legalLines[0]).toBe(`Honoraires à la charge de l’acquéreur : 5${NBSP}% TTC`);
    expect(content.legalLines[1]).toBe(`Prix hors honoraires : 185${NBSP}250${NBSP}€`);
  });

  it("bloque quand ni vendeur ni acquéreur ne portent les honoraires", () => {
    const { errors } = build({ raw_payload: { ...egliseRusseRaw, vendor_percentage: 0, buyer_percentage: 0 } });
    expect(errors).toContainEqual(expect.stringMatching(/honoraires/i));
  });

  it("bien hors copropriété : aucune mention copro, aucun blocage", () => {
    const { content, errors } = build({
      property_type: "house",
      raw_payload: {
        ...egliseRusseRaw,
        building: { number_of_floor_building: 2 },
        price_yearly_budgeted_building_costs: { amount: null },
      },
      legal: { ...egliseRusseLegal, regulations: {} },
    });
    expect(errors).toEqual([]);
    expect(content.typeLine.startsWith("MAISON")).toBe(true);
    expect(content.legalLines).toEqual(["Honoraires à la charge du vendeur"]);
  });

  it("appartement sans nombre de lots : blocage explicite", () => {
    const { errors } = build({ raw_payload: { ...egliseRusseRaw, building: { number_of_floor_building: 5 } } });
    expect(errors).toContainEqual(expect.stringMatching(/nombre de lots/));
  });

  it("DPE F ou G : phrase « consommation excessive » en tête", () => {
    const { content } = build({ legal: { ...egliseRusseLegal, energy: { ...egliseRusseLegal.energy, dpe: "G" } } });
    expect(content.dpeParagraph.startsWith("Logement à consommation énergétique excessive.")).toBe(true);
    expect(content.energy).toMatchObject({ kind: "scales", energyClass: "G" });
  });

  it("DPE vierge ou non soumis : texte dédié à la place des échelles", () => {
    const blank = build({ legal: { ...egliseRusseLegal, energy: { dpe: "VI", greenhouse_emissions: "VI" } } });
    expect(blank.errors).toEqual([]);
    expect(blank.content.energy).toEqual({ kind: "text" });
    expect(blank.content.dpeParagraph).toMatch(/vierge/);
    const exempt = build({ legal: { ...egliseRusseLegal, energy: { dpe: "NS" } } });
    expect(exempt.content.dpeParagraph).toMatch(/non soumis/);
    const missing = build({ legal: { ...egliseRusseLegal, energy: {} } });
    expect(missing.errors).toContainEqual(expect.stringMatching(/DPE/));
  });

  it("quartier absent : ligne réduite à la ville, avertissement", () => {
    const { content, warnings, errors } = build({ vitrine_quartier: null });
    expect(content.locationLine).toBe("NICE (06000)");
    expect(warnings).toContainEqual(expect.stringMatching(/Quartier/));
    expect(errors).toEqual([]);
  });

  it("location : loyer charges comprises et provisions", () => {
    const { content, errors } = build({
      negotiation: "let",
      raw_payload: { ...egliseRusseRaw, price: { amount: 1200 }, price_recurring_costs: { amount: 120 } },
    });
    expect(errors).toEqual([]);
    expect(content.headline).toBe("Bien à louer");
    expect(content.priceLine).toBe(`1${NBSP}200${NBSP}€${NBSP}/ mois`);
    expect(content.legalLines[0]).toBe(`Loyer charges comprises, dont 120${NBSP}€ de provisions sur charges`);
  });
});

describe("formats", () => {
  it("formate surfaces et montants à la française", () => {
    expect(formatArea(32.18)).toBe(`32,18${NBSP}m²`);
    expect(formatArea(4.7)).toBe(`4,70${NBSP}m²`);
    expect(formatArea(89)).toBe(`89${NBSP}m²`);
    expect(formatEuros(195000)).toBe(`195${NBSP}000${NBSP}€`);
    expect(formatEuros(8003.57, { decimals: 2 })).toBe(`8${NBSP}003,57${NBSP}€`);
  });

  it("interprète les classes DPE", () => {
    expect(resolveDpeStatus("d", "D")).toEqual({ kind: "scales", energyClass: "D", climateClass: "D" });
    expect(resolveDpeStatus("vierge", null)).toEqual({ kind: "blank" });
    expect(resolveDpeStatus("non soumis", null)).toEqual({ kind: "exempt" });
    expect(resolveDpeStatus(null, "C")).toEqual({ kind: "missing" });
  });

  it("le quartier pré-rempli reste cohérent avec la ligne de localisation", () => {
    expect(deriveVitrineQuartierFromTitle("NICE – EGLISE RUSSE 2 PIÈCES AVEC BALCON")).toBe("Eglise Russe");
  });
});
