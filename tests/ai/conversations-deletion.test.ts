import { beforeEach, describe, expect, it, vi } from "vitest";

// We test the deletion service at the boundary: supabaseAdmin is a
// chainable mock that captures filters per `from(table)` so we can
// verify the queries the service issues, and the emails / domain
// events are replaced with spies.

type MockResponse = { data: unknown; error: unknown };

type MockCall = {
  table: string;
  ops: Array<{ kind: string; args: unknown[] }>;
  response: MockResponse;
};

const setupSupabaseMock = () => {
  const responses = new Map<string, MockResponse[]>();
  const calls: MockCall[] = [];

  const pop = (table: string) => {
    const queue = responses.get(table);
    if (!queue || queue.length === 0) return { data: null, error: null };
    return queue.shift() as MockResponse;
  };

  const supabaseAdmin = {
    from(table: string) {
      const ops: MockCall["ops"] = [];
      const builder: Record<string, unknown> = {};
      const finish = () => {
        const response = pop(table);
        calls.push({ table, ops, response });
        return Promise.resolve(response);
      };
      const chain = (kind: string) => (...args: unknown[]) => {
        ops.push({ kind, args });
        return builder;
      };
      Object.assign(builder, {
        select: chain("select"),
        insert: (...args: unknown[]) => {
          ops.push({ kind: "insert", args });
          return finish();
        },
        update: chain("update"),
        delete: (...args: unknown[]) => {
          ops.push({ kind: "delete", args });
          return builder;
        },
        eq: chain("eq"),
        is: chain("is"),
        in: chain("in"),
        gt: chain("gt"),
        ilike: chain("ilike"),
        filter: chain("filter"),
        order: chain("order"),
        limit: (...args: unknown[]) => {
          ops.push({ kind: "limit", args });
          return finish();
        },
        maybeSingle: () => {
          ops.push({ kind: "maybeSingle", args: [] });
          return finish();
        },
      });
      return builder;
    },
  };

  return {
    supabaseAdmin,
    responses,
    calls,
    enqueue(table: string, response: MockResponse) {
      const queue = responses.get(table) ?? [];
      queue.push(response);
      responses.set(table, queue);
    },
  };
};

const mockState = setupSupabaseMock();

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: mockState.supabaseAdmin,
}));

const sendTransactionalEmailMock = vi.fn();
vi.mock("@/lib/email/smtp", () => ({
  sendTransactionalEmail: (...args: unknown[]) =>
    sendTransactionalEmailMock(...args),
}));

vi.mock("@/lib/email/layout", () => ({
  escapeHtml: (s: string) => s,
  renderEmailLayout: (input: { bodyHtml: string }) => input.bodyHtml,
}));

const emitDomainEventMock = vi.fn();
vi.mock("@/lib/events/domain-events", () => ({
  emitDomainEvent: (...args: unknown[]) => emitDomainEventMock(...args),
}));

beforeEach(() => {
  mockState.responses.clear();
  mockState.calls.length = 0;
  sendTransactionalEmailMock.mockReset();
  emitDomainEventMock.mockReset();
});

describe("requestConversationDeletion", () => {
  it("rejects malformed emails", async () => {
    const { requestConversationDeletion } = await import(
      "@/services/ai/conversations-deletion.service"
    );
    await expect(
      requestConversationDeletion({ email: "not-an-email" })
    ).rejects.toThrow(/Email invalide/);
  });

  it("stores a hashed code in api_idempotency_keys, sends the email, and emits a domain event", async () => {
    // delete previous: empty result is fine
    mockState.enqueue("api_idempotency_keys", { data: null, error: null });
    mockState.enqueue("api_idempotency_keys", { data: null, error: null });
    sendTransactionalEmailMock.mockResolvedValue({
      sent: true,
      provider: "smtp",
    });

    const { requestConversationDeletion } = await import(
      "@/services/ai/conversations-deletion.service"
    );
    const result = await requestConversationDeletion({
      email: "client@example.com",
      anonymousSessionId: "anon-1",
    });

    expect(result.ok).toBe(true);
    expect(result.delivered).toBe(true);
    expect(result.expiresInMinutes).toBe(15);

    const insertCall = mockState.calls.find(
      (c) =>
        c.table === "api_idempotency_keys" &&
        c.ops.some((o) => o.kind === "insert")
    );
    expect(insertCall).toBeDefined();
    const insertArgs = insertCall!.ops.find((o) => o.kind === "insert")!
      .args[0] as Record<string, unknown>;
    expect(insertArgs.scope).toBe("gdpr.conversation_deletion");
    expect(typeof insertArgs.key_hash).toBe("string");
    expect((insertArgs.key_hash as string).length).toBe(64);
    expect(insertArgs.response_payload).toMatchObject({
      anonymous_session_id: "anon-1",
    });

    expect(sendTransactionalEmailMock).toHaveBeenCalledTimes(1);
    expect(emitDomainEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregateType: "gdpr_request",
        eventName: "gdpr_deletion_requested",
      })
    );
  });
});

describe("executeConversationDeletion", () => {
  it("rejects an invalid 6-digit code shape", async () => {
    const { executeConversationDeletion } = await import(
      "@/services/ai/conversations-deletion.service"
    );
    await expect(
      executeConversationDeletion({
        email: "client@example.com",
        code: "12",
      })
    ).rejects.toThrow(/Code invalide/);
  });

  it("returns 0 when no row is found in api_idempotency_keys", async () => {
    mockState.enqueue("api_idempotency_keys", { data: null, error: null });

    const { executeConversationDeletion } = await import(
      "@/services/ai/conversations-deletion.service"
    );
    await expect(
      executeConversationDeletion({
        email: "client@example.com",
        code: "123456",
      })
    ).rejects.toThrow(/expir/);
  });
});
