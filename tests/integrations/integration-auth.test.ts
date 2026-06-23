import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { McpKeyContext } from "@/services/mcp/mcp-api-key.service";

vi.mock("server-only", () => ({}));

const resolveMcpApiKeyMock =
  vi.fn<(raw: string) => Promise<McpKeyContext | null>>();
vi.mock("@/services/mcp/mcp-api-key.service", () => ({
  resolveMcpApiKey: (raw: string) => resolveMcpApiKeyMock(raw),
}));

const baseKey: McpKeyContext = {
  id: "key-1",
  name: "Zapier — ingestion",
  toolAllowlist: ["integrations:transactions"],
  canWrite: true,
  canReadPii: false,
  ipAllowlist: null,
  rateLimitPerMinute: null,
};

const makeRequest = (headers: Record<string, string> = {}) =>
  new Request("http://localhost/api/integrations/v1/transactions", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
  });

// Each test uses a distinct key id so the in-memory rate-limiter buckets
// never collide across cases.
let counter = 0;
const keyWith = (overrides: Partial<McpKeyContext>): McpKeyContext => ({
  ...baseKey,
  id: `key-${++counter}`,
  ...overrides,
});

beforeEach(() => {
  resolveMcpApiKeyMock.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("authenticateIntegrationRequest", () => {
  it("rejects when no API key is presented (401)", async () => {
    const { authenticateIntegrationRequest } = await import(
      "@/lib/integrations/auth"
    );
    const result = await authenticateIntegrationRequest(makeRequest(), {
      requiredScope: "integrations:transactions",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });

  it("rejects an unresolvable / revoked key (401)", async () => {
    resolveMcpApiKeyMock.mockResolvedValue(null);
    const { authenticateIntegrationRequest } = await import(
      "@/lib/integrations/auth"
    );
    const result = await authenticateIntegrationRequest(
      makeRequest({ authorization: "Bearer sk_mcp_x" }),
      { requiredScope: "integrations:transactions" }
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });

  it("forbids a key without the write scope (403)", async () => {
    resolveMcpApiKeyMock.mockResolvedValue(keyWith({ canWrite: false }));
    const { authenticateIntegrationRequest } = await import(
      "@/lib/integrations/auth"
    );
    const result = await authenticateIntegrationRequest(
      makeRequest({ authorization: "Bearer sk_mcp_x" }),
      { requiredScope: "integrations:transactions" }
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
  });

  it("forbids when the required capability is not in the allowlist (403)", async () => {
    resolveMcpApiKeyMock.mockResolvedValue(
      keyWith({ toolAllowlist: ["integrations:market"] })
    );
    const { authenticateIntegrationRequest } = await import(
      "@/lib/integrations/auth"
    );
    const result = await authenticateIntegrationRequest(
      makeRequest({ authorization: "Bearer sk_mcp_x" }),
      { requiredScope: "integrations:transactions" }
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
  });

  it("allows a write key carrying the required capability (ok)", async () => {
    const key = keyWith({ toolAllowlist: ["integrations:transactions"] });
    resolveMcpApiKeyMock.mockResolvedValue(key);
    const { authenticateIntegrationRequest } = await import(
      "@/lib/integrations/auth"
    );
    const result = await authenticateIntegrationRequest(
      makeRequest({ authorization: "Bearer sk_mcp_x" }),
      { requiredScope: "integrations:transactions" }
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.key.id).toBe(key.id);
  });

  it("allows a write key with no integration scopes declared (back-compat)", async () => {
    resolveMcpApiKeyMock.mockResolvedValue(
      keyWith({ toolAllowlist: ["public_listings.search"] })
    );
    const { authenticateIntegrationRequest } = await import(
      "@/lib/integrations/auth"
    );
    const result = await authenticateIntegrationRequest(
      makeRequest({ authorization: "Bearer sk_mcp_x" }),
      { requiredScope: "integrations:buyer_leads" }
    );
    expect(result.ok).toBe(true);
  });

  it("enforces the per-key IP allowlist (403)", async () => {
    resolveMcpApiKeyMock.mockResolvedValue(
      keyWith({ ipAllowlist: ["203.0.113.4"] })
    );
    const { authenticateIntegrationRequest } = await import(
      "@/lib/integrations/auth"
    );
    const result = await authenticateIntegrationRequest(
      makeRequest({
        authorization: "Bearer sk_mcp_x",
        "x-forwarded-for": "198.51.100.7",
      }),
      { requiredScope: "integrations:transactions" }
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
  });

  it("accepts a request from an allowlisted IP", async () => {
    resolveMcpApiKeyMock.mockResolvedValue(
      keyWith({ ipAllowlist: ["203.0.113.4"] })
    );
    const { authenticateIntegrationRequest } = await import(
      "@/lib/integrations/auth"
    );
    const result = await authenticateIntegrationRequest(
      makeRequest({
        authorization: "Bearer sk_mcp_x",
        "x-forwarded-for": "203.0.113.4",
      }),
      { requiredScope: "integrations:transactions" }
    );
    expect(result.ok).toBe(true);
  });

  it("rate-limits once the per-key budget is exhausted (429)", async () => {
    const key = keyWith({ rateLimitPerMinute: 1 });
    resolveMcpApiKeyMock.mockResolvedValue(key);
    const { authenticateIntegrationRequest } = await import(
      "@/lib/integrations/auth"
    );
    const first = await authenticateIntegrationRequest(
      makeRequest({ authorization: "Bearer sk_mcp_x" }),
      { requiredScope: "integrations:transactions" }
    );
    expect(first.ok).toBe(true);
    const second = await authenticateIntegrationRequest(
      makeRequest({ authorization: "Bearer sk_mcp_x" }),
      { requiredScope: "integrations:transactions" }
    );
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.response.status).toBe(429);
  });
});
