import { describe, expect, it } from "vitest";
import { resolveContractKind } from "@/lib/mynotary/types";

// resolveContractKind is the small mapping table that drives whether
// a signature_completed payload is promoted to mynotary_signed_documents
// or just logged in mynotary_events. Coverage matters here because
// MyNotary's `contractType` strings are free-form.

describe("resolveContractKind", () => {
  it.each([
    ["Mandat de vente exclusif", "mandate"],
    ["mandat exclusif", "mandate"],
    ["MANDAT_DE_VENTE", "mandate"],
    ["sale_mandate", "mandate"],
    ["Mandat de Recherche", "mandate"],
  ])("maps %s to mandate", (input, expected) => {
    expect(resolveContractKind(input)).toBe(expected);
  });

  it.each([
    ["Offre d'achat", "purchase_offer"],
    ["purchase_offer", "purchase_offer"],
    ["offre achat", "purchase_offer"],
    ["Promesse d'achat", "purchase_offer"],
  ])("maps %s to purchase_offer", (input, expected) => {
    expect(resolveContractKind(input)).toBe(expected);
  });

  it.each([
    ["Compromis de vente", "preliminary_sale"],
    ["Promesse de vente", "preliminary_sale"],
    ["preliminary_sale", "preliminary_sale"],
    ["promesse synallagmatique de vente", "preliminary_sale"],
  ])("maps %s to preliminary_sale", (input, expected) => {
    expect(resolveContractKind(input)).toBe(expected);
  });

  it("returns null for an unrelated contract type", () => {
    expect(resolveContractKind("Avenant au bail")).toBeNull();
    expect(resolveContractKind("")).toBeNull();
    expect(resolveContractKind(null)).toBeNull();
    expect(resolveContractKind(undefined)).toBeNull();
  });
});
