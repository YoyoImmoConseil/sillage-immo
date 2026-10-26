import { describe, expect, it } from "vitest";
import { isDetailPageServed, isDetailPageAvailabilityStatus, isClosedAvailabilityStatus } from "@/lib/properties/canonical-types";
import { getListingCommercialStatusLabel, isListingClosed } from "@/app/components/listing-status-banner";

describe("isDetailPageServed — page de détail publique", () => {
  it("annonce active : publiée et active, comme avant", () => {
    expect(isDetailPageServed({ availabilityStatus: "available", isPublished: true, publicationStatus: "active" })).toBe(true);
    expect(isDetailPageServed({ availabilityStatus: "option", isPublished: true, publicationStatus: "active" })).toBe(true);
    expect(isDetailPageServed({ availabilityStatus: "agreement", isPublished: true, publicationStatus: "active" })).toBe(true);
    expect(isDetailPageServed({ availabilityStatus: "available", isPublished: false, publicationStatus: "inactive" })).toBe(false);
    expect(isDetailPageServed({ availabilityStatus: "available", isPublished: true, publicationStatus: "inactive" })).toBe(false);
  });

  it("vendu / loué : servie bien que dépubliée par la synchro, sauf deleted", () => {
    expect(isDetailPageServed({ availabilityStatus: "sold", isPublished: false, publicationStatus: "inactive" })).toBe(true);
    expect(isDetailPageServed({ availabilityStatus: "rented", isPublished: false, publicationStatus: "inactive" })).toBe(true);
    expect(isDetailPageServed({ availabilityStatus: "SOLD", isPublished: true, publicationStatus: "active" })).toBe(true);
    expect(isDetailPageServed({ availabilityStatus: "sold", isPublished: false, publicationStatus: "deleted" })).toBe(false);
  });

  it("prospect, withdrawn, deleted, let, absent : 404", () => {
    for (const status of ["prospect", "withdrawn", "deleted", "let", "under_contract", null, undefined, ""]) {
      expect(isDetailPageServed({ availabilityStatus: status, isPublished: true, publicationStatus: "active" }), `statut ${String(status)}`).toBe(false);
    }
  });

  it("helpers de statut", () => {
    expect(isDetailPageAvailabilityStatus("sold")).toBe(true);
    expect(isDetailPageAvailabilityStatus("prospect")).toBe(false);
    expect(isClosedAvailabilityStatus(" Rented ")).toBe(true);
    expect(isClosedAvailabilityStatus("agreement")).toBe(false);
  });
});

describe("bandeau de statut public — vendu / loué", () => {
  it("libellés localisés, jamais le statut brut", () => {
    expect(getListingCommercialStatusLabel("sold", "fr")).toBe("Vendu");
    expect(getListingCommercialStatusLabel("rented", "fr")).toBe("Loué");
    expect(getListingCommercialStatusLabel("sold", "en")).toBe("Sold");
    expect(getListingCommercialStatusLabel("agreement", "fr")).toBe("Sous Compromis");
    expect(getListingCommercialStatusLabel("available", "fr")).toBeNull();
    expect(getListingCommercialStatusLabel("prospect", "fr")).toBeNull();
  });

  it("isListingClosed : sold et rented uniquement", () => {
    expect(isListingClosed("sold")).toBe(true);
    expect(isListingClosed("rented")).toBe(true);
    expect(isListingClosed("option")).toBe(false);
    expect(isListingClosed(null)).toBe(false);
  });
});
