import { describe, expect, it } from "vitest";
import {
  classifyContractModel,
  isSaleContractKind,
} from "@/lib/mynotary/types";

describe("classifyContractModel", () => {
  it("maps sale models to the 3 KPI kinds", () => {
    expect(classifyContractModel("IMMOBILIER_VENTE_ANCIEN_MANDAT")).toBe(
      "mandate"
    );
    expect(classifyContractModel("TRANSACTION__MANDAT_CO_EXCLUSIF")).toBe(
      "mandate"
    );
    expect(classifyContractModel("IMMOBILIER_VENTE_ANCIEN_OFFRE_ACHAT")).toBe(
      "purchase_offer"
    );
    expect(
      classifyContractModel("IMMOBILIER_VENTE_ANCIEN_OFFRE_ACHAT_AVEC_VENDEUR")
    ).toBe("purchase_offer");
    expect(
      classifyContractModel("IMMOBILIER_VENTE_ANCIEN_COMPROMIS_DE_VENTE")
    ).toBe("preliminary_sale");
  });

  it("never classifies a rental contract as a sale kind", () => {
    // The 39 signed rental mandates must NOT land in the mandate KPI.
    expect(classifyContractModel("IMMOBILIER_LOCATION_MANDAT_LOCATION")).toBe(
      "rental_mandate"
    );
    expect(
      classifyContractModel("IMMOBILIER_LOCATION_MANDAT_LOCATION_AVENANT")
    ).toBe("rental_mandate");
    expect(
      classifyContractModel("IMMOBILIER_LOCATION_COMMERCIAL_MANDAT_GESTION")
    ).toBe("rental_mandate");
    expect(classifyContractModel("IMMOBILIER_LOCATION_BAIL")).toBe("lease");
    expect(classifyContractModel("IMMOBILIER_LOCATION_BAIL_MOBILITE")).toBe(
      "lease"
    );
    expect(classifyContractModel("LOCATION__BAIL_HABITATION_ANGLAIS")).toBe(
      "lease"
    );
    expect(classifyContractModel("IMMOBILIER_LOCATION_CAUTIONNEMENT")).toBe(
      "guarantee"
    );
  });

  it("falls back to 'other' for unknown / visit slips", () => {
    expect(classifyContractModel("IMMOBILIER_VENTE_ANCIEN_BON_VISITE")).toBe(
      "other"
    );
    expect(classifyContractModel("SOMETHING_WE_DONT_KNOW")).toBe("other");
    expect(classifyContractModel(null)).toBe("other");
    expect(classifyContractModel("")).toBe("other");
  });

  it("falls back to the free-form resolver for human labels", () => {
    expect(classifyContractModel(null, "Mandat de vente exclusif")).toBe(
      "mandate"
    );
    expect(classifyContractModel(undefined, "Offre d'achat")).toBe(
      "purchase_offer"
    );
  });

  it("isSaleContractKind only accepts the 3 sale kinds", () => {
    expect(isSaleContractKind("mandate")).toBe(true);
    expect(isSaleContractKind("purchase_offer")).toBe(true);
    expect(isSaleContractKind("preliminary_sale")).toBe(true);
    expect(isSaleContractKind("rental_mandate")).toBe(false);
    expect(isSaleContractKind("lease")).toBe(false);
    expect(isSaleContractKind("other")).toBe(false);
    expect(isSaleContractKind(null)).toBe(false);
  });
});
