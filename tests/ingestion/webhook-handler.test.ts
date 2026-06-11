import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("server-only", () => ({}));

const {
  afterCallbacks,
  registerWebhookDeliveryMock,
  markDeliveryProcessingMock,
  markDeliveryProcessedMock,
  markDeliveryIgnoredMock,
  markDeliveryFailedMock,
} = vi.hoisted(() => ({
  afterCallbacks: [] as Array<() => Promise<unknown>>,
  registerWebhookDeliveryMock: vi.fn(),
  markDeliveryProcessingMock: vi.fn().mockResolvedValue(undefined),
  markDeliveryProcessedMock: vi.fn().mockResolvedValue(undefined),
  markDeliveryIgnoredMock: vi.fn().mockResolvedValue(undefined),
  markDeliveryFailedMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    after: (callback: () => Promise<unknown>) => {
      afterCallbacks.push(callback);
    },
  };
});

vi.mock("@/lib/ingestion/delivery-queue", () => ({
  registerWebhookDelivery: registerWebhookDeliveryMock,
  markDeliveryProcessing: markDeliveryProcessingMock,
  markDeliveryProcessed: markDeliveryProcessedMock,
  markDeliveryIgnored: markDeliveryIgnoredMock,
  markDeliveryFailed: markDeliveryFailedMock,
}));

import {
  createWebhookHandler,
  type SyncWebhookSource,
  type AsyncWebhookSource,
} from "@/lib/ingestion/webhook-handler";

const baseDelivery = {
  id: "delivery-1",
  provider: "test",
  event_key: "key-1",
  status: "received",
  attempts: 0,
  response_status: null,
  response_payload: null,
};

const makeRequest = (body = '{"hello":"world"}') =>
  new Request("https://example.test/api/webhooks/test", {
    method: "POST",
    body,
  });

const makeSyncSource = (
  overrides: Partial<SyncWebhookSource> = {}
): SyncWebhookSource => ({
  provider: "test",
  mode: "sync",
  authenticate: () => ({ ok: true }),
  parse: () => ({
    ok: true,
    eventName: "test.event",
    eventKey: "key-1",
    payload: { hello: "world" },
  }),
  process: vi.fn().mockResolvedValue({
    kind: "processed",
    data: { done: true },
  }),
  respond: (outcome) =>
    NextResponse.json({ ok: true, kind: outcome.kind, ...outcome.data }),
  respondDuplicate: () => NextResponse.json({ ok: true, duplicate: true }),
  respondError: () =>
    NextResponse.json({ ok: false, message: "boom" }, { status: 500 }),
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  afterCallbacks.length = 0;
});

describe("createWebhookHandler — mode sync", () => {
  it("rejette sans enregistrer quand l'authentification échoue", async () => {
    const source = makeSyncSource({
      authenticate: () => ({
        ok: false,
        response: NextResponse.json({ ok: false }, { status: 401 }),
      }),
    });
    const response = await createWebhookHandler(source)(makeRequest());
    expect(response.status).toBe(401);
    expect(registerWebhookDeliveryMock).not.toHaveBeenCalled();
  });

  it("rejette sans enregistrer quand le payload est invalide", async () => {
    const source = makeSyncSource({
      parse: () => ({
        ok: false,
        response: NextResponse.json({ ok: false }, { status: 400 }),
      }),
    });
    const response = await createWebhookHandler(source)(makeRequest());
    expect(response.status).toBe(400);
    expect(registerWebhookDeliveryMock).not.toHaveBeenCalled();
  });

  it("traite une livraison neuve et persiste le verdict + la réponse", async () => {
    registerWebhookDeliveryMock.mockResolvedValue({
      duplicate: false,
      delivery: { ...baseDelivery },
    });
    const source = makeSyncSource();
    const response = await createWebhookHandler(source)(makeRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      kind: "processed",
      done: true,
    });
    expect(markDeliveryProcessingMock).toHaveBeenCalledWith("delivery-1", 0);
    expect(markDeliveryProcessedMock).toHaveBeenCalledWith("delivery-1", {
      status: 200,
      payload: { ok: true, kind: "processed", done: true },
    });
  });

  it("rejoue la réponse d'un doublon déjà traité sans retraiter", async () => {
    registerWebhookDeliveryMock.mockResolvedValue({
      duplicate: true,
      delivery: { ...baseDelivery, status: "processed" },
    });
    const source = makeSyncSource();
    const response = await createWebhookHandler(source)(makeRequest());

    expect(await response.json()).toEqual({ ok: true, duplicate: true });
    expect(source.process).not.toHaveBeenCalled();
  });

  it("retraite un doublon dont la livraison avait échoué", async () => {
    registerWebhookDeliveryMock.mockResolvedValue({
      duplicate: true,
      delivery: { ...baseDelivery, status: "failed", attempts: 1 },
    });
    const source = makeSyncSource();
    const response = await createWebhookHandler(source)(makeRequest());

    expect(source.process).toHaveBeenCalled();
    expect(markDeliveryProcessingMock).toHaveBeenCalledWith("delivery-1", 1);
    expect((await response.json()).kind).toBe("processed");
  });

  it("ne retraite un doublon ignoré que si la source l'autorise", async () => {
    registerWebhookDeliveryMock.mockResolvedValue({
      duplicate: true,
      delivery: { ...baseDelivery, status: "ignored" },
    });

    const strict = makeSyncSource();
    await createWebhookHandler(strict)(makeRequest());
    expect(strict.process).not.toHaveBeenCalled();

    const lenient = makeSyncSource({ reprocessIgnoredDuplicates: true });
    await createWebhookHandler(lenient)(makeRequest());
    expect(lenient.process).toHaveBeenCalled();
  });

  it("clôt gracieusement en ignored (ex. property_not_found)", async () => {
    registerWebhookDeliveryMock.mockResolvedValue({
      duplicate: false,
      delivery: { ...baseDelivery },
    });
    const source = makeSyncSource({
      process: vi.fn().mockResolvedValue({
        kind: "ignored",
        reason: "property_not_found",
        data: { reason: "property_not_found" },
      }),
      respond: (outcome) =>
        NextResponse.json(
          { ok: true, accepted: false, ...outcome.data },
          { status: 202 }
        ),
    });
    const response = await createWebhookHandler(source)(makeRequest());

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({
      ok: true,
      accepted: false,
      reason: "property_not_found",
    });
    expect(markDeliveryIgnoredMock).toHaveBeenCalledWith(
      "delivery-1",
      "property_not_found",
      expect.objectContaining({ status: 202 })
    );
    expect(markDeliveryFailedMock).not.toHaveBeenCalled();
  });

  it("verdict partial : réponse succès mais livraison failed pour retry", async () => {
    registerWebhookDeliveryMock.mockResolvedValue({
      duplicate: false,
      delivery: { ...baseDelivery },
    });
    const source = makeSyncSource({
      process: vi.fn().mockResolvedValue({
        kind: "partial",
        data: { visitId: "v1" },
        retryError: "client_project_events emission failed",
      }),
    });
    const response = await createWebhookHandler(source)(makeRequest());

    expect(response.status).toBe(200);
    expect((await response.json()).visitId).toBe("v1");
    expect(markDeliveryFailedMock).toHaveBeenCalledWith(
      "delivery-1",
      "client_project_events emission failed"
    );
    expect(markDeliveryProcessedMock).not.toHaveBeenCalled();
  });

  it("marque failed et répond l'erreur source quand le traitement lève", async () => {
    registerWebhookDeliveryMock.mockResolvedValue({
      duplicate: false,
      delivery: { ...baseDelivery },
    });
    const source = makeSyncSource({
      process: vi.fn().mockRejectedValue(new Error("db down")),
    });
    const response = await createWebhookHandler(source)(makeRequest());

    expect(response.status).toBe(500);
    expect(markDeliveryFailedMock).toHaveBeenCalledWith("delivery-1", "db down");
  });
});

describe("createWebhookHandler — mode async", () => {
  const makeAsyncSource = (): AsyncWebhookSource => ({
    provider: "test-async",
    mode: "async",
    authenticate: () => ({ ok: true }),
    parse: () => ({
      ok: true,
      eventName: "estate-updated",
      eventKey: "key-1",
      payload: { estate_id: "e1" },
    }),
    processAsync: vi.fn().mockResolvedValue(undefined),
    respondAccepted: (delivery) =>
      NextResponse.json({
        ok: true,
        data: { deliveryId: delivery.id, duplicate: false, accepted: true },
      }),
    respondDuplicate: (delivery) =>
      NextResponse.json({
        ok: true,
        data: { deliveryId: delivery.id, duplicate: true, accepted: true },
      }),
    respondError: () =>
      NextResponse.json({ ok: false }, { status: 500 }),
  });

  it("ACK immédiat et traitement différé via after()", async () => {
    registerWebhookDeliveryMock.mockResolvedValue({
      duplicate: false,
      delivery: { ...baseDelivery },
    });
    const source = makeAsyncSource();
    const response = await createWebhookHandler(source)(makeRequest());

    expect(await response.json()).toEqual({
      ok: true,
      data: { deliveryId: "delivery-1", duplicate: false, accepted: true },
    });
    expect(source.processAsync).not.toHaveBeenCalled();
    expect(afterCallbacks).toHaveLength(1);
    await afterCallbacks[0]();
    expect(source.processAsync).toHaveBeenCalledWith("delivery-1");
  });

  it("un doublon ne replanifie pas de traitement", async () => {
    registerWebhookDeliveryMock.mockResolvedValue({
      duplicate: true,
      delivery: { ...baseDelivery, status: "failed" },
    });
    const source = makeAsyncSource();
    const response = await createWebhookHandler(source)(makeRequest());

    expect((await response.json()).data.duplicate).toBe(true);
    expect(afterCallbacks).toHaveLength(0);
  });
});
