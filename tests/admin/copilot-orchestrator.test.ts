import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// We mock the dependency boundary: supabaseAdmin (DB), the
// conversation logger (no real Postgres), the MCP bootstrap, the
// registry's getTool / listTools, and the global fetch used by
// OpenAI Chat Completions. The unit under test is the
// orchestrator's iteration logic + cost tally + role-based tool
// filtering — not the underlying tool implementations.

const fetchMock = vi.fn();
const tools = [
  {
    name: "leads.score",
    description: "Score a lead",
    version: "1.0.0",
    inputSchema: {
      type: "object",
      properties: {
        fullName: { type: "string" },
        email: { type: "string" },
      },
      required: ["fullName", "email"],
    } as const,
    handler: vi.fn().mockResolvedValue({ score: 87 }),
  },
  {
    name: "property_listings.publish",
    description: "Publish",
    version: "1.0.0",
    inputSchema: {
      type: "object",
      properties: { listingId: { type: "string", format: "uuid" } },
      required: ["listingId"],
    } as const,
    handler: vi.fn().mockResolvedValue({ ok: true }),
  },
];

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      })),
    })),
    rpc: vi.fn(() =>
      Promise.resolve({
        data: [{ cost_micros_total: 1_500_000 }],
        error: null,
      })
    ),
  },
}));

vi.mock("@/lib/ai/conversation-logger", () => ({
  logConversationTurn: vi.fn(() =>
    Promise.resolve({ conversationId: "conv-1" })
  ),
  ensureConversation: vi.fn(() =>
    Promise.resolve({ id: "conv-1", isNew: true })
  ),
}));

vi.mock("@/lib/mcp/bootstrap", () => ({
  bootstrapMcpRegistry: vi.fn(),
}));

vi.mock("@/lib/mcp/registry", () => ({
  listTools: vi.fn(() => tools),
  getTool: vi.fn((name: string) => tools.find((t) => t.name === name) ?? null),
}));

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  process.env.OPENAI_API_KEY = "sk-test";
  // Pin the iteration cap so the truncation test stays deterministic
  // regardless of the orchestrator default (read at module import time).
  process.env.ADMIN_COPILOT_MAX_ITERATIONS = "5";
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("runCopilotTurn", () => {
  it("returns the assistant final answer + bumps daily usage when no tool call is requested", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: { role: "assistant", content: "Bonjour, voici ma synthèse." },
            finish_reason: "stop",
          },
        ],
        usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 },
      }),
    });

    const { runCopilotTurn } = await import(
      "@/services/admin/copilot-orchestrator.service"
    );
    const result = await runCopilotTurn({
      adminProfileId: "admin-1",
      adminEmail: "admin@sillage.test",
      adminRole: "administrateur",
      conversationId: null,
      userMessage: "Résume le dashboard",
    });

    expect(result.finalAnswer).toBe("Bonjour, voici ma synthèse.");
    expect(result.toolCalls).toHaveLength(0);
    expect(result.usage.tokensIn).toBe(100);
    expect(result.usage.tokensOut).toBe(20);
    expect(result.dailyUsage.costMicrosTotal).toBe(1_500_000);
    expect(result.dailyUsage.costEurTotal).toBeCloseTo(1.5);
    expect(result.dailyUsage.overCap).toBe(false);
    expect(result.iterations).toBe(1);
  });

  it("executes an MCP tool when the model emits a tool_call, then synthesizes the answer", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                role: "assistant",
                content: null,
                tool_calls: [
                  {
                    id: "call_1",
                    type: "function",
                    function: {
                      name: "leads__score",
                      arguments: JSON.stringify({
                        fullName: "Alice",
                        email: "alice@example.com",
                      }),
                    },
                  },
                ],
              },
              finish_reason: "tool_calls",
            },
          ],
          usage: { prompt_tokens: 200, completion_tokens: 10, total_tokens: 210 },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: { role: "assistant", content: "Score = 87, lead chaud." },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 300, completion_tokens: 30, total_tokens: 330 },
        }),
      });

    const { runCopilotTurn } = await import(
      "@/services/admin/copilot-orchestrator.service"
    );
    const result = await runCopilotTurn({
      adminProfileId: "admin-1",
      adminEmail: null,
      adminRole: "administrateur",
      conversationId: null,
      userMessage: "Score le lead Alice (alice@example.com)",
    });

    expect(result.finalAnswer).toBe("Score = 87, lead chaud.");
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0].toolName).toBe("leads.score");
    expect(result.toolCalls[0].ok).toBe(true);
    expect(result.usage.tokensIn).toBe(500);
    expect(result.usage.tokensOut).toBe(40);
    expect(result.iterations).toBe(2);
  });

  it("filters publish tools out of the manager toolset", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: { role: "assistant", content: "ok" },
            finish_reason: "stop",
          },
        ],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      }),
    });

    const { runCopilotTurn } = await import(
      "@/services/admin/copilot-orchestrator.service"
    );
    await runCopilotTurn({
      adminProfileId: "admin-1",
      adminEmail: null,
      adminRole: "manager",
      conversationId: null,
      userMessage: "test",
    });

    const fetchCall = fetchMock.mock.calls[0];
    expect(fetchCall).toBeDefined();
    const body = JSON.parse(fetchCall[1].body) as {
      tools: Array<{ function: { name: string } }>;
    };
    const names = body.tools.map((t) => t.function.name);
    expect(names).not.toContain("property_listings__publish");
  });

  it("returns truncated=true when the model never stops calling tools", async () => {
    // 5 iterations of tool calls — orchestrator must hard-stop.
    for (let i = 0; i < 5; i += 1) {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                role: "assistant",
                content: null,
                tool_calls: [
                  {
                    id: `call_${i}`,
                    type: "function",
                    function: {
                      name: "leads__score",
                      arguments: JSON.stringify({
                        fullName: "Alice",
                        email: "alice@example.com",
                      }),
                    },
                  },
                ],
              },
              finish_reason: "tool_calls",
            },
          ],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        }),
      });
    }

    const { runCopilotTurn } = await import(
      "@/services/admin/copilot-orchestrator.service"
    );
    const result = await runCopilotTurn({
      adminProfileId: "admin-1",
      adminEmail: null,
      adminRole: "administrateur",
      conversationId: null,
      userMessage: "boucle",
    });

    expect(result.truncated).toBe(true);
    expect(result.iterations).toBe(5);
    expect(result.toolCalls.length).toBe(5);
  });
});
