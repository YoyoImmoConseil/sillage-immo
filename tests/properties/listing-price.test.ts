import { describe, expect, it } from "vitest";
import { formatLoiCarrezArea } from "@/lib/i18n/format";
import { normalizeListingDescriptionFees } from "@/lib/properties/listing-description";
import {
  buildListingPriceSublines,
  formatListingPrice,
  getListingDisplayAmountCents,
} from "@/lib/properties/listing-price";
import { buildPropertyPriceSnapshot } from "@/services/properties/property-presentation";
import type { Database } from "@/types/db/supabase";

type PropertyRow = Database["public"]["Tables"]["properties"]["Row"];

const STAMP = "2026-01-01T00:00:00.000Z";

const makeProperty = (overrides: Partial<PropertyRow> = {}): PropertyRow => ({
  id: "prop-1",
  created_at: STAMP,
  updated_at: STAMP,
  last_synced_at: STAMP,
  source: "sweepbright",
  source_ref: "8068f08f-07c4-4827-8303-4f80ecc86a64",
  company_id: null,
  project_id: null,
  is_project: false,
  kind: "rental",
  negotiation: "let",
  title: "Mont-Boron",
  description: null,
  property_type: "apartment",
  sub_type: null,
  availability_status: "available",
  general_condition: null,
  street: null,
  street_number: null,
  postal_code: "06300",
  city: "Nice",
  country: "France",
  formatted_address: null,
  latitude: null,
  longitude: null,
  living_area: 45.81,
  plot_area: null,
  bedrooms: 1,
  bathrooms: 1,
  rooms: 2,
  floor: 6,
  has_terrace: false,
  has_elevator: true,
  virtual_tour_url: null,
  video_url: null,
  appointment_service_url: null,
  negotiator: {},
  legal: {},
  raw_payload: {},
  metadata: {},
  ...overrides,
});

describe("buildPropertyPriceSnapshot", () => {
  it("location complète (Mont-Boron) : loyer CC, charges, honoraires locataire + EDL, dépôt", () => {
    const price = buildPropertyPriceSnapshot(
      makeProperty({
        raw_payload: {
          price: { amount: 800, currency: "EUR" },
          price_base_rent: { amount: 800, currency: "EUR" },
          price_recurring_costs: { amount: 50, currency: "EUR" },
          price_guarantee: { amount: 800, currency: "EUR" },
          buyer_fixed_fee: 462.22,
          vendor_fixed_fee: 850,
          price_inventory_report_cost: { amount: 138.8, currency: "EUR" },
          price_rent_supplement: { amount: null, currency: "EUR" },
          price_reference_rent: { amount: null, currency: "EUR" },
        },
      }),
      800
    );

    expect(price).toEqual({
      kind: "rental",
      rentExcludingChargesCents: 80000,
      chargesProvisionCents: 5000,
      rentIncludingChargesCents: 85000,
      tenantAgencyFeesCents: 46222,
      inventoryReportFeesCents: 13880,
      totalTenantFeesCents: 60102,
      securityDepositCents: 80000,
      rentSupplementCents: null,
    });

    const lines = buildListingPriceSublines({ price, currency: "EUR", locale: "fr" });
    const blob = lines.map((line) => line.text).join(" | ");
    // Intl sépare le montant du symbole par une espace fine insécable.
    expect(blob).toMatch(/601,02\s€/);
    expect(blob).toMatch(/138,80\s€/);
    expect(blob).toContain("Dépôt de garantie");
    expect(blob).not.toMatch(/Incluant|acquéreur|buyer|comprador|покупателя/i);
    expect(getListingDisplayAmountCents(price, 800)).toBe(85000);
    expect(
      formatListingPrice({ amountCents: 85000, currency: "EUR", locale: "fr", periodSuffix: "/mois" })
    ).toMatch(/^850\s?€\/mois$/);
  });

  it("aucune addition flottante : une somme qui dérive en number reste exacte en centimes", () => {
    // 8.11 + 2.02 vaut 10.129999999999999 en IEEE-754.
    expect((8.11 + 2.02) * 100).not.toBe(1013);

    const price = buildPropertyPriceSnapshot(
      makeProperty({
        raw_payload: {
          price_base_rent: { amount: 800, currency: "EUR" },
          buyer_fixed_fee: 8.11,
          price_inventory_report_cost: { amount: 2.02, currency: "EUR" },
        },
      }),
      800
    );

    expect(price.kind).toBe("rental");
    if (price.kind !== "rental") return;
    expect(price.totalTenantFeesCents).toBe(1013);
    expect(Number.isInteger(price.totalTenantFeesCents)).toBe(true);

    const [fees] = buildListingPriceSublines({ price, currency: "EUR", locale: "fr" });
    expect(fees.text).toMatch(/10,13\s€/);
  });

  it("loyer de base à zéro : bascule sur price au lieu de publier 0 €", () => {
    const price = buildPropertyPriceSnapshot(
      makeProperty({
        source_ref: "d527b2ae-9664-4cb7-93cd-28375ee771d1",
        raw_payload: {
          price: { amount: 880, currency: "EUR" },
          price_base_rent: { amount: 0, currency: "EUR" },
          price_recurring_costs: { amount: null, currency: "EUR" },
          price_guarantee: { amount: 855, currency: "EUR" },
          buyer_fixed_fee: 351.52,
          price_inventory_report_cost: { amount: 81.12, currency: "EUR" },
          price_rent_supplement: { amount: 0, currency: "EUR" },
        },
      }),
      0
    );

    expect(price.kind).toBe("rental");
    if (price.kind !== "rental") return;
    expect(price.rentExcludingChargesCents).toBe(88000);
    expect(price.rentIncludingChargesCents).toBe(88000);
    expect(price.rentSupplementCents).toBeNull();
    expect(getListingDisplayAmountCents(price, 0)).toBe(88000);
    expect(
      formatListingPrice({ amountCents: 88000, currency: "EUR", locale: "fr", periodSuffix: "/mois" })
    ).toMatch(/^880\s?€\/mois$/);
  });

  it("location sans charges connues : affiche le HC, omet la ligne provision", () => {
    const price = buildPropertyPriceSnapshot(
      makeProperty({
        raw_payload: {
          price_base_rent: { amount: 1400, currency: "EUR" },
          price_recurring_costs: { amount: null, currency: "EUR" },
          buyer_fixed_fee: 630,
          price_inventory_report_cost: { amount: 189, currency: "EUR" },
          price_guarantee: { amount: 1300, currency: "EUR" },
        },
      }),
      1400
    );

    expect(price.kind).toBe("rental");
    if (price.kind !== "rental") return;
    expect(price.rentExcludingChargesCents).toBe(140000);
    expect(price.chargesProvisionCents).toBeNull();
    expect(price.rentIncludingChargesCents).toBe(140000);
    expect(price.totalTenantFeesCents).toBe(81900);

    const lines = buildListingPriceSublines({ price, currency: "EUR", locale: "fr" });
    expect(lines.some((line) => line.key === "charges")).toBe(false);
  });

  it("location avec complément de loyer : le complément n'apparaît que s'il est > 0", () => {
    const withSupplement = buildPropertyPriceSnapshot(
      makeProperty({
        raw_payload: {
          price_base_rent: { amount: 800, currency: "EUR" },
          price_recurring_costs: { amount: 50, currency: "EUR" },
          price_rent_supplement: { amount: 75, currency: "EUR" },
        },
      }),
      800
    );
    expect(withSupplement.kind).toBe("rental");
    if (withSupplement.kind !== "rental") return;
    expect(withSupplement.rentSupplementCents).toBe(7500);
    expect(
      buildListingPriceSublines({ price: withSupplement, currency: "EUR", locale: "fr" }).some(
        (line) => line.key === "supplement"
      )
    ).toBe(true);

    const withoutSupplement = buildPropertyPriceSnapshot(
      makeProperty({
        raw_payload: {
          price_base_rent: { amount: 800, currency: "EUR" },
          price_rent_supplement: { amount: 0, currency: "EUR" },
        },
      }),
      800
    );
    expect(withoutSupplement.kind).toBe("rental");
    if (withoutSupplement.kind !== "rental") return;
    expect(withoutSupplement.rentSupplementCents).toBeNull();
  });

  it("vente honoraires acquéreur : mention inchangée, à l'euro, sans /mois", () => {
    const price = buildPropertyPriceSnapshot(
      makeProperty({
        kind: "sale",
        negotiation: "sale",
        raw_payload: {
          price: { amount: 400000, currency: "EUR" },
          buyer_fixed_fee: 12000.4,
          vendor_fixed_fee: null,
        },
      }),
      400000
    );

    expect(price).toEqual({
      kind: "sale",
      feeChargeBearer: "buyer",
      feeAmountCents: 1200040,
      priceIncludesFees: true,
    });

    const lines = buildListingPriceSublines({ price, currency: "EUR", locale: "fr" });
    expect(lines).toHaveLength(1);
    expect(lines[0]?.text).toMatch(/^Incluant 12\s?000\s?€ d'honoraires à la charge de l'acquéreur$/);
    expect(getListingDisplayAmountCents(price, 400000)).toBe(40000000);
    expect(formatListingPrice({ amountCents: 40000000, currency: "EUR", locale: "fr" })).not.toMatch(
      /\/mois/
    );
  });

  it("vente honoraires vendeur : pas de mention acquéreur, FAI conservé", () => {
    const price = buildPropertyPriceSnapshot(
      makeProperty({
        kind: "sale",
        negotiation: "sale",
        raw_payload: {
          price: { amount: 229000, currency: "EUR" },
          buyer_fixed_fee: null,
          vendor_percentage: 6,
        },
      }),
      229000
    );

    expect(price).toEqual({
      kind: "sale",
      feeChargeBearer: "vendor",
      feeAmountCents: 1374000,
      priceIncludesFees: true,
    });
    expect(buildListingPriceSublines({ price, currency: "EUR", locale: "fr" })).toEqual([]);
  });
});

describe("normalizeListingDescriptionFees", () => {
  const montBoron = buildPropertyPriceSnapshot(
    makeProperty({
      raw_payload: {
        price_base_rent: { amount: 800, currency: "EUR" },
        price_recurring_costs: { amount: 50, currency: "EUR" },
        buyer_fixed_fee: 462.22,
        price_inventory_report_cost: { amount: 138.8, currency: "EUR" },
      },
    }),
    800
  );

  it("réaligne le total du texte libre sur le modèle de prix (fr)", () => {
    const description = [
      "Loyer hors charges : 800 €. Pas de complément de loyer.",
      "Dépôt de garantie : 800 €.",
      "Honoraires TTC à la charge du locataire : 601,03 €, dont 138,80 € au titre de la réalisation de l'état des lieux d'entrée.",
      "Location meublée.",
    ].join("\n");

    const result = normalizeListingDescriptionFees({
      description,
      price: montBoron,
      locale: "fr",
    });

    expect(result).toContain("Honoraires TTC à la charge du locataire : 601,02 €");
    expect(result).not.toContain("601,03");
    expect(result).toContain("dont 138,80 € au titre de la réalisation de l'état des lieux");
    expect(result).toContain("Dépôt de garantie : 800 €.");
    expect(result).toContain("Location meublée.");
  });

  it("réaligne aussi la version anglaise sans casser la prose", () => {
    const result = normalizeListingDescriptionFees({
      description: "Tenant fees: €601.03 incl. VAT, of which €138.80 for the inventory of fixtures.",
      price: montBoron,
      locale: "en",
    });

    expect(result).toBe(
      "Tenant fees: €601.02 incl. VAT, of which €138.80 for the inventory of fixtures."
    );
  });

  it("laisse intacte une description sans montant d'honoraires, et toute annonce vente", () => {
    const noAmount = "Bel appartement meublé, disponible immédiatement.";
    expect(
      normalizeListingDescriptionFees({ description: noAmount, price: montBoron, locale: "fr" })
    ).toBe(noAmount);

    const salePrice = buildPropertyPriceSnapshot(
      makeProperty({ kind: "sale", negotiation: "sale", raw_payload: { buyer_fixed_fee: 12000 } }),
      400000
    );
    const saleText = "Honoraires à la charge du locataire : 601,03 €.";
    expect(
      normalizeListingDescriptionFees({ description: saleText, price: salePrice, locale: "fr" })
    ).toBe(saleText);
  });
});

describe("formatLoiCarrezArea", () => {
  it("affiche 43,61 m² sans arrondir, séparateur français", () => {
    expect(formatLoiCarrezArea(43.61, "fr")).toBe("43,61 m²");
  });
});
