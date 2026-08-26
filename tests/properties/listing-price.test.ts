import { describe, expect, it } from "vitest";
import { formatLoiCarrezArea } from "@/lib/i18n/format";
import {
  buildListingPriceSublines,
  formatListingPrice,
  getListingDisplayAmount,
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
      rentExcludingCharges: 800,
      chargesProvision: 50,
      rentIncludingCharges: 850,
      tenantAgencyFees: 462.22,
      inventoryReportFees: 138.8,
      totalTenantFees: 601.02,
      securityDeposit: 800,
      rentSupplement: null,
    });

    const lines = buildListingPriceSublines({ price, currency: "EUR", locale: "fr" });
    const blob = lines.map((line) => line.text).join(" | ");
    expect(blob).toContain("dont");
    expect(blob).toContain("locataire");
    expect(blob).toContain("état des lieux");
    expect(blob).toContain("Dépôt de garantie");
    expect(blob).not.toMatch(/Incluant|acquéreur|buyer|comprador|покупателя/i);
    expect(getListingDisplayAmount(price, 800)).toBe(850);
    expect(formatListingPrice({ amount: 850, currency: "EUR", locale: "fr", periodSuffix: "/mois" })).toMatch(
      /\/mois$/
    );
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
    expect(price.rentExcludingCharges).toBe(1400);
    expect(price.chargesProvision).toBeNull();
    expect(price.rentIncludingCharges).toBe(1400);
    expect(price.totalTenantFees).toBe(819);

    const lines = buildListingPriceSublines({ price, currency: "EUR", locale: "fr" });
    expect(lines.some((line) => line.key === "charges")).toBe(false);
    expect(getListingDisplayAmount(price, 1400)).toBe(1400);
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
    expect(withSupplement.rentSupplement).toBe(75);
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
    expect(withoutSupplement.rentSupplement).toBeNull();
  });

  it("vente honoraires acquéreur : snapshot inchangé (inclus, arrondi, kind sale)", () => {
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
      feeAmount: 12000,
      priceIncludesFees: true,
    });

    const lines = buildListingPriceSublines({ price, currency: "EUR", locale: "fr" });
    expect(lines).toHaveLength(1);
    expect(lines[0]?.text).toMatch(/^Incluant .+ d'honoraires à la charge de l'acquéreur$/);
    expect(getListingDisplayAmount(price, 400000)).toBe(400000);
    expect(formatListingPrice({ amount: 400000, currency: "EUR", locale: "fr" })).not.toMatch(/\/mois/);
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
      feeAmount: 13740,
      priceIncludesFees: true,
    });
    expect(buildListingPriceSublines({ price, currency: "EUR", locale: "fr" })).toEqual([]);
  });
});

describe("formatLoiCarrezArea", () => {
  it("affiche 43,61 m² sans arrondir, séparateur français", () => {
    expect(formatLoiCarrezArea(43.61, "fr")).toBe("43,61 m²");
  });
});
