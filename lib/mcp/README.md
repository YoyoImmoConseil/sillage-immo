# MCP (Model Context Protocol)

This module exposes Sillage Immo business capabilities as **typed, audited,
versioned tools** that any LLM-driven workflow can call.

## Surfaces

| Surface           | Transport | Endpoint / binary                        |
| ----------------- | --------- | ---------------------------------------- |
| HTTP catalog      | HTTP GET  | `/api/mcp`                               |
| HTTP execute      | HTTP POST | `/api/mcp` (body: `{ tool, input }`)     |
| HTTP manifest     | HTTP GET  | `/api/mcp/manifest`                       |
| Native MCP stdio  | stdio     | `npm run mcp:server` / `scripts/mcp-server.ts` |

The stdio bridge proxies to the HTTP route. See [`BRIDGE.md`](./BRIDGE.md)
for Claude Desktop / Cursor configuration.

## Guarantees

- **AuthN/Z**: every request must be `isInternalRequest` (admin key,
  admin session, or DOMAIN_EVENTS_CRON_SECRET).
- **Schema validation**: each tool ships a JSON-Schema fragment
  (`enum`, `format`, `minLength`/`maxLength`, `minimum`/`maximum`,
  `nullable`, `oneOf`). See `lib/mcp/validate.ts`.
- **Version registration**: only tools whose `(tool_name, tool_version)`
  exists in `public.tool_versions` with `lifecycle_status='active'`
  can execute. Seeded by migration `030`.
- **Idempotency**: send `Idempotency-Key: <opaque>` on `POST /api/mcp`
  and the response is cached in `api_idempotency_keys` (TTL 24h,
  scope `mcp.tool_call`). Retries replay the same response.
- **Rate-limit**: 60 req/min per actor (admin profile or hashed IP) by
  default, override via `MCP_RATE_LIMIT_PER_MINUTE`.
- **Audit**: every call lands in `audit_log` with
  `action='mcp_tool_call'`, including hashed IP/UA, duration,
  output size, actor role and request id. Retention 90 days (see
  `run_retention_cleanup`).

## Tool catalog

The authoritative inventory is `lib/mcp/tools/index.ts`. See
[`docs/ops/mcp-tool-catalog.md`](../../docs/ops/mcp-tool-catalog.md)
for the human-readable fiche per tool (signature, examples).

Folder layout:

```
lib/mcp/
  README.md         <- this file
  BRIDGE.md         <- stdio bridge usage
  audit.ts          <- audit_log writer
  bootstrap.ts      <- registry bootstrap
  invoke-internal.ts<- in-process invoker for service-to-service calls
  registry.ts       <- map<name, ToolDefinition>
  tools.ts          <- barrel re-export of tools/index
  tools/
    leads.ts
    seller-leads.ts
    home-assistant.ts
    properties.ts
    property-listings.ts
    property-visits.ts
    property-documents.ts
    buyer-leads.ts
    buyer-searches.ts
    buyer-matching.ts
    valuations.ts
    client-projects.ts
    seller-projects.ts
    contacts.ts
    ai.ts
    audit.ts
    index.ts        <- registry aggregation
  types.ts          <- JsonSchema + ToolContext + result types
  validate.ts       <- JSON-Schema validator
  versioning.ts     <- tool_versions guard
```

## Adding a new tool

1. Pick the right `lib/mcp/tools/<domain>.ts` (or create one + export it
   in `tools/index.ts`).
2. Declare a `ToolDefinition<Input, Output>` with `version`,
   `description`, strict `inputSchema`, and a handler that delegates to
   the existing service layer (do NOT inline business logic here).
3. Add a row to the next `db/migrations/<...>_seed_tool_versions.sql`
   (or extend `030` if you're shipping the tool in the same PR).
4. Add a smoke test in `lib/mcp/__tests__/tools-smoke.test.ts` (mock
   the service, exercise the schema).
5. Document it in `docs/ops/mcp-tool-catalog.md`.

## AI tools — domain integration

`ai.semantic_search` and `ai.embed_entity` rely on the AI domain shipped
by migration `027` (`ai_conversations`, `ai_messages`,
`entity_embeddings` over pgvector). See
[`docs/ops/ai-domain.md`](../../docs/ops/ai-domain.md) for the schema +
retention + embedding flow.
