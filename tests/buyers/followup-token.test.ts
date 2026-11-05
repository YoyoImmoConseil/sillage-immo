import { describe, expect, it } from "vitest";

import {
  buildFollowupToken,
  buildFollowupUrl,
  isFollowupTokenFreshForAutologin,
  parseFollowupToken,
  resolveFollowupTransition,
} from "@/lib/buyers/followup-token";

const SECRET = "test-secret";
const LEAD = "fd2fee50-6ad7-4e1a-813d-259b1d3515e9";

describe("followup token", () => {
  it("signe et relit un jeton sans donnée personnelle", () => {
    const token = buildFollowupToken({ leadId: LEAD, campaign: "mls-2026-11", issuedAt: 1762300000 }, SECRET);
    expect(token).not.toContain("@");
    expect(token).not.toContain(LEAD); // encodé, pas en clair
    expect(parseFollowupToken(token, SECRET)).toEqual({ leadId: LEAD, campaign: "mls-2026-11", issuedAt: 1762300000 });
  });
  it("rejette une signature altérée ou un autre secret", () => {
    const token = buildFollowupToken({ leadId: LEAD, campaign: "mls-2026-11", issuedAt: 1762300000 }, SECRET);
    expect(parseFollowupToken(token, "autre-secret")).toBeNull();
    expect(parseFollowupToken(`${token}x`, SECRET)).toBeNull();
    const [payload] = token.split(".");
    expect(parseFollowupToken(`${payload}.AAAA`, SECRET)).toBeNull();
    expect(parseFollowupToken("", SECRET)).toBeNull();
    expect(parseFollowupToken("a.b.c", SECRET)).toBeNull();
  });
  it("refuse un lead ou une campagne invalides à la construction", () => {
    expect(() => buildFollowupToken({ leadId: "nope", campaign: "x", issuedAt: 1 }, SECRET)).toThrow();
    expect(() => buildFollowupToken({ leadId: LEAD, campaign: "Bad Campaign", issuedAt: 1 }, SECRET)).toThrow();
  });
  it("construit l'URL du bouton", () => {
    const token = buildFollowupToken({ leadId: LEAD, campaign: "mls-2026-11", issuedAt: 1762300000 }, SECRET);
    expect(buildFollowupUrl("https://sillage-immo.com/", token, "visio")).toBe(
      `https://sillage-immo.com/suivi/${token}?r=visio`
    );
  });
  it("limite la connexion automatique à 60 jours", () => {
    const issuedAt = Math.floor(Date.parse("2026-11-05T10:00:00Z") / 1000);
    expect(isFollowupTokenFreshForAutologin({ leadId: LEAD, campaign: "c", issuedAt }, new Date("2026-12-20T10:00:00Z"))).toBe(true);
    expect(isFollowupTokenFreshForAutologin({ leadId: LEAD, campaign: "c", issuedAt }, new Date("2027-01-10T10:00:00Z"))).toBe(false);
  });
  it("traduit chaque réponse en statuts", () => {
    expect(resolveFollowupTransition("actif")).toEqual({ leadStatus: "active_search", profileStatus: "active" });
    expect(resolveFollowupTransition("visio")).toEqual({ leadStatus: "active_search", profileStatus: "active" });
    expect(resolveFollowupTransition("modif")).toEqual({ leadStatus: "active_search", profileStatus: "active" });
    expect(resolveFollowupTransition("conclu")).toEqual({ leadStatus: "lost", profileStatus: "closed" });
    expect(resolveFollowupTransition("abandon")).toEqual({ leadStatus: "lost", profileStatus: "closed" });
  });
});
