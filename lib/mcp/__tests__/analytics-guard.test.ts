import { describe, expect, it, vi } from "vitest";

// The analytics.query tool runs a server-side guard BEFORE touching the DB
// RPC. We exercise that guard by calling the handler with queries that must be
// rejected before any rpc round-trip. supabaseAdmin is stubbed so a forbidden
// query never reaches the network.
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    rpc: vi.fn(() => Promise.resolve({ data: [], error: null })),
  },
}));
vi.mock("@/services/transactions/transaction.service", () => ({
  listTransactions: vi.fn(),
  getTransactionById: vi.fn(),
}));
vi.mock("@/services/buyers/buyer-presented-property.service", () => ({
  listPresentedPropertiesForProject: vi.fn(),
}));

const getHandler = async () => {
  const { analyticsTools } = await import("@/lib/mcp/tools/analytics");
  const tool = analyticsTools.find((t) => t.name === "analytics.query");
  if (!tool) throw new Error("analytics.query missing");
  return tool.handler;
};

const ctx = {
  requestId: "r1",
  actor: "user" as const,
  actorType: "user" as const,
  actorId: "admin-1",
  actorRole: "administrateur" as const,
  actorEmail: null,
};

describe("analytics.query server-side guard", () => {
  it("rejects non-SELECT statements", async () => {
    const handler = await getHandler();
    await expect(
      handler({ query: "update transactions set status='acte'" }, ctx)
    ).rejects.toThrow();
  });

  it("rejects multiple statements", async () => {
    const handler = await getHandler();
    await expect(
      handler(
        { query: "select 1 from analytics_transactions; select 2" },
        ctx
      )
    ).rejects.toThrow();
  });

  it("rejects forbidden keywords", async () => {
    const handler = await getHandler();
    await expect(
      handler({ query: "select * from analytics_transactions; drop table x" }, ctx)
    ).rejects.toThrow();
  });

  it("rejects access to PII-bearing relations", async () => {
    const handler = await getHandler();
    await expect(
      handler({ query: "select email from seller_leads" }, ctx)
    ).rejects.toThrow();
  });

  it("allows a SELECT over analytics_* views", async () => {
    const handler = await getHandler();
    const result = (await handler(
      {
        query:
          "select advisor_name, ca_realized from analytics_advisor_performance order by ca_realized desc",
      },
      ctx
    )) as { rows: unknown[]; count: number };
    expect(result.count).toBe(0);
    expect(Array.isArray(result.rows)).toBe(true);
  });
});
