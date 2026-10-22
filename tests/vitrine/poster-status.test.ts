import { describe, expect, it } from "vitest";
import {
  CLOSED_POSTER_MODELS,
  isVitrinePosterModel,
  resolveVitrinePosterModel,
  VITRINE_POSTER_HEADLINES,
  VITRINE_POSTER_MODEL_LABELS,
  VITRINE_RIBBONS,
} from "@/lib/vitrine/poster-status";
import { COLORS } from "@/lib/vitrine/poster-layout";

const sale = (status: string | null | undefined) => resolveVitrinePosterModel({ availabilityStatus: status, transaction: "sale" });
const rental = (status: string | null | undefined) => resolveVitrinePosterModel({ availabilityStatus: status, transaction: "rental" });

describe("resolveVitrinePosterModel — vente", () => {
  it("correspondance validée : available / option / agreement / under_contract / sold", () => {
    expect(sale("available")).toEqual({ ok: true, model: "sale", label: "À vendre" });
    expect(sale("option")).toEqual({ ok: true, model: "under_offer", label: "Sous offre" });
    expect(sale("agreement")).toEqual({ ok: true, model: "under_contract", label: "Sous compromis" });
    expect(sale("under_contract")).toEqual({ ok: true, model: "under_contract", label: "Sous compromis" });
    expect(sale("sold")).toEqual({ ok: true, model: "sold", label: "Vendu" });
  });

  it("tolère casse et espaces (statut recopié tel quel de SweepBright)", () => {
    expect(sale(" Option ")).toEqual({ ok: true, model: "under_offer", label: "Sous offre" });
    expect(sale("SOLD")).toEqual({ ok: true, model: "sold", label: "Vendu" });
  });

  it("bloque : absent, vide, prospect, withdrawn, deleted, inconnu, loué", () => {
    for (const status of [null, undefined, "", "   ", "prospect", "withdrawn", "deleted", "on_hold", "rented", "let"]) {
      const result = sale(status);
      expect(result.ok, `statut ${String(status)}`).toBe(false);
      if (!result.ok) expect(result.error.length).toBeGreaterThan(10);
    }
  });
});

describe("resolveVitrinePosterModel — location", () => {
  it("available → À louer ; rented / let → Loué", () => {
    expect(rental("available")).toEqual({ ok: true, model: "rental", label: "À louer" });
    expect(rental("rented")).toEqual({ ok: true, model: "rented", label: "Loué" });
    expect(rental("let")).toEqual({ ok: true, model: "rented", label: "Loué" });
  });

  it("under_contract, option, agreement : bloquant (modèle non prévu), sold : incohérent", () => {
    for (const status of ["under_contract", "option", "agreement"]) {
      const result = rental(status);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain("non prévu");
    }
    const sold = rental("sold");
    expect(sold.ok).toBe(false);
    if (!sold.ok) expect(sold.error).toContain("incohérent");
  });

  it("bloque aussi : absent, prospect, withdrawn, deleted, inconnu", () => {
    for (const status of [null, "", "prospect", "withdrawn", "deleted", "zzz"]) {
      expect(rental(status).ok, `statut ${String(status)}`).toBe(false);
    }
  });
});

describe("modèles : libellés, titres, rubans", () => {
  it("chaque modèle a un libellé admin et un titre d'affiche", () => {
    for (const model of Object.keys(VITRINE_POSTER_MODEL_LABELS)) {
      expect(isVitrinePosterModel(model)).toBe(true);
      expect(VITRINE_POSTER_HEADLINES[model as keyof typeof VITRINE_POSTER_HEADLINES]).toMatch(/^Bien /);
    }
    expect(isVitrinePosterModel("vendu")).toBe(false);
    expect(isVitrinePosterModel(null)).toBe(false);
  });

  it("titres : « Bien vendu » et « Bien loué » réservés à sold et rented", () => {
    expect(VITRINE_POSTER_HEADLINES.sold).toBe("Bien vendu");
    expect(VITRINE_POSTER_HEADLINES.rented).toBe("Bien loué");
    expect(VITRINE_POSTER_HEADLINES.sale).toBe("Bien à vendre");
    expect(VITRINE_POSTER_HEADLINES.under_offer).toBe("Bien à vendre");
    expect(VITRINE_POSTER_HEADLINES.under_contract).toBe("Bien à vendre");
    expect(VITRINE_POSTER_HEADLINES.rental).toBe("Bien à louer");
    expect([...CLOSED_POSTER_MODELS].sort()).toEqual(["rented", "sold"]);
  });

  it("rubans : cotes Canva × 0,7502 et couleurs de la charte", () => {
    expect(VITRINE_RIBBONS.sale).toBeNull();
    expect(VITRINE_RIBBONS.rental).toBeNull();
    expect(VITRINE_RIBBONS.under_offer).toEqual({
      text: "SOUS OFFRE",
      fontSize: 30,
      letterSpacing: 3,
      bandColor: COLORS.sand,
      inkColor: COLORS.navy,
    });
    expect(VITRINE_RIBBONS.under_contract).toMatchObject({ text: "SOUS COMPROMIS", fontSize: 21.75, letterSpacing: 2.25, bandColor: COLORS.navy, inkColor: COLORS.sand });
    expect(VITRINE_RIBBONS.sold).toMatchObject({ text: "VENDU", fontSize: 40.5, letterSpacing: 6, bandColor: COLORS.navy, inkColor: COLORS.sand });
    expect(VITRINE_RIBBONS.rented).toMatchObject({ text: "LOUÉ", fontSize: 40.5, letterSpacing: 6, bandColor: COLORS.navy, inkColor: COLORS.sand });
  });
});
