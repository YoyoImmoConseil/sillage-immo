import { beforeEach, describe, expect, it, vi } from "vitest";

const recordOwnerResponse = vi.fn();
const recordFollowupResponse = vi.fn();
const verifyFollowupToken = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/services/reactivation/reactivation-followup.service", () => ({
  recordOwnerResponse: (...args: unknown[]) => recordOwnerResponse(...args),
}));
vi.mock("@/services/buyers/buyer-followup.service", () => ({
  recordFollowupResponse: (...args: unknown[]) => recordFollowupResponse(...args),
  verifyFollowupToken: (...args: unknown[]) => verifyFollowupToken(...args),
}));

import { POST } from "@/app/suivi/[token]/confirm/route";

const TOKEN = "jeton.signe";
const payload = { leadId: "11111111-1111-4111-8111-111111111111", campaign: "reac-proprietaires-2026-11", issuedAt: 1_793_979_456 };

const post = (fields: Record<string, string>, userAgent = "Mozilla/5.0 (test)") => {
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) body.set(key, value);
  const request = new Request(`https://sillage-immo.com/suivi/${TOKEN}/confirm`, {
    method: "POST",
    body,
    headers: { "user-agent": userAgent },
  });
  return POST(request, { params: Promise.resolve({ token: TOKEN }) });
};

describe("POST /suivi/<jeton>/confirm — réactivation propriétaires", () => {
  beforeEach(() => {
    recordOwnerResponse.mockReset();
    recordFollowupResponse.mockReset();
    verifyFollowupToken.mockReset();
    verifyFollowupToken.mockReturnValue(payload);
    recordOwnerResponse.mockResolvedValue({ duplicate: false, notified: true });
  });

  it("enregistre la réponse une fois et revient sur la page en done=1", async () => {
    const response = await post({ r: "vendre" }, "Mozilla/5.0 (iPhone)");
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`https://sillage-immo.com/suivi/${TOKEN}?r=vendre&done=1`);
    expect(recordOwnerResponse).toHaveBeenCalledTimes(1);
    expect(recordOwnerResponse).toHaveBeenCalledWith({ payload, response: "vendre", userAgent: "Mozilla/5.0 (iPhone)" });
    expect(recordFollowupResponse).not.toHaveBeenCalled();
  });

  it("accepte toutes les réponses propriétaires (garde, rappel, visio, cherche…)", async () => {
    for (const r of ["valeur", "garde", "rappel", "visio", "cherche", "vendu_cherche", "vendu", "stop"]) {
      recordOwnerResponse.mockClear();
      const response = await post({ r });
      expect(response.headers.get("location")).toContain(`?r=${r}&done=1`);
      expect(recordOwnerResponse).toHaveBeenCalledTimes(1);
    }
  });

  it("en aperçu (mail de test), n'écrit rien et conserve apercu=1 au retour", async () => {
    const response = await post({ r: "vendre", apercu: "1" });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`https://sillage-immo.com/suivi/${TOKEN}?r=vendre&done=1&apercu=1`);
    expect(recordOwnerResponse).not.toHaveBeenCalled();
  });

  it("ignore une réponse inconnue et un jeton invalide", async () => {
    const unknown = await post({ r: "pirate" });
    expect(unknown.headers.get("location")).toBe(`https://sillage-immo.com/suivi/${TOKEN}`);
    expect(recordOwnerResponse).not.toHaveBeenCalled();

    verifyFollowupToken.mockReturnValue(null);
    const invalid = await post({ r: "vendre" });
    expect(invalid.headers.get("location")).toBe(`https://sillage-immo.com/suivi/${TOKEN}`);
    expect(recordOwnerResponse).not.toHaveBeenCalled();
  });

  it("revient sur la page sans done si l'enregistrement échoue", async () => {
    recordOwnerResponse.mockRejectedValueOnce(new Error("db down"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await post({ r: "garde" });
    expect(response.headers.get("location")).toBe(`https://sillage-immo.com/suivi/${TOKEN}`);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
