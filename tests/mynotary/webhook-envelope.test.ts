import { describe, expect, it } from "vitest";
import { parseMyNotaryWebhook } from "@/lib/mynotary/webhook-envelope";

const headers = (map: Record<string, string>) => ({
  get: (name: string) => map[name.toLowerCase()] ?? null,
});

const fallback = { fallbackEventId: (body: string) => `hash:${body.length}` };

describe("parseMyNotaryWebhook", () => {
  it("lit le format spec : payload à plat, type dans eventId, id et date dans les en-têtes", () => {
    const body = JSON.stringify({
      eventId: "signature_completed",
      userId: 148363,
      organizationId: 8971,
      signatureId: 55,
      operationId: 30405665,
      contractId: 3963465,
      signatureTime: "2026-10-08T09:12:00.000Z",
      files: [{ signedFileId: "a1b2", name: "Bail", url: "https://x/y/a1b2" }],
    });
    const result = parseMyNotaryWebhook(
      body,
      headers({
        "x-mynotary-event-id": "evt_123",
        "x-mynotary-event-creation-time": "2026-10-08T09:12:01.500Z",
      }),
      fallback
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.eventType).toBe("signature_completed");
    expect(result.value.eventId).toBe("evt_123");
    expect(result.value.eventIdFromHeader).toBe(true);
    expect(result.value.eventCreatedAt).toBe("2026-10-08T09:12:01.500Z");
    expect(result.value.envelope.event).toBe("signature_completed");
    expect((result.value.envelope.data as { contractId: number }).contractId).toBe(3963465);
  });

  it("ne confond pas eventId (type) avec l'identifiant : sans en-tête, repli sur le hash du corps", () => {
    const body = JSON.stringify({ eventId: "signature_cancel", contractId: 1, operationId: 2 });
    const result = parseMyNotaryWebhook(body, headers({}), fallback);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.eventId).toBe(`hash:${body.length}`);
    expect(result.value.eventIdFromHeader).toBe(false);
    expect(result.value.eventCreatedAt).toBeNull();
  });

  it("tolère l'ancienne forme { event, data }", () => {
    const body = JSON.stringify({ event: "operation_deleted", data: { operationId: 9 } });
    const result = parseMyNotaryWebhook(body, headers({ "x-mynotary-event-id": "e9" }), fallback);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.eventType).toBe("operation_deleted");
    expect((result.value.envelope.data as { operationId: number }).operationId).toBe(9);
  });

  it("rejette un JSON invalide, un type inconnu et une date d'en-tête illisible", () => {
    expect(parseMyNotaryWebhook("{", headers({}), fallback)).toEqual({ ok: false, code: "invalid_json" });
    expect(parseMyNotaryWebhook(JSON.stringify({ eventId: "nope" }), headers({}), fallback)).toEqual({
      ok: false,
      code: "invalid_payload",
    });
    const result = parseMyNotaryWebhook(
      JSON.stringify({ eventId: "contract_validated", contractId: 1 }),
      headers({ "x-mynotary-event-id": "e1", "x-mynotary-event-creation-time": "hier" }),
      fallback
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.eventCreatedAt).toBeNull();
  });
});
