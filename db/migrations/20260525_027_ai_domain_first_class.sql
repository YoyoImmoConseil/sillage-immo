-- 20260525_027_ai_domain_first_class.sql
--
-- Goal:
--   Promote the AI domain to a first-class concept in the database:
--
--     - `ai_conversations` carries every multi-turn conversation between
--       a human (seller portal chat, admin console, MCP tool, …) and the
--       agency LLM stack. A conversation belongs at most to one business
--       aggregate (seller_lead, buyer_lead, client_project, property,
--       admin, anonymous, system), addressed via `entity_type` +
--       `entity_id`, with denormalized typed FKs for the three most
--       common (seller_lead_id, buyer_lead_id, client_project_id) to
--       make joins cheap.
--
--     - `ai_messages` is the append-only log of LLM messages (role:
--       system|user|assistant|tool) with token + cost accounting and a
--       correlation id back to `audit_log` when the message was produced
--       by an MCP tool call.
--
--     - `entity_embeddings` stores 1536-dim OpenAI embeddings for any
--       business entity that opts in (property listings, leads, projects,
--       static agency knowledge). The unique key (entity_type, entity_id,
--       model) plus the SHA-256 source-text hash let the embedding worker
--       skip re-embedding when nothing has changed.
--
--   RLS is enabled on the three tables but NO policy is shipped: the
--   frontend never accesses them directly; only `service_role` (admin
--   API / MCP route / cron jobs) reads & writes via supabaseAdmin.
--
-- Idempotent: safe to re-apply.

begin;

-- =====================================================================
-- 1. ai_conversations
-- =====================================================================
create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  client_project_id uuid references public.client_projects(id) on delete set null,
  seller_lead_id uuid references public.seller_leads(id) on delete set null,
  buyer_lead_id uuid references public.buyer_leads(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  channel text not null,
  model text,
  locale text,
  status text not null default 'open',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  constraint chk_ai_conversations_entity_type
    check (entity_type in (
      'seller_lead', 'buyer_lead', 'client_project', 'property',
      'admin', 'anonymous', 'system'
    )),
  constraint chk_ai_conversations_channel
    check (channel in (
      'seller_chat', 'seller_ai_insight', 'home_assistant',
      'mcp_tool', 'admin_console', 'rag_query'
    )),
  constraint chk_ai_conversations_status
    check (status in ('open', 'closed', 'archived')),
  constraint chk_ai_conversations_metadata_object
    check (jsonb_typeof(metadata) = 'object')
);

create index if not exists idx_ai_conversations_client_project
  on public.ai_conversations (client_project_id);

create index if not exists idx_ai_conversations_seller_lead
  on public.ai_conversations (seller_lead_id);

create index if not exists idx_ai_conversations_buyer_lead
  on public.ai_conversations (buyer_lead_id);

create index if not exists idx_ai_conversations_entity
  on public.ai_conversations (entity_type, entity_id);

create index if not exists idx_ai_conversations_started_at
  on public.ai_conversations (started_at desc);

comment on table public.ai_conversations is
  'Multi-turn conversations between humans (or the system) and the agency LLM '
  'stack. Frontend never reads this directly: service_role only. Channel ties '
  'a conversation to its source surface (seller_chat, mcp_tool, ...).';

-- =====================================================================
-- 2. ai_messages
-- =====================================================================
create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null,
  content text not null,
  model text,
  tokens_in int,
  tokens_out int,
  cost_micros int,
  tool_name text,
  tool_version text,
  request_id text,
  finish_reason text,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint chk_ai_messages_role
    check (role in ('system', 'user', 'assistant', 'tool')),
  constraint chk_ai_messages_tokens_in_nonnegative
    check (tokens_in is null or tokens_in >= 0),
  constraint chk_ai_messages_tokens_out_nonnegative
    check (tokens_out is null or tokens_out >= 0),
  constraint chk_ai_messages_cost_micros_nonnegative
    check (cost_micros is null or cost_micros >= 0),
  constraint chk_ai_messages_metadata_object
    check (jsonb_typeof(metadata) = 'object')
);

create index if not exists idx_ai_messages_conversation_created
  on public.ai_messages (conversation_id, created_at);

create index if not exists idx_ai_messages_request_id
  on public.ai_messages (request_id)
  where request_id is not null;

comment on table public.ai_messages is
  'Append-only LLM message log with token + cost accounting and request_id '
  'correlation back to audit_log (MCP tool calls). cost_micros is in '
  'thousandths of a US cent (1 cent = 1000 micros) to keep integer math.';

-- =====================================================================
-- 3. entity_embeddings (pgvector)
-- =====================================================================
create table if not exists public.entity_embeddings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  entity_type text not null,
  entity_id uuid not null,
  model text not null,
  source_text_hash text not null,
  source_text_excerpt text,
  embedding vector(1536) not null,
  metadata jsonb not null default '{}'::jsonb,
  constraint chk_entity_embeddings_entity_type
    check (entity_type in (
      'property', 'property_listing', 'seller_lead', 'buyer_lead',
      'client_project', 'agency_knowledge'
    )),
  constraint chk_entity_embeddings_metadata_object
    check (jsonb_typeof(metadata) = 'object'),
  constraint uq_entity_embeddings_entity_model
    unique (entity_type, entity_id, model)
);

create index if not exists idx_entity_embeddings_entity
  on public.entity_embeddings (entity_type, entity_id);

-- IVFFlat is the most compatible Supabase-side ANN index for pgvector
-- 0.5.x. lists=100 is a sensible default for the expected catalog size
-- (≤ 100k rows). The cosine ops class matches the OpenAI embeddings
-- (normalized) we will store here.
create index if not exists idx_entity_embeddings_vector_cosine
  on public.entity_embeddings
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

comment on table public.entity_embeddings is
  'OpenAI text-embedding-3-small (1536-dim) vectors keyed by '
  '(entity_type, entity_id, model). source_text_hash lets the embedding '
  'worker skip re-embeds when the canonical source text is unchanged.';

-- =====================================================================
-- 4. updated_at triggers
-- =====================================================================
create or replace function public.set_ai_conversations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_ai_conversations_updated_at on public.ai_conversations;
create trigger trg_ai_conversations_updated_at
  before update on public.ai_conversations
  for each row
  execute function public.set_ai_conversations_updated_at();

create or replace function public.set_entity_embeddings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_entity_embeddings_updated_at on public.entity_embeddings;
create trigger trg_entity_embeddings_updated_at
  before update on public.entity_embeddings
  for each row
  execute function public.set_entity_embeddings_updated_at();

-- =====================================================================
-- 5. RLS : service_role only, no policy shipped on purpose
-- =====================================================================
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.entity_embeddings enable row level security;

commit;
