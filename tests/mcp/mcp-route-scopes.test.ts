import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { McpKeyContext } from "@/services/mcp/mcp-api-key.service";

vi.mock("server-only", () => ({}));

// Boundary mocks: auth, registry, audit, versioning, idempotency, bootstrap.
const isInternalRequestMock = vi.fn().mockResolvedValue(false);
vi.mock("@/lib/admin/auth", () => ({
  isInternalRequest: (req: Request) => isInternalRequestMock(req),
  getAdminRequestContext: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/lib/mcp/bootstrap", () => ({ bootstrapMcpRegistry: vi.fn() }));
vi.mock("@/lib/mcp/audit", () => ({ logMcpCall: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/mcp/versioning", () => ({
  isRegisteredToolVersion: vi.fn().mockResolvedValue(true),
}));
vi.mock("@/lib/idempotency/mcp-idempotency", () => ({
  checkMcpIdempotency: vi.fn().mockResolvedValue({ kind: "none" }),
  persistMcpIdempotencyResponse: vi.fn().mockResolvedValue(undefined),
}));

const TOOLS: Record<
  string,
  { name: string; version: string; mutates?: boolean; readsPii?: boolean }
> = {
  "public_listings.search": { name: "public_listings.search", version: "1.0.0" },
  "leads.create": { name: "leads.create", version: "1.0.0", mutates: true },
  "seller_leads.get_context": {
    name: "seller_leads.get_context",
    version: "1.0.0",
    readsPii: true,
  },
};
const baseSchema = { type: "object", properties: {}, additionalProperties: true } as const;
vi.mock("@/lib/mcp/registry", () => ({
  listTools: vi.fn(() => Object.values(TOOLS)),
  getTool: vi.fn((name: string) => {
    const t = TOOLS[name];
    if (!t) return null;
    return {
      ...t,
      inputSchema: baseSchema,
      handler: vi.fn().mockResolvedValue({ ok: true, tool: name }),
    };
  }),
}));

const resolveMcpApiKeyMock = vi.fn<(raw: string) => Promise<McpKeyContext | null>>();
vi.mock("@/services/mcp/mcp-api-key.service", () => ({
  resolveMcpApiKey: (raw: string) => resolveMcpApiKeyMock(raw),
}));

const makeRequest = (headers: Record<string, string>, body: unknown) =>
  new Request("http://localhost/api/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

const readOnlyKey: McpKeyContext = {
  id: "key-1",
  name: "Claude Desktop (read-only)",
  toolAllowlist: ["public_listings.search"],
  canWrite: false,
  canReadPii: false,
  ipAllowlist: null,
  rateLimitPerMinute: null,
};

beforeEach(() => {
  isInternalRequestMock.mockResolvedValue(false);
  resolveMcpApiKeyMock.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("MCP route — named key scope enforcement", () => {
  it("rejects requests with neither internal auth nor a valid key (401)", async () => {
    resolveMcpApiKeyMock.mockResolvedValue(null);
    const { POST } = await import("@/app/api/mcp/route");
    const res = await POST(
      makeRequest({}, { tool: "public_listings.search", input: {} })
    );
    expect(res.status).toBe(401);
  });

  it("allows an allowlisted read-only tool for a scoped key (200)", async () => {
    resolveMcpApiKeyMock.mockResolvedValue(readOnlyKey);
    const { POST } = await import("@/app/api/mcp/route");
    const res = await POST(
      makeRequest(
        { "x-mcp-key": "sk_mcp_demo" },
        { tool: "public_listings.search", input: {} }
      )
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean };
    expect(json.ok).toBe(true);
  });

  it("forbids a tool outside the key allowlist (403)", async () => {
    resolveMcpApiKeyMock.mockResolvedValue(readOnlyKey);
    const { POST } = await import("@/app/api/mcp/route");
    const res = await POST(
      makeRequest(
        { "x-mcp-key": "sk_mcp_demo" },
        { tool: "leads.create", input: {} }
      )
    );
    expect(res.status).toBe(403);
  });

  it("forbids a mutating tool without the write scope (403)", async () => {
    resolveMcpApiKeyMock.mockResolvedValue({
      ...readOnlyKey,
      toolAllowlist: ["leads.create"],
      canWrite: false,
    });
    const { POST } = await import("@/app/api/mcp/route");
    const res = await POST(
      makeRequest(
        { "x-mcp-key": "sk_mcp_demo" },
        { tool: "leads.create", input: {} }
      )
    );
    expect(res.status).toBe(403);
  });

  it("forbids a PII tool without the PII scope (403)", async () => {
    resolveMcpApiKeyMock.mockResolvedValue({
      ...readOnlyKey,
      toolAllowlist: ["seller_leads.get_context"],
      canReadPii: false,
    });
    const { POST } = await import("@/app/api/mcp/route");
    const res = await POST(
      makeRequest(
        { "x-mcp-key": "sk_mcp_demo" },
        { tool: "seller_leads.get_context", input: {} }
      )
    );
    expect(res.status).toBe(403);
  });

  it("allows a mutating tool when the key carries the write scope (200)", async () => {
    resolveMcpApiKeyMock.mockResolvedValue({
      ...readOnlyKey,
      toolAllowlist: ["leads.create"],
      canWrite: true,
    });
    const { POST } = await import("@/app/api/mcp/route");
    const res = await POST(
      makeRequest(
        { "x-mcp-key": "sk_mcp_demo" },
        { tool: "leads.create", input: {} }
      )
    );
    expect(res.status).toBe(200);
  });
});
