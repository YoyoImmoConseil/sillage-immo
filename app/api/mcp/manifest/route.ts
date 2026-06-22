import { NextResponse } from "next/server";
import { isInternalRequest } from "@/lib/admin/auth";
import { bootstrapMcpRegistry } from "@/lib/mcp/bootstrap";
import { listTools } from "@/lib/mcp/registry";

// MCP-friendly manifest. Surfaces the tool catalog in a shape close to
// what `@modelcontextprotocol/sdk`'s `ListToolsRequest` returns, so the
// stdio bridge (scripts/mcp-server.ts) can stay in sync with the HTTP
// registry without duplicating schemas.

const MANIFEST_VERSION = "1.0.0";

export const GET = async (request: Request) => {
  if (!(await isInternalRequest(request))) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized." },
      { status: 401 }
    );
  }

  bootstrapMcpRegistry();
  const tools = listTools();

  return NextResponse.json({
    name: "sillage-immo-mcp",
    version: MANIFEST_VERSION,
    description:
      "Sillage Immo Model Context Protocol surface: typed business tools (seller leads, buyer leads, properties, projects, valuations, AI) exposed over HTTP and (optionally) stdio.",
    transports: {
      http: { endpoint: "/api/mcp", method: "POST" },
      stdio: {
        binary: "node scripts/mcp-server.ts",
        notes:
          "Requires MCP_SERVER_ADMIN_KEY env var (admin API key). Without it, the server runs in read-only mode and refuses mutations.",
      },
    },
    capabilities: {
      idempotency: {
        header: "Idempotency-Key",
        ttlHours: 24,
      },
      rateLimit: {
        perMinuteDefault: 60,
        envVar: "MCP_RATE_LIMIT_PER_MINUTE",
        keyShape: "mcp:{actorId|secret:role|ip:sha256(ip)}",
      },
      audit: {
        table: "audit_log",
        action: "mcp_tool_call",
        retentionDays: 90,
      },
    },
    tools: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      version: tool.version,
      inputSchema: tool.inputSchema,
      mutates: tool.mutates ?? false,
      readsPii: tool.readsPii ?? false,
    })),
  });
};
