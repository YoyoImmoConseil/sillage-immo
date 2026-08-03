import { describe, expect, it } from "vitest";
import {
  priceContextForOccurrence,
  resolveOfferOccurrence,
  zapierOfferPayloadSchema,
} from "@/lib/sweepbright/offer-payload-schema";

// Corps exact relevé dans l'onglet Test du Zap 374991638 le 03/08/2026.
// Toutes les valeurs sont des chaînes et les champs vides des chaînes vides :
// c'est la seule forme qui ne casse pas le JSON quand SweepBright laisse un
// champ vide.
const ZAP_SAMPLE = {
  event: "offer.changed",
  reason: "accepted",
  offer: {
    id: "TEST-6303807126109b7031f9f60c",
    parent_id: "",
    property_id: "TEST-ffff-3197-ab4e-b8f9",
    company_id: "TEST-40995c2a-0a2b-40ab-8bf9-1cfea07011f1",
    status: "PENDING",
    notes: "Hello world!",
    created_at: "2022-08-22T13:11:13.886Z",
    updated_at: "2022-08-22T13:11:13.886Z",
    valid_until: "2021-07-08T09:00:00.000Z",
    accepted_at: "",
    refused_at: "",
    cancelled_at: "",
    archived_at: "",
  },
  financials: {
    currency: "EUR",
    direction: "BUYER_TO_OWNER",
    transaction_amount: "972027",
    buyer_gross_amount: "1000000",
    owner_net_amount: "960029.73",
    total_agency_fee: "39970.270000000004",
    buyer_total_fee: "27973.000000000004",
    buyer_fee_fixed: "1000",
    buyer_fee_percentage: "2.7",
    owner_total_fee: "11997.27",
    owner_fee_fixed: "2300",
    owner_fee_percentage: "1",
  },
};

describe("zapierOfferPayloadSchema", () => {
  it("accepte le corps reel du Zap et convertit les montants en nombres", () => {
    const result = zapierOfferPayloadSchema.safeParse(ZAP_SAMPLE);
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.financials.buyer_gross_amount).toBe(1000000);
    expect(result.data.financials.owner_net_amount).toBeCloseTo(960029.73, 2);
    expect(result.data.financials.buyer_fee_percentage).toBeCloseTo(2.7, 3);
  });

  it("traite les chaines vides comme non renseignees", () => {
    const result = zapierOfferPayloadSchema.safeParse(ZAP_SAMPLE);
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.offer.parent_id).toBeNull();
    expect(result.data.offer.accepted_at).toBeNull();
    expect(result.data.offer.refused_at).toBeNull();
  });

  it("accepte les sous-objets serialises en repr() Python", () => {
    // Comportement déjà constaté en production sur le webhook des visites :
    // l'aperçu de test montre du JSON imbriqué, l'envoi réel une chaîne.
    const result = zapierOfferPayloadSchema.safeParse({
      event: "offer.changed",
      reason: "created",
      offer: "{'id': 'OFF-1', 'property_id': 'EST-1', 'status': 'PENDING', 'created_at': '2026-08-01T10:00:00.000Z'}",
      financials: "{'currency': 'EUR', 'buyer_gross_amount': '220000'}",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.offer.id).toBe("OFF-1");
    expect(result.data.financials.buyer_gross_amount).toBe(220000);
  });

  it("tolere l'absence complete du bloc financials", () => {
    // Zapier omet un sous-objet dont tous les champs sont vides.
    const result = zapierOfferPayloadSchema.safeParse({
      event: "offer.changed",
      reason: "created",
      offer: { id: "OFF-2", property_id: "EST-2" },
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.financials.buyer_gross_amount).toBeNull();
  });

  it("refuse un evenement d'un autre type", () => {
    const result = zapierOfferPayloadSchema.safeParse({
      ...ZAP_SAMPLE,
      event: "visit.scheduled",
    });
    expect(result.success).toBe(false);
  });
});

describe("resolveOfferOccurrence", () => {
  const base = {
    id: "OFF-1",
    parent_id: null,
    property_id: "EST-1",
    company_id: null,
    status: null,
    notes: null,
    created_at: "2026-08-01T10:00:00.000Z",
    updated_at: "2026-08-01T10:00:00.000Z",
    valid_until: null,
    accepted_at: null,
    refused_at: null,
    cancelled_at: null,
    archived_at: null,
  };
  const fallback = "2026-08-03T12:00:00.000Z";

  it("date une offre neuve a sa creation", () => {
    expect(resolveOfferOccurrence(base, fallback)).toEqual({
      at: "2026-08-01T10:00:00.000Z",
      kind: "created",
    });
  });

  it("prefere la date d'acceptation a toutes les autres", () => {
    const result = resolveOfferOccurrence(
      { ...base, updated_at: "2026-08-05T09:00:00.000Z", accepted_at: "2026-08-04T15:30:00.000Z" },
      fallback
    );
    // Une offre acceptee puis modifiee doit rester datee de son acceptation,
    // sinon l'ecart de prix publie glisse dans le temps.
    expect(result).toEqual({ at: "2026-08-04T15:30:00.000Z", kind: "accepted" });
  });

  it("distingue refus, annulation et archivage", () => {
    expect(resolveOfferOccurrence({ ...base, refused_at: "2026-08-02T08:00:00.000Z" }, fallback).kind).toBe("refused");
    expect(resolveOfferOccurrence({ ...base, cancelled_at: "2026-08-02T08:00:00.000Z" }, fallback).kind).toBe("cancelled");
    expect(resolveOfferOccurrence({ ...base, archived_at: "2026-08-02T08:00:00.000Z" }, fallback).kind).toBe("archived");
  });

  it("detecte une simple mise a jour", () => {
    const result = resolveOfferOccurrence(
      { ...base, updated_at: "2026-08-02T11:00:00.000Z" },
      fallback
    );
    expect(result).toEqual({ at: "2026-08-02T11:00:00.000Z", kind: "updated" });
  });

  it("retombe sur la date de reception si aucune date n'est exploitable", () => {
    const result = resolveOfferOccurrence(
      { ...base, created_at: "", updated_at: "pas une date" },
      fallback
    );
    expect(result).toEqual({ at: fallback, kind: "updated" });
  });
});

describe("priceContextForOccurrence", () => {
  it("classe une offre acceptee en agreement", () => {
    // SweepBright n'expose ni prix de compromis ni prix d'acte : le montant de
    // l'offre acceptee est le prix obtenu, second terme du ratio publie.
    expect(priceContextForOccurrence("accepted")).toBe("agreement");
  });

  it("classe creation et refus en offre", () => {
    expect(priceContextForOccurrence("created")).toBe("offer");
    expect(priceContextForOccurrence("refused")).toBe("offer");
  });

  it("n'ecrit rien pour annulation, archivage et mise a jour", () => {
    // Ces evenements ne portent aucun prix nouveau : sans ce filtre, chaque
    // rejeu du cron ajouterait une ligne au journal.
    expect(priceContextForOccurrence("cancelled")).toBeNull();
    expect(priceContextForOccurrence("archived")).toBeNull();
    expect(priceContextForOccurrence("updated")).toBeNull();
  });
});
