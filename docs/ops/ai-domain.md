# AI domain — schema, retention, embedding flow

The AI domain became a first-class part of the database in migration
`027_ai_domain_first_class.sql`. This doc explains what each table is
for, how the embedding worker uses them, and how retention works.

## Tables

### `ai_conversations`
A multi-turn conversation between a human (or the system) and the
agency LLM stack. One row per conversation, regardless of how many
messages it carries.

Key columns:

| Column                              | Description                                                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `id`                                | uuid PK                                                                                                      |
| `entity_type` + `entity_id`         | Generic owner ref. `entity_type ∈ {seller_lead, buyer_lead, client_project, property, admin, anonymous, system}`. |
| `client_project_id`, `seller_lead_id`, `buyer_lead_id` | Denormalized typed FKs for the three most common joins.                                              |
| `channel`                           | Where the conversation comes from. Enum: `seller_chat | seller_ai_insight | home_assistant | mcp_tool | admin_console | rag_query`. |
| `status`                            | `open | closed | archived`. Retention only touches non-open conversations.                                   |
| `model`, `locale`                   | Best-effort metadata for analytics.                                                                          |
| `metadata`                          | jsonb (always an object, enforced by check constraint).                                                       |

### `ai_messages`
Append-only message log keyed by `conversation_id`.

Key columns:

| Column                | Description                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `role`                | `system | user | assistant | tool`                                                                                       |
| `content`             | Raw text. **Sensitive content (PII, secrets) must NOT be stored**: the wrapper sanitizes before persisting.              |
| `tokens_in` / `tokens_out` | OpenAI usage counters.                                                                                              |
| `cost_micros`         | **Internal accounting** in millionths of a US dollar (1¢ = 1000 micros). `MODEL_PRICING` in `lib/ai/openai.ts` is the table. The LLM provider remains the source of truth for billing. |
| `tool_name` / `tool_version` / `request_id` | Correlation back to the `audit_log` row that triggered the call.                                      |

### `entity_embeddings`
1536-dim OpenAI embeddings keyed by `(entity_type, entity_id, model)`.

Key columns:

| Column                | Description                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `entity_type`         | `property | property_listing | seller_lead | buyer_lead | client_project | agency_knowledge`                              |
| `model`               | e.g. `text-embedding-3-small`                                                                                            |
| `source_text_hash`    | `sha256(source_text)`. Lets the embedding worker skip re-embeds when the canonical text is unchanged.                    |
| `source_text_excerpt` | First 500 chars of `source_text`. Debugging only.                                                                        |
| `embedding`           | `vector(1536)` — pgvector.                                                                                               |

IVFFlat cosine index `idx_entity_embeddings_vector_cosine` powers
`ai.semantic_search`.

## RLS posture

All three tables have RLS **enabled** but ship **no policy**. The
frontend never reads them directly: admin code goes through
`supabaseAdmin` (service-role) which bypasses RLS. The MCP route
itself only accepts internal requests.

## Embedding flow

```
domain_event (e.g. buyer_lead.created)
   │
   ▼
embedFromDomainEvent(event)         services/ai/embedding-worker.service.ts
   │
   ├── build canonical source_text  (per entity_type rule)
   ├── sha256 source_text -> hash
   ├── if entity_embeddings row exists with same (entity_type, entity_id, model)
   │     and same hash -> skip  (idempotency)
   └── otherwise:
         OpenAI text-embedding-3-small
         upsert into entity_embeddings
```

Triggers:

- **Inline**: `ai.embed_entity` MCP tool (forced refresh).
- **Event-driven**: `embedFromDomainEvent` dispatches selected
  `domain_events` (`seller_lead.created`, `buyer_lead.created`,
  `property_listing.published`, …). The domain-events processor can
  call `embedFromDomainEvent(event)` as a non-blocking side effect.

## Semantic search

`ai.semantic_search` embeds the query at runtime (OpenAI), then ranks
`entity_embeddings` by cosine similarity (`1 - distance`). The filter
list (`entityTypes`) and `threshold` are applied client-side after the
DB returns a wide candidate set (k×8, capped at 200) so we can stay on
a single round-trip without bespoke SQL.

## Retention

`public.run_retention_cleanup(retention_days int default 90)` is the
single cleanup entry point. For the AI domain, it deletes
`ai_conversations` whose `status ∈ {closed, archived}` and whose
`ended_at` (or `created_at` fallback) is older than `retention_days`.
`ai_messages` follow via `ON DELETE CASCADE`.

Schedule it from your CRON / Supabase Scheduled Functions:

```sql
select * from public.run_retention_cleanup(90);
-- returns one row per target with the deleted_count
```

The function is `security definer`; only `service_role` can execute it.

## Cost budgeting

`MODEL_PRICING` in `lib/ai/openai.ts` keeps a small table of
$µ-per-1k-tokens by model. We store the computed `cost_micros` on
every assistant message so the admin console can show per-tool,
per-day spend. To add a new model: bump the table; older messages keep
their original cost figure unchanged.

## Privacy

- PII content (emails, phone, addresses) **must** be sanitized before
  it reaches `ai_messages.content`. Use `sanitizeAuditInput` style
  helpers when in doubt.
- `entity_embeddings` stores a 500-char excerpt of the source text for
  debugging. Avoid putting raw PII in the source text builders — only
  derived attributes (city, property type, criteria…) belong there.
