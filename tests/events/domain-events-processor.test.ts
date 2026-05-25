import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const embedFromDomainEventMock = vi.fn();
vi.mock("@/services/ai/embedding-worker.service", () => ({
  embedFromDomainEvent: embedFromDomainEventMock,
}));

type PendingEvent = {
  id: string;
  aggregate_type: string;
  aggregate_id: string;
  event_name: string;
  event_version: number;
  payload: Record<string, unknown>;
  attempts: number;
};

const auditInsertMock = vi.fn().mockResolvedValue({ data: null, error: null });
const limitMock = vi.fn();
const updateEqMock = vi.fn();
const headSelectEqMock = vi.fn();

const fromMock = vi.fn((table: string) => {
  if (table === "audit_log") {
    return { insert: auditInsertMock };
  }
  if (table === "domain_events") {
    return {
      select: vi.fn((_columns?: unknown, options?: { count?: string; head?: boolean }) => {
        if (options?.head) {
          return { eq: headSelectEqMock };
        }
        return {
          eq: vi.fn().mockReturnValue({
            lt: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({ limit: limitMock }),
            }),
          }),
        };
      }),
      update: vi.fn().mockReturnValue({ eq: updateEqMock }),
    };
  }
  throw new Error(`Unexpected table mock: ${table}`);
});

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: (table: string) => fromMock(table),
  },
}));

const seedPendingEvents = (events: PendingEvent[]) => {
  limitMock.mockResolvedValueOnce({ data: events, error: null });
};

beforeEach(() => {
  embedFromDomainEventMock.mockReset();
  embedFromDomainEventMock.mockResolvedValue(null);
  auditInsertMock.mockClear();
  limitMock.mockReset();
  updateEqMock.mockReset();
  updateEqMock.mockResolvedValue({ data: null, error: null });
  headSelectEqMock.mockReset();
  headSelectEqMock.mockResolvedValue({ count: 0, error: null });
  fromMock.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("processPendingDomainEvents — embedding worker auto-wire", () => {
  it("calls embedFromDomainEvent after a seller_lead.created event is marked processed", async () => {
    seedPendingEvents([
      {
        id: "evt-1",
        aggregate_type: "seller_lead",
        aggregate_id: "lead-123",
        event_name: "seller_lead.created",
        event_version: 1,
        payload: {},
        attempts: 0,
      },
    ]);

    const { processPendingDomainEvents } = await import(
      "@/services/events/domain-events-processor.service"
    );

    const result = await processPendingDomainEvents(10);

    expect(result).toEqual({ scanned: 1, processed: 1, failed: 0, retried: 0 });
    expect(embedFromDomainEventMock).toHaveBeenCalledTimes(1);
    expect(embedFromDomainEventMock).toHaveBeenCalledWith({
      eventName: "seller_lead.created",
      aggregateId: "lead-123",
    });
  });

  it("dispatches embedding for buyer_lead.created and property_listing.published in a single batch", async () => {
    seedPendingEvents([
      {
        id: "evt-2",
        aggregate_type: "buyer_lead",
        aggregate_id: "buyer-1",
        event_name: "buyer_lead.created",
        event_version: 1,
        payload: {},
        attempts: 0,
      },
      {
        id: "evt-3",
        aggregate_type: "property_listing",
        aggregate_id: "listing-9",
        event_name: "property_listing.published",
        event_version: 1,
        payload: {},
        attempts: 0,
      },
    ]);

    const { processPendingDomainEvents } = await import(
      "@/services/events/domain-events-processor.service"
    );

    const result = await processPendingDomainEvents(10);

    expect(result.processed).toBe(2);
    expect(embedFromDomainEventMock).toHaveBeenCalledTimes(2);
    expect(embedFromDomainEventMock).toHaveBeenNthCalledWith(1, {
      eventName: "buyer_lead.created",
      aggregateId: "buyer-1",
    });
    expect(embedFromDomainEventMock).toHaveBeenNthCalledWith(2, {
      eventName: "property_listing.published",
      aggregateId: "listing-9",
    });
  });

  it("does not fail processing when the embedding worker throws", async () => {
    embedFromDomainEventMock.mockRejectedValue(new Error("openai down"));

    seedPendingEvents([
      {
        id: "evt-4",
        aggregate_type: "seller_lead",
        aggregate_id: "lead-err",
        event_name: "seller_lead.scored",
        event_version: 1,
        payload: {},
        attempts: 0,
      },
    ]);

    const { processPendingDomainEvents } = await import(
      "@/services/events/domain-events-processor.service"
    );

    const result = await processPendingDomainEvents(10);

    expect(result).toEqual({ scanned: 1, processed: 1, failed: 0, retried: 0 });
    expect(embedFromDomainEventMock).toHaveBeenCalledTimes(1);
  });

  it("does not dispatch embedding for events that fail processing", async () => {
    seedPendingEvents([
      {
        id: "evt-5",
        aggregate_type: "unknown",
        aggregate_id: "x",
        event_name: "unknown.event",
        event_version: 1,
        payload: {},
        attempts: 0,
      },
    ]);

    const { processPendingDomainEvents } = await import(
      "@/services/events/domain-events-processor.service"
    );

    const result = await processPendingDomainEvents(10);

    expect(result.processed).toBe(0);
    expect(result.retried).toBe(1);
    expect(embedFromDomainEventMock).not.toHaveBeenCalled();
  });
});
