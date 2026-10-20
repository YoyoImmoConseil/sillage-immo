import { describe, expect, it } from "vitest";
import { formatAdminAvailabilityLabel, resolveAdminPropertySection } from "@/lib/properties/admin-sections";

describe("resolveAdminPropertySection", () => {
  it("met sur le marché ce que le site publie", () => {
    expect(resolveAdminPropertySection("available")).toBe("market");
    expect(resolveAdminPropertySection("option")).toBe("market");
    expect(resolveAdminPropertySection("agreement")).toBe("market");
    expect(resolveAdminPropertySection(" Available ")).toBe("market");
  });

  it("classe vendus, loués, retirés et supprimés dans les terminés", () => {
    for (const status of ["sold", "rented", "let", "withdrawn", "deleted"]) {
      expect(resolveAdminPropertySection(status)).toBe("closed");
    }
  });

  it("tout le reste est en préparation (prospect, inconnu, absent)", () => {
    expect(resolveAdminPropertySection("prospect")).toBe("pipeline");
    expect(resolveAdminPropertySection(null)).toBe("pipeline");
    expect(resolveAdminPropertySection(undefined)).toBe("pipeline");
    expect(resolveAdminPropertySection("quelque_chose")).toBe("pipeline");
  });

  it("libellés français", () => {
    expect(formatAdminAvailabilityLabel("agreement")).toBe("Sous compromis");
    expect(formatAdminAvailabilityLabel("prospect")).toBe("Prospect / Estimation en cours");
    expect(formatAdminAvailabilityLabel(null)).toBe("Statut non renseigné");
    expect(formatAdminAvailabilityLabel("let")).toBe("Loué");
  });
});
