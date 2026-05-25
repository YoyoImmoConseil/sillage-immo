#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-explicit-any */
// Sillage Immo native stdio MCP bridge.
//
// The bridge does NOT import the Next.js services directly (those carry
// `server-only` markers and depend on env vars and the Supabase service
// role key). Instead it proxies over HTTP to the existing /api/mcp +
// /api/mcp/manifest endpoints, which already implement every guard
// (auth, validation, idempotency, rate-limit, audit logging).
//
// Required env:
//   MCP_SERVER_ADMIN_KEY  -> Sillage admin API key (X-Admin-Key). If
//                            unset, the bridge starts in READ-ONLY
//                            mode and refuses mutation tools.
// Optional env:
//   MCP_SERVER_BASE_URL   -> default http://localhost:3000
//
// Usage with Claude Desktop, see lib/mcp/BRIDGE.md.

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

type RemoteTool = {
  name: string;
  description: string;
  version?: string;
  inputSchema: Record<string, unknown>;
};

// Anything that mutates state should be blocked when the bridge runs
// in read-only mode (no admin key). The list is conservative: when in
// doubt, deny.
const MUTATING_TOOLS = new Set<string>([
  "leads.create",
  "seller_leads.create_or_reuse",
  "seller_leads.score",
  "seller_leads.generate_ai_insight",
  "seller_leads.enrich",
  "property_listings.publish",
  "property_listings.unpublish",
  "buyer_leads.create_or_enrich",
  "buyer_searches.upsert",
  "buyer_matching.recompute_for_lead",
  "buyer_matching.recompute_for_property",
  "seller_projects.advance_status",
  "seller_projects.assign_advisor",
  "contacts.find_or_merge",
  "ai.embed_entity",
]);

const baseUrl = (
  process.env.MCP_SERVER_BASE_URL ?? "http://localhost:3000"
).replace(/\/+$/, "");
const adminKey = process.env.MCP_SERVER_ADMIN_KEY ?? "";
const readOnlyMode = adminKey.length === 0;

const authHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (adminKey) headers["x-admin-key"] = adminKey;
  return headers;
};

const fetchManifest = async (): Promise<RemoteTool[]> => {
  const response = await fetch(`${baseUrl}/api/mcp/manifest`, {
    method: "GET",
    headers: authHeaders(),
  });
  if (!response.ok) {
    throw new Error(
      `Failed to load MCP manifest from ${baseUrl}/api/mcp/manifest (status ${response.status}). ` +
        `Set MCP_SERVER_ADMIN_KEY to your Sillage admin API key.`
    );
  }
  const payload = (await response.json()) as { tools: RemoteTool[] };
  if (!Array.isArray(payload.tools)) {
    throw new Error("Manifest payload is missing the `tools` array.");
  }
  return payload.tools;
};

const callRemoteTool = async (toolName: string, input: unknown): Promise<unknown> => {
  const response = await fetch(`${baseUrl}/api/mcp`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ tool: toolName, input }),
  });
  const payload = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(
      `MCP tool ${toolName} failed (status ${response.status}): ${
        typeof payload.error === "object"
          ? JSON.stringify(payload.error)
          : "unknown error"
      }`
    );
  }
  return payload.data;
};

const formatResult = (data: unknown) => {
  let text: string;
  try {
    text = JSON.stringify(data, null, 2);
  } catch {
    text = String(data);
  }
  return {
    content: [
      {
        type: "text" as const,
        text,
      },
    ],
  };
};

const main = async () => {
  let manifestTools: RemoteTool[] = [];
  try {
    manifestTools = await fetchManifest();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`[sillage-mcp] ${message}\n`);
    process.exitCode = 1;
    return;
  }

  process.stderr.write(
    `[sillage-mcp] Connected to ${baseUrl}. Loaded ${manifestTools.length} tools. Mode=${
      readOnlyMode ? "read-only" : "full"
    }\n`
  );

  const visibleTools = manifestTools.filter(
    (tool) => !readOnlyMode || !MUTATING_TOOLS.has(tool.name)
  );

  const server = new Server(
    { name: "sillage-immo", version: "1.0.0" },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: visibleTools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: (tool.inputSchema as any) ?? {
        type: "object",
        properties: {},
      },
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    if (readOnlyMode && MUTATING_TOOLS.has(name)) {
      throw new Error(
        `Tool ${name} is disabled in read-only mode. Set MCP_SERVER_ADMIN_KEY to enable mutations.`
      );
    }
    const data = await callRemoteTool(name, args ?? {});
    return formatResult(data);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[sillage-mcp] fatal: ${message}\n`);
  process.exit(1);
});
