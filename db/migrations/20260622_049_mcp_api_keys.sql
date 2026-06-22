-- 20260622_049_mcp_api_keys.sql
--
-- Goal (Porte 4 — durcissement MCP externe) :
--   Named, scoped API keys for third-party MCP consumers (e.g. Claude
--   Desktop). Each key carries:
--     - a tool allowlist (scopes.tools: string[]),
--     - a write scope (can_write),
--     - a PII scope (can_read_pii),
--     - an optional IP allowlist,
--     - an optional per-key rate limit.
--   Keys are revocable and audited (last_used_at). Only the SHA-256 hash of
--   the secret is stored; the plaintext is shown once at creation time.
--
-- RLS is enabled but locked (no policies for the `authenticated` role): the
-- table is only reachable via the service role, exactly like the other
-- sensitive tables.
--
-- Idempotent.

begin;

create table if not exists public.mcp_api_keys (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  key_prefix text not null,
  key_hash text not null unique,
  scopes jsonb not null default '{"tools": []}'::jsonb,
  can_write boolean not null default false,
  can_read_pii boolean not null default false,
  ip_allowlist text[],
  rate_limit_per_minute integer,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_by_admin_profile_id uuid references public.admin_profiles (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_mcp_api_keys_key_hash on public.mcp_api_keys (key_hash);
create index if not exists idx_mcp_api_keys_active
  on public.mcp_api_keys (revoked_at)
  where revoked_at is null;

alter table public.mcp_api_keys enable row level security;

comment on table public.mcp_api_keys is
  'Named, scoped, revocable API keys for external MCP consumers. Only SHA-256 hash stored. Service-role only (RLS locked).';

commit;
