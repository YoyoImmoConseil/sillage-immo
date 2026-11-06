import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: {} }));
import { decideSegment, excludedEmailFragments, excludedNamePatterns } from "@/services/reactivation/reactivation-import.service";

const vendor = { sweepbright_contact_id: "1", type: "vendor", email: "a@b.fr", labels: [] as string[] };

describe("segmentation à l'import", () => {
  it("propriétaire sans label → V1 ; acte signé → V3", () => {
    expect(decideSegment(vendor)).toEqual({ segment: "v1_proprietaire", exclude: null });
    expect(decideSegment({ ...vendor, labels: ["SIGNE/ACTE ✅", "VENDEUR 🙂"] })).toEqual({ segment: "v3_client", exclude: null });
  });
  it("affaire en cours exclue, e-mail invalide exclu", () => {
    expect(decideSegment({ ...vendor, labels: ["SOUS MANDAT 📑"] }).exclude).toBe("affaire_en_cours");
    expect(decideSegment({ ...vendor, labels: ["SOUS COMPROMIS ✍🏻"] }).exclude).toBe("affaire_en_cours");
    expect(decideSegment({ ...vendor, email: "n/a" }).exclude).toBe("email_invalide");
    expect(decideSegment({ ...vendor, email: null }).exclude).toBe("email_invalide");
  });
  it("prospects : achat → A1, sans préférence → A2, location seule → exclu", () => {
    expect(decideSegment({ ...vendor, type: "lead", negotiations: ["sale"] })).toEqual({ segment: "a1_acquereur", exclude: null });
    expect(decideSegment({ ...vendor, type: "lead", negotiations: ["let", "sale"] }).segment).toBe("a1_acquereur");
    expect(decideSegment({ ...vendor, type: "lead" })).toEqual({ segment: "a2_ancien", exclude: null });
    expect(decideSegment({ ...vendor, type: "lead", negotiations: ["let"] }).exclude).toBe("location_seule");
  });
  it("noms à ne jamais contacter", () => {
    const patterns = [/taddei/i, /funel/i];
    expect(decideSegment({ ...vendor, first_name: "Paul", last_name: "TADDEI" }, { excludedNames: patterns }).exclude).toBe("nom_exclu");
    expect(decideSegment({ ...vendor, first_name: "Paul", last_name: "Funès" }, { excludedNames: patterns }).exclude).toBeNull();
  });
  it("un segment imposé l'emporte", () => {
    expect(decideSegment({ ...vendor, type: "lead", segment: "v1_proprietaire" }).segment).toBe("v1_proprietaire");
  });
});

describe("exclusions fixées le 06/11", () => {
  const opts = { excludedNames: excludedNamePatterns(), excludedEmailFragments: excludedEmailFragments() };
  it("écarte @orpi.com et les adresses anonymisées dummy", () => {
    expect(decideSegment({ ...vendor, email: "agence@orpi.com" }, opts).exclude).toBe("adresse_orpi");
    expect(decideSegment({ ...vendor, email: "dummy15349321@dummy.com" }, opts).exclude).toBe("adresse_anonymisee");
  });
  it("écarte Benjamin et Laurent Chiche, Reumaux, Raimondi, Charbonnel, Taddei, Funel — pas les autres Chiche", () => {
    expect(decideSegment({ ...vendor, first_name: "Laurent", last_name: "CHICHE" }, opts).exclude).toBe("nom_exclu");
    expect(decideSegment({ ...vendor, first_name: "PIERRE LAURENT", last_name: "CHICHE" }, opts).exclude).toBe("nom_exclu");
    expect(decideSegment({ ...vendor, first_name: "Joseph", last_name: "CHICHE" }, opts).exclude).toBeNull();
    expect(decideSegment({ ...vendor, first_name: "Anthony", last_name: "REUMAUX LE TERRIER" }, opts).exclude).toBe("nom_exclu");
    expect(decideSegment({ ...vendor, first_name: "Thierry / Gregory", last_name: "RAIMONDI" }, opts).exclude).toBe("nom_exclu");
    expect(decideSegment({ ...vendor, first_name: "Jean", last_name: "Charbonnel" }, opts).exclude).toBe("nom_exclu");
    expect(decideSegment({ ...vendor, first_name: "Marc", last_name: "Taddei" }, opts).exclude).toBe("nom_exclu");
  });
});
