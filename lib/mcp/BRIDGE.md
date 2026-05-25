# Sillage Immo MCP — stdio bridge

The native Model Context Protocol bridge exposes the Sillage tool
catalog over **stdio**, so any MCP-compatible client (Claude Desktop,
Cursor, internal LLM agents, …) can call them like first-class tools.

The bridge does **not** import the Next.js services directly. It proxies
every call to the existing `POST /api/mcp` endpoint, which already
enforces auth, schema validation, idempotency, rate-limit, and audit
logging.

## Running locally

```bash
# 1. Start the Next.js server (in another terminal):
npm run dev

# 2. Start the MCP bridge:
MCP_SERVER_BASE_URL=http://localhost:3000 \
MCP_SERVER_ADMIN_KEY=$(cat .env.local | grep ADMIN_API_KEY | cut -d= -f2) \
npm run mcp:server
```

Without `MCP_SERVER_ADMIN_KEY`, the bridge starts in **read-only** mode
and mutating tools (`*.create`, `*.publish`, `*.assign_advisor`, …) are
hidden from the catalog and refused if called explicitly.

## Environment variables

| Variable                | Default                  | Description                                                                                  |
| ----------------------- | ------------------------ | -------------------------------------------------------------------------------------------- |
| `MCP_SERVER_BASE_URL`   | `http://localhost:3000`  | Base URL of the Next.js server hosting `/api/mcp`.                                            |
| `MCP_SERVER_ADMIN_KEY`  | _(empty)_                | Sillage admin API key (`X-Admin-Key`). Without it, the bridge runs read-only.                |

## Claude Desktop config

Add the snippet below to your
`~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "sillage-immo": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/sillage-immo/scripts/mcp-server.ts"],
      "env": {
        "MCP_SERVER_BASE_URL": "http://localhost:3000",
        "MCP_SERVER_ADMIN_KEY": "..."
      }
    }
  }
}
```

Restart Claude Desktop, and the Sillage tools will appear in the
attached-tools sidebar. Mutating tools require the admin key to be set
in `env`.

## Cursor config

Add the snippet below to your `~/.cursor/mcp.json` (or the workspace's
`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "sillage-immo": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/sillage-immo/scripts/mcp-server.ts"],
      "env": {
        "MCP_SERVER_BASE_URL": "http://localhost:3000",
        "MCP_SERVER_ADMIN_KEY": "..."
      }
    }
  }
}
```

## What gets proxied

Every tool listed by `GET /api/mcp/manifest`. The bridge filters out
mutating tools when running in read-only mode. The catalog is fetched
once at startup; restart the bridge after changing the tool registry.

## Security notes

- The bridge never reads `OPENAI_API_KEY`, the Supabase service-role
  key, or any other secret — those stay server-side, only the admin
  API key crosses the boundary.
- Each call goes through `/api/mcp`, so the full audit trail
  (`audit_log`, action=`mcp_tool_call`) records bridge invocations
  exactly like HTTP calls from the admin console.
- Rate-limit (`MCP_RATE_LIMIT_PER_MINUTE`) and idempotency
  (`Idempotency-Key`) headers can be passed transparently by adding
  them to outgoing requests; the bridge currently does not surface
  them in the MCP capability layer, but it does not strip them either.
