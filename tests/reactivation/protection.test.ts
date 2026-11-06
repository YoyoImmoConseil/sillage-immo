import { describe, expect, it } from "vitest";

import {
  PROTECTED_ROLES,
  isContactProtected,
  isProtectingContractModel,
  normalizeProtectedEmail,
  normalizeProtectedName,
  protectionWindowStart,
  type ProtectionIndex,
} from "@/lib/reactivation/protection";

describe("protection MyNotary — règle permanente des 12 mois", () => {
  it("protège sur mandats, avenants de mandat, compromis et promesses, pas sur les bons de visite ni les offres", () => {
    expect(isProtectingContractModel("IMMOBILIER_VENTE_ANCIEN_MANDAT")).toBe(true);
    expect(isProtectingContractModel("IMMOBILIER_VENTE_ANCIEN_AVENANT_MANDAT")).toBe(true);
    expect(isProtectingContractModel("IMMOBILIER_LOCATION_MANDAT_LOCATION")).toBe(true);
    expect(isProtectingContractModel("IMMOBILIER_LOCATION_COMMERCIAL_MANDAT_GESTION")).toBe(true);
    expect(isProtectingContractModel("TRANSACTION__MANDAT_CO_EXCLUSIF")).toBe(true);
    expect(isProtectingContractModel("IMMOBILIER_VENTE_ANCIEN_COMPROMIS_DE_VENTE")).toBe(true);
    expect(isProtectingContractModel("IMMOBILIER_VENTE_ANCIEN_BON_VISITE")).toBe(false);
    expect(isProtectingContractModel("IMMOBILIER_VENTE_ANCIEN_OFFRE_ACHAT")).toBe(false);
    expect(isProtectingContractModel("IMMOBILIER_LOCATION_BAIL")).toBe(false);
    expect(isProtectingContractModel(null)).toBe(false);
  });

  it("protège vendeurs, bailleurs et acquéreurs seulement", () => {
    expect(PROTECTED_ROLES.has("VENDEUR")).toBe(true);
    expect(PROTECTED_ROLES.has("BAILLEUR")).toBe(true);
    expect(PROTECTED_ROLES.has("ACQUEREUR")).toBe(true);
    expect(PROTECTED_ROLES.has("OFFRANT")).toBe(false);
    expect(PROTECTED_ROLES.has("LOCATAIRE")).toBe(false);
    expect(PROTECTED_ROLES.has("GARANT")).toBe(false);
  });

  it("normalise e-mail et nom + premier prénom", () => {
    expect(normalizeProtectedEmail("  Jean.DUPONT@Orange.fr ")).toBe("jean.dupont@orange.fr");
    expect(normalizeProtectedEmail("pas un mail")).toBeNull();
    expect(normalizeProtectedName("BEN SAMOUN", "Danielle, Eléonore")).toBe("bensamoun|danielle");
    expect(normalizeProtectedName("Laïdouni", "Myriam")).toBe("laidouni|myriam");
    expect(normalizeProtectedName("Tur", "N")).toBeNull();
    expect(normalizeProtectedName("Le", "Noël")).toBeNull();
  });

  it("reconnaît un contact par e-mail, sinon par nom + prénom, et laisse passer les homonymes partiels", () => {
    const index: ProtectionIndex = {
      emails: new Set(["frederic.elbaz@gmail.com"]),
      names: new Set(["martinez|jose"]),
      syncedAt: new Date(),
      size: 2,
    };
    expect(isContactProtected({ email: "Frederic.Elbaz@gmail.com", first_name: "Loris", last_name: "Elbaz" }, index)).toBe(true);
    expect(isContactProtected({ email: "jose@martinezimmo.com", first_name: "José", last_name: "MARTINEZ" }, index)).toBe(true);
    expect(isContactProtected({ email: "martinez.oce@gmail.com", first_name: "Océane", last_name: "Martinez" }, index)).toBe(false);
    expect(isContactProtected({ email: null, first_name: "Marc", last_name: "UZZAN" }, index)).toBe(false);
  });

  it("fenêtre glissante de 365 jours à partir de la date de signature", () => {
    const now = new Date("2026-11-06T09:00:00Z");
    expect(protectionWindowStart(now).toISOString()).toBe("2025-11-06T09:00:00.000Z");
  });
});
