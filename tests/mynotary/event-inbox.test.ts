import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Boîte de réception : réception idempotente (doublon = 2xx sans
 * retraitement), traitement différé dans l'ordre d'event_created_at,
 * statuts processed / ignored / error.
 */

type Row = {
  id: string;
  event_id: string;
  event_type: string;
  event_created_at: string | null;
  received_at: string;
  raw_payload: Record<string, unknown>;
  status: string;
  attempts: number;
  error: string | null;
  processed_at: string | null;
  locked_at: string | null;
};

const db = { rows: [] as Row[], updates: [] as Array<{ id: string; patch: Record<string, unknown> }> };

const supabaseAdmin = {
  from: (table: string) => {
    if (table !== "mynotary_events") throw new Error(`unexpected table ${table}`);
    return {
      insert: (values: Record<string, unknown>) => ({
        select: () => ({
          single: async () => {
            if (db.rows.some((r) => r.event_id === values.event_id)) {
              return { data: null, error: { code: "23505", message: "duplicate" } };
            }
            const row: Row = {
              id: `row-${db.rows.length + 1}`,
              event_id: String(values.event_id),
              event_type: String(values.event_type),
              event_created_at: (values.event_created_at as string | null) ?? null,
              received_at: new Date().toISOString(),
              raw_payload: (values.raw_payload as Record<string, unknown>) ?? {},
              status: "pending",
              attempts: 0,
              error: null,
              processed_at: null,
              locked_at: null,
            };
            db.rows.push(row);
            return { data: { id: row.id }, error: null };
          },
        }),
      }),
      select: () => ({
        eq: (_col: string, value: string) => ({
          maybeSingle: async () => ({
            data: db.rows.find((r) => r.event_id === value) ?? null,
            error: null,
          }),
        }),
      }),
      update: (patch: Record<string, unknown>) => ({
        eq: async (_col: string, id: string) => {
          db.updates.push({ id, patch });
          const row = db.rows.find((r) => r.id === id);
          if (row) Object.assign(row, patch);
          return { error: null };
        },
      }),
    };
  },
  rpc: async (fn: string, args: { p_limit: number }) => {
    if (fn !== "claim_mynotary_events") throw new Error(`unexpected rpc ${fn}`);
    const claimed = db.rows
      .filter((r) => r.status === "pending" || r.status === "error")
      .sort((a, b) => (a.event_created_at ?? "9").localeCompare(b.event_created_at ?? "9"))
      .slice(0, args.p_limit);
    for (const r of claimed) {
      r.status = "processing";
      r.attempts += 1;
    }
    return { data: claimed.map((r) => ({ ...r })), error: null };
  },
};

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin }));
vi.mock("@/lib/events/domain-events", () => ({ emitDomainEvent: vi.fn() }));
vi.mock("@/lib/mynotary/client", () => ({
  getContract: vi.fn(async () => ({ id: 1, model: "IMMOBILIER_LOCATION_BAIL", label: "Bail" })),
}));
vi.mock("@/services/mynotary/operation-enrichment.service", () => ({
  enrichFromOperation: vi.fn(async () => null),
}));

const processSignatureCompletedMock = vi.fn();
const softDeleteMock = vi.fn(async (_input: unknown) => ({ softDeleted: 1 }));
vi.mock("@/services/mynotary/signature-completed.service", () => ({
  processSignatureCompleted: (input: unknown) => processSignatureCompletedMock(input),
  softDeleteByContractOrOperation: (input: unknown) => softDeleteMock(input),
}));

const { recordMyNotaryEvent, processPendingMyNotaryEvents } = await import(
  "@/services/mynotary/event-inbox.service"
);

const parsed = (eventId: string, eventType: string, createdAt: string | null, data: Record<string, unknown>) => ({
  eventType: eventType as never,
  eventId,
  eventIdFromHeader: true,
  eventCreatedAt: createdAt,
  envelope: { event: eventType as never, data },
  raw: { eventId: eventType, ...data },
});

beforeEach(() => {
  db.rows.length = 0;
  db.updates.length = 0;
  processSignatureCompletedMock.mockReset();
  processSignatureCompletedMock.mockResolvedValue({
    skipped: false,
    contractKind: "lease",
    matched: false,
    confidence: 0,
  });
});

describe("recordMyNotaryEvent", () => {
  it("insère une fois et signale le doublon sans erreur", async () => {
    const first = await recordMyNotaryEvent(parsed("evt-1", "signature_completed", "2026-10-08T10:00:00.000Z", { contractId: 1, operationId: 2 }));
    const second = await recordMyNotaryEvent(parsed("evt-1", "signature_completed", "2026-10-08T10:00:00.000Z", { contractId: 1, operationId: 2 }));
    expect(first).toEqual({ duplicate: false, id: "row-1" });
    expect(second).toEqual({ duplicate: true, id: "row-1" });
    expect(db.rows).toHaveLength(1);
    expect(db.rows[0].status).toBe("pending");
    expect(processSignatureCompletedMock).not.toHaveBeenCalled();
  });
});

describe("processPendingMyNotaryEvents", () => {
  it("traite dans l'ordre de la date d'événement, pas de réception", async () => {
    await recordMyNotaryEvent(parsed("late", "signature_completed", "2026-10-08T12:00:00.000Z", { contractId: 20, operationId: 1 }));
    await recordMyNotaryEvent(parsed("early", "signature_completed", "2026-10-08T09:00:00.000Z", { contractId: 10, operationId: 1 }));
    const result = await processPendingMyNotaryEvents({ limit: 10 });
    expect(result).toMatchObject({ claimed: 2, processed: 2, ignored: 0, failed: 0 });
    const contractIds = processSignatureCompletedMock.mock.calls.map(
      (call) => (call[0] as { payload: { contractId: number } }).payload.contractId
    );
    expect(contractIds).toEqual([10, 20]);
    expect(db.rows.every((r) => r.status === "processed" && r.processed_at)).toBe(true);
  });

  it("ignore un type non projeté en gardant la ligne, et marque un échec en error", async () => {
    await recordMyNotaryEvent(parsed("c", "contract_created", "2026-10-08T09:00:00.000Z", { contractId: 1 }));
    await recordMyNotaryEvent(parsed("d", "signature_cancel", "2026-10-08T09:01:00.000Z", { contractId: 1 }));
    softDeleteMock.mockRejectedValueOnce(new Error("db down"));
    const result = await processPendingMyNotaryEvents({ limit: 10 });
    expect(result).toMatchObject({ claimed: 2, processed: 0, ignored: 1, failed: 1 });
    const ignored = db.rows.find((r) => r.event_id === "c");
    const failed = db.rows.find((r) => r.event_id === "d");
    expect(ignored?.status).toBe("ignored");
    expect(ignored?.error).toBe("event_type_ignored");
    expect(failed?.status).toBe("error");
    expect(failed?.error).toBe("db down");
    expect(failed?.attempts).toBe(1);
  });

  it("reprend un événement en error au passage suivant", async () => {
    await recordMyNotaryEvent(parsed("d", "signature_cancel", null, { contractId: 1 }));
    softDeleteMock.mockRejectedValueOnce(new Error("transient"));
    await processPendingMyNotaryEvents({ limit: 10 });
    const retry = await processPendingMyNotaryEvents({ limit: 10 });
    expect(retry).toMatchObject({ claimed: 1, processed: 1 });
    expect(db.rows[0].status).toBe("processed");
    expect(db.rows[0].attempts).toBe(2);
  });
});
