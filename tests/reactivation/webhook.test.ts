import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildReactivationWebhookPayload,
  pushReactivationWebhook,
  type ReactivationWebhookContact,
} from "@/lib/reactivation/webhook";

const contact: ReactivationWebhookContact = {
  id: "11111111-1111-4111-8111-111111111111",
  campaign: "reac-proprietaires-2026-11",
  segment: "v1_proprietaire",
  sweepbright_contact_id: "sb-123",
  email: "danielle@example.test",
  full_name: "DANIELLE ATTAL",
  first_name: "Danielle",
  last_name: "ATTAL",
  phone: "+33649390821",
  negotiator: "Jordan Saiman",
};

const baseInput = {
  event: "reactivation_response",
  contact,
  response: "vendre" as const,
  newStatus: "responded",
  sellerLeadId: "22222222-2222-4222-8222-222222222222",
  at: "2026-11-08T09:00:00.000Z",
};

const EXPECTED_KEYS = [
  "event",
  "campaign",
  "segment",
  "response",
  "response_label",
  "contact_id",
  "sweepbright_contact_id",
  "email",
  "full_name",
  "first_name",
  "last_name",
  "negotiator",
  "phone",
  "status",
  "seller_lead_id",
  "answered_at",
];

describe("buildReactivationWebhookPayload", () => {
  it("reprend les champs historiques et ajoute prénom, nom et négociateur", () => {
    const payload = buildReactivationWebhookPayload(baseInput);
    expect(Object.keys(payload)).toEqual(EXPECTED_KEYS);
    expect(payload).toMatchObject({
      event: "reactivation_response",
      campaign: "reac-proprietaires-2026-11",
      segment: "v1_proprietaire",
      response: "vendre",
      contact_id: contact.id,
      sweepbright_contact_id: "sb-123",
      email: "danielle@example.test",
      full_name: "DANIELLE ATTAL",
      first_name: "Danielle",
      last_name: "ATTAL",
      negotiator: "Jordan Saiman",
      phone: "+33649390821",
      status: "responded",
      seller_lead_id: baseInput.sellerLeadId,
      answered_at: "2026-11-08T09:00:00.000Z",
    });
    expect(typeof payload.response_label).toBe("string");
    expect(payload.response_label.length).toBeGreaterThan(0);
  });

  it("transmet null (et non undefined) quand la fiche n'a ni prénom, ni nom, ni négociateur", () => {
    const payload = buildReactivationWebhookPayload({
      ...baseInput,
      contact: { ...contact, first_name: null, last_name: null, negotiator: null },
      sellerLeadId: null,
    });
    expect(payload.first_name).toBeNull();
    expect(payload.last_name).toBeNull();
    expect(payload.negotiator).toBeNull();
    // JSON.stringify conserve les null : le Zap voit bien la clé, vide.
    const wire = JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
    expect(Object.keys(wire)).toEqual(EXPECTED_KEYS);
    expect(wire.negotiator).toBeNull();
  });
});

describe("pushReactivationWebhook", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    vi.stubEnv("REACTIVATION_WEBHOOK_URL", "https://hooks.example.test/catch/abc");
    vi.stubEnv("BUYER_FOLLOWUP_WEBHOOK_URL", "");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  const sentBody = (): Record<string, unknown> => {
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://hooks.example.test/catch/abc");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["content-type"]).toBe("application/json");
    expect(init.signal).toBeInstanceOf(AbortSignal);
    return JSON.parse(String(init.body)) as Record<string, unknown>;
  };

  it("envoie prénom, nom et négociateur du contact dans le corps", async () => {
    await pushReactivationWebhook(baseInput);
    const body = sentBody();
    expect(body.first_name).toBe("Danielle");
    expect(body.last_name).toBe("ATTAL");
    expect(body.negotiator).toBe("Jordan Saiman");
    expect(body.full_name).toBe("DANIELLE ATTAL");
    expect(body.response).toBe("vendre");
    expect(Object.keys(body)).toEqual(EXPECTED_KEYS);
  });

  it("envoie negotiator: null quand la fiche n'a pas de négociateur", async () => {
    await pushReactivationWebhook({
      ...baseInput,
      contact: { ...contact, first_name: null, last_name: null, negotiator: null },
    });
    const body = sentBody();
    expect(body).toHaveProperty("negotiator", null);
    expect(body).toHaveProperty("first_name", null);
    expect(body).toHaveProperty("last_name", null);
  });

  it("ne fait rien sans URL configurée", async () => {
    vi.stubEnv("REACTIVATION_WEBHOOK_URL", "");
    vi.stubEnv("BUYER_FOLLOWUP_WEBHOOK_URL", "");
    await pushReactivationWebhook(baseInput);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("logue sans lever quand le webhook échoue ou répond en erreur", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockRejectedValueOnce(new Error("boom"));
    await expect(pushReactivationWebhook(baseInput)).resolves.toBeUndefined();
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });
    await expect(pushReactivationWebhook(baseInput)).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledTimes(2);
  });
});
