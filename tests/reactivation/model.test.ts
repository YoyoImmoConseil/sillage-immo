import { describe, expect, it } from "vitest";

import {
  cleanFirstName,
  decideNextSend,
  isReactivationCampaign,
  isReactivationSendSlot,
  nextSendAtAfter,
  normalizeEmailForReactivation,
  pickSubjectVariant,
  resolveOwnerResponseStatus,
} from "@/lib/reactivation/model";

describe("réactivation — règles pures", () => {
  it("reconnaît une campagne de réactivation par son préfixe", () => {
    expect(isReactivationCampaign("reac-proprietaires-2026-11")).toBe(true);
    expect(isReactivationCampaign("mls-2026-11")).toBe(false);
  });

  it("attribue les objets A/B/C en rotation stricte", () => {
    expect([0, 1, 2, 3, 4, 5].map(pickSubjectVariant)).toEqual(["A", "B", "C", "A", "B", "C"]);
  });

  it("enchaîne J0 → J+7 → J+21 → dormant", () => {
    const sent = new Date("2026-11-09T08:00:00Z");
    expect(nextSendAtAfter(1, sent).toISOString()).toBe("2026-11-16T08:00:00.000Z");
    expect(nextSendAtAfter(2, sent).toISOString()).toBe("2026-11-23T08:00:00.000Z");
    expect(nextSendAtAfter(3, sent).toISOString()).toBe("2026-11-30T08:00:00.000Z");
  });

  it("décide l'étape suivante d'un contact", () => {
    const now = new Date("2026-11-20T08:00:00Z");
    expect(decideNextSend({ status: "pending", sequence_step: 0, next_send_at: null }, now)).toEqual({ kind: "send", step: 1 });
    expect(decideNextSend({ status: "sent", sequence_step: 1, next_send_at: "2026-11-16T08:00:00Z" }, now)).toEqual({ kind: "send", step: 2 });
    expect(decideNextSend({ status: "sent", sequence_step: 1, next_send_at: "2026-11-26T08:00:00Z" }, now)).toEqual({ kind: "skip" });
    expect(decideNextSend({ status: "sent", sequence_step: 2, next_send_at: "2026-11-19T08:00:00Z" }, now)).toEqual({ kind: "send", step: 3 });
    expect(decideNextSend({ status: "sent", sequence_step: 3, next_send_at: "2026-11-19T08:00:00Z" }, now)).toEqual({ kind: "dormant" });
    expect(decideNextSend({ status: "responded", sequence_step: 1, next_send_at: null }, now)).toEqual({ kind: "skip" });
    expect(decideNextSend({ status: "excluded", sequence_step: 0, next_send_at: null }, now)).toEqual({ kind: "skip" });
  });

  it("n'envoie qu'à 9 h de Paris, en semaine", () => {
    expect(isReactivationSendSlot(new Date("2026-11-09T08:30:00Z"))).toBe(true); // lundi, 9 h 30 Paris (hiver)
    expect(isReactivationSendSlot(new Date("2026-11-09T07:30:00Z"))).toBe(false); // 8 h 30 Paris
    expect(isReactivationSendSlot(new Date("2026-11-07T08:30:00Z"))).toBe(false); // samedi
    expect(isReactivationSendSlot(new Date("2026-07-06T07:30:00Z"))).toBe(true); // lundi, 9 h 30 Paris (été)
  });

  it("« stop » désinscrit, les autres réponses marquent le contact comme ayant répondu", () => {
    expect(resolveOwnerResponseStatus("stop")).toBe("unsubscribed");
    expect(resolveOwnerResponseStatus("vendre")).toBe("responded");
    expect(resolveOwnerResponseStatus("garde")).toBe("responded");
  });

  it("nettoie les prénoms douteux de SweepBright", () => {
    expect(cleanFirstName("jean")).toBe("Jean");
    expect(cleanFirstName("Marie-Laure")).toBe("Marie-Laure");
    expect(cleanFirstName("N/A")).toBeNull();
    expect(cleanFirstName("firstname")).toBeNull();
    expect(cleanFirstName("funes.e@hotmail.fr")).toBeNull();
    expect(cleanFirstName("")).toBeNull();
    expect(cleanFirstName(null)).toBeNull();
  });

  it("valide les e-mails", () => {
    expect(normalizeEmailForReactivation(" Jean.Martin@Example.com ")).toBe("jean.martin@example.com");
    expect(normalizeEmailForReactivation("pas un mail")).toBeNull();
  });
});
