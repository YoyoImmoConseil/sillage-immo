import { describe, expect, it, vi } from "vitest";
import { validateWithSchema } from "@/lib/mcp/validate";
import type { JsonSchema, ToolDefinition } from "@/lib/mcp/types";

// The new tool modules each pull a couple of service modules that use
// `import "server-only"` (which throws in a non-server runtime), or
// reach into supabaseAdmin (env-dependent). Vitest does not care about
// the "server-only" sentinel itself; supabaseAdmin will however fail
// at import time without the env vars. We stub the service modules at
// the boundary so the import graph stops at the tool definitions and
// we can exercise the JSON-Schema validation surface without booting
// any IO.
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {},
}));
vi.mock("server-only", () => ({}));
vi.mock("@/services/leads/lead.service", () => ({
  createLead: vi.fn(),
  scoreLead: vi.fn(),
}));
vi.mock("@/services/sellers/seller-lead.service", () => ({
  createSellerLead: vi.fn(),
}));
vi.mock("@/services/sellers/seller-score.service", () => ({
  scoreSellerLead: vi.fn(),
}));
vi.mock("@/services/sellers/seller-ai-insight.service", () => ({
  generateSellerAiInsight: vi.fn(),
}));
vi.mock("@/services/sellers/seller-context.service", () => ({
  getSellerLeadContextSnapshot: vi.fn(),
}));
vi.mock("@/services/home/home-assistant-context.service", () => ({
  getHomeAssistantContextSnapshot: vi.fn(),
}));
vi.mock("@/services/properties/property-visit.service", () => ({
  listVisitsForProperty: vi.fn(),
}));
vi.mock("@/services/properties/property-documents.service", () => ({
  listPropertyDocumentsForAdmin: vi.fn(),
  listPropertyDocumentsForClient: vi.fn(),
}));
vi.mock("@/services/buyers/buyer-lead.service", () => ({
  createBuyerLeadFromWebsite: vi.fn(),
}));
vi.mock("@/services/buyers/buyer-matching.service", () => ({
  recomputeMatchesForBuyerLead: vi.fn(),
  recomputeMatchesForProperty: vi.fn(),
  listMatchesForBuyerLead: vi.fn(),
  listMatchesForProperty: vi.fn(),
}));
vi.mock("@/services/clients/client-project.service", () => ({
  emitClientProjectEvent: vi.fn(),
}));
vi.mock("@/services/clients/seller-project.service", () => ({
  assignAdvisorToSellerProject: vi.fn(),
}));
vi.mock("@/services/contacts/contact-identity.service", () => ({
  ensureContactIdentity: vi.fn(),
  normalizeEmail: (value: string | null | undefined) =>
    value?.trim().toLowerCase() || null,
  normalizePhone: (value: string | null | undefined) => value?.trim() || null,
  splitFullName: () => ({ firstName: null, lastName: null }),
}));
vi.mock("@/services/ai/embedding-worker.service", () => ({
  embedEntity: vi.fn(),
}));
vi.mock("@/lib/ai/openai", () => ({
  callOpenAiChat: vi.fn(),
  callOpenAiEmbedding: vi.fn(),
}));
vi.mock("@/lib/events/domain-events", () => ({
  emitDomainEvent: vi.fn(),
}));

const findSchema = (
  tools: ToolDefinition<unknown, unknown>[],
  name: string
): JsonSchema => {
  const tool = tools.find((t) => t.name === name);
  if (!tool) throw new Error(`Missing tool: ${name}`);
  return tool.inputSchema;
};

describe("MCP tools registry — input schema smoke tests", () => {
  it("aggregates every domain group into a single registry", async () => {
    const { tools } = await import("@/lib/mcp/tools");
    const names = tools.map((tool) => tool.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names.length).toBeGreaterThanOrEqual(30);
  });

  it("every tool advertises a 1.0.0 version (or higher)", async () => {
    const { tools } = await import("@/lib/mcp/tools");
    for (const tool of tools) {
      expect(tool.version).toMatch(/^\d+\.\d+\.\d+/);
    }
  });

  it("properties.search accepts known criteria + rejects garbage", async () => {
    const { tools } = await import("@/lib/mcp/tools");
    const schema = findSchema(tools, "properties.search");
    expect(
      validateWithSchema(schema, {
        city: "Nice",
        businessType: "sale",
        priceMin: 100000,
        limit: 10,
      })
    ).toBe(true);
    expect(
      validateWithSchema(schema, { businessType: "lease" })
    ).toBe(false);
    expect(validateWithSchema(schema, { limit: 1000 })).toBe(false);
  });

  it("properties.get accepts oneOf {propertyId} or {slug}", async () => {
    const { tools } = await import("@/lib/mcp/tools");
    const schema = findSchema(tools, "properties.get");
    expect(
      validateWithSchema(schema, {
        propertyId: "550e8400-e29b-41d4-a716-446655440000",
      })
    ).toBe(true);
    expect(validateWithSchema(schema, { slug: "nice-promenade-3p" })).toBe(true);
    expect(validateWithSchema(schema, {})).toBe(false);
    expect(validateWithSchema(schema, { propertyId: "not-a-uuid" })).toBe(false);
  });

  it("property_listings.publish requires a uuid", async () => {
    const { tools } = await import("@/lib/mcp/tools");
    const schema = findSchema(tools, "property_listings.publish");
    expect(
      validateWithSchema(schema, {
        listingId: "550e8400-e29b-41d4-a716-446655440000",
      })
    ).toBe(true);
    expect(validateWithSchema(schema, {})).toBe(false);
    expect(validateWithSchema(schema, { listingId: "abc" })).toBe(false);
  });

  it("buyer_leads.create_or_enrich requires fullName + email + searchDetails", async () => {
    const { tools } = await import("@/lib/mcp/tools");
    const schema = findSchema(tools, "buyer_leads.create_or_enrich");
    expect(
      validateWithSchema(schema, {
        fullName: "Alice",
        email: "alice@example.com",
        searchDetails: "T3 Nice ouest",
      })
    ).toBe(true);
    expect(
      validateWithSchema(schema, { fullName: "Alice", email: "not-an-email" })
    ).toBe(false);
  });

  it("buyer_searches.upsert enforces businessType enum", async () => {
    const { tools } = await import("@/lib/mcp/tools");
    const schema = findSchema(tools, "buyer_searches.upsert");
    expect(
      validateWithSchema(schema, {
        buyerLeadId: "550e8400-e29b-41d4-a716-446655440000",
        businessType: "sale",
      })
    ).toBe(true);
    expect(
      validateWithSchema(schema, {
        buyerLeadId: "550e8400-e29b-41d4-a716-446655440000",
        businessType: "lease",
      })
    ).toBe(false);
  });

  it("buyer_matching.recompute_for_lead requires a uuid", async () => {
    const { tools } = await import("@/lib/mcp/tools");
    const schema = findSchema(tools, "buyer_matching.recompute_for_lead");
    expect(
      validateWithSchema(schema, {
        buyerLeadId: "550e8400-e29b-41d4-a716-446655440000",
      })
    ).toBe(true);
    expect(validateWithSchema(schema, {})).toBe(false);
  });

  it("client_projects.timeline enforces audience enum", async () => {
    const { tools } = await import("@/lib/mcp/tools");
    const schema = findSchema(tools, "client_projects.timeline");
    expect(
      validateWithSchema(schema, {
        clientProjectId: "550e8400-e29b-41d4-a716-446655440000",
        audience: "client",
      })
    ).toBe(true);
    expect(
      validateWithSchema(schema, {
        clientProjectId: "550e8400-e29b-41d4-a716-446655440000",
        audience: "investor",
      })
    ).toBe(false);
  });

  it("seller_projects.advance_status enforces known status enum", async () => {
    const { tools } = await import("@/lib/mcp/tools");
    const schema = findSchema(tools, "seller_projects.advance_status");
    expect(
      validateWithSchema(schema, {
        sellerProjectId: "550e8400-e29b-41d4-a716-446655440000",
        nextStatus: "mandat_signe",
      })
    ).toBe(true);
    expect(
      validateWithSchema(schema, {
        sellerProjectId: "550e8400-e29b-41d4-a716-446655440000",
        nextStatus: "made_up_status",
      })
    ).toBe(false);
  });

  it("ai.semantic_search clamps limit to 1..20", async () => {
    const { tools } = await import("@/lib/mcp/tools");
    const schema = findSchema(tools, "ai.semantic_search");
    expect(validateWithSchema(schema, { query: "appartement T3 Nice ouest" })).toBe(
      true
    );
    expect(
      validateWithSchema(schema, { query: "x", limit: 100 })
    ).toBe(false);
    expect(validateWithSchema(schema, {})).toBe(false);
  });

  it("ai.embed_entity enforces known entityType enum", async () => {
    const { tools } = await import("@/lib/mcp/tools");
    const schema = findSchema(tools, "ai.embed_entity");
    expect(
      validateWithSchema(schema, {
        entityType: "seller_lead",
        entityId: "550e8400-e29b-41d4-a716-446655440000",
      })
    ).toBe(true);
    expect(
      validateWithSchema(schema, {
        entityType: "unknown",
        entityId: "550e8400-e29b-41d4-a716-446655440000",
      })
    ).toBe(false);
  });

  it("audit.search enforces status enum", async () => {
    const { tools } = await import("@/lib/mcp/tools");
    const schema = findSchema(tools, "audit.search");
    expect(validateWithSchema(schema, { tool: "leads.create" })).toBe(true);
    expect(validateWithSchema(schema, { status: "success" })).toBe(true);
    expect(validateWithSchema(schema, { status: "unknown" })).toBe(false);
  });

  it("contacts.find_or_merge accepts an email + rejects unknown keys", async () => {
    const { tools } = await import("@/lib/mcp/tools");
    const schema = findSchema(tools, "contacts.find_or_merge");
    expect(
      validateWithSchema(schema, { email: "alice@example.com" })
    ).toBe(true);
    expect(
      validateWithSchema(schema, {
        email: "alice@example.com",
        bogusKey: 42,
      })
    ).toBe(false);
  });
});
