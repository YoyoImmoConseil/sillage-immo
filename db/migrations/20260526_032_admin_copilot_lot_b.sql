-- 20260526_032_admin_copilot_lot_b.sql
--
-- Goal: provide the data + tool_versions plumbing required by the
-- admin copilot (Lot B).
--
--   1. `ai_copilot_usage_daily` keeps a per-admin / per-day rolling
--      tally of tokens + cost spent on the copilot, so the orchestrator
--      can emit a soft warning in the UI when the configured cap
--      (default 5€) is exceeded. The cost is denormalized in
--      `cost_micros` (1 cent = 1000 micros) for cheap integer math.
--
--   2. Seed `tool_versions` for the 6 new MCP tools shipped with the
--      copilot orchestrator:
--        - admin_dashboard.snapshot
--        - admin_copilot.usage_today
--        - admin_copilot.suggest_prompts
--
--      The orchestrator itself does not register as a tool — it CALLS
--      tools — but these three helpers are exposed so the same data
--      can be queried from any MCP client (Cursor, Claude Desktop,
--      stdio bridge).
--
-- RLS: service_role only. Frontend never touches this directly.
--
-- Idempotent.

begin;

-- =====================================================================
-- 1. ai_copilot_usage_daily
-- =====================================================================
create table if not exists public.ai_copilot_usage_daily (
  id uuid primary key default gen_random_uuid(),
  admin_profile_id uuid not null references public.admin_profiles(id) on delete cascade,
  day date not null,
  tokens_in_total bigint not null default 0,
  tokens_out_total bigint not null default 0,
  cost_micros_total bigint not null default 0,
  iterations_total int not null default 0,
  conversations_total int not null default 0,
  updated_at timestamptz not null default now(),
  constraint uq_ai_copilot_usage_daily_admin_day
    unique (admin_profile_id, day),
  constraint chk_ai_copilot_usage_daily_nonneg
    check (
      tokens_in_total >= 0 and
      tokens_out_total >= 0 and
      cost_micros_total >= 0 and
      iterations_total >= 0 and
      conversations_total >= 0
    )
);

create index if not exists idx_ai_copilot_usage_daily_day
  on public.ai_copilot_usage_daily (day desc);

comment on table public.ai_copilot_usage_daily is
  'Per-admin/per-day rolling tally of admin copilot token + cost usage. '
  'Used by services/admin/copilot-orchestrator.service.ts to emit a soft '
  'warning when the configured daily cap (default 5€) is exceeded.';

create or replace function public.set_ai_copilot_usage_daily_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_ai_copilot_usage_daily_updated_at
  on public.ai_copilot_usage_daily;

create trigger trg_ai_copilot_usage_daily_updated_at
  before update on public.ai_copilot_usage_daily
  for each row
  execute function public.set_ai_copilot_usage_daily_updated_at();

alter table public.ai_copilot_usage_daily enable row level security;

-- =====================================================================
-- 2. Helper: bump_ai_copilot_usage (atomic upsert)
-- =====================================================================
create or replace function public.bump_ai_copilot_usage(
  p_admin_profile_id uuid,
  p_tokens_in bigint,
  p_tokens_out bigint,
  p_cost_micros bigint,
  p_iterations int default 1,
  p_conversations int default 0
)
returns table (
  day date,
  tokens_in_total bigint,
  tokens_out_total bigint,
  cost_micros_total bigint,
  iterations_total int,
  conversations_total int
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  insert into public.ai_copilot_usage_daily (
    admin_profile_id, day,
    tokens_in_total, tokens_out_total, cost_micros_total,
    iterations_total, conversations_total
  )
  values (
    p_admin_profile_id, current_date,
    greatest(p_tokens_in, 0),
    greatest(p_tokens_out, 0),
    greatest(p_cost_micros, 0),
    greatest(p_iterations, 0),
    greatest(p_conversations, 0)
  )
  on conflict (admin_profile_id, day) do update
    set tokens_in_total      = ai_copilot_usage_daily.tokens_in_total      + excluded.tokens_in_total,
        tokens_out_total     = ai_copilot_usage_daily.tokens_out_total     + excluded.tokens_out_total,
        cost_micros_total    = ai_copilot_usage_daily.cost_micros_total    + excluded.cost_micros_total,
        iterations_total     = ai_copilot_usage_daily.iterations_total     + excluded.iterations_total,
        conversations_total  = ai_copilot_usage_daily.conversations_total  + excluded.conversations_total
  returning
    ai_copilot_usage_daily.day,
    ai_copilot_usage_daily.tokens_in_total,
    ai_copilot_usage_daily.tokens_out_total,
    ai_copilot_usage_daily.cost_micros_total,
    ai_copilot_usage_daily.iterations_total,
    ai_copilot_usage_daily.conversations_total;
end;
$$;

comment on function public.bump_ai_copilot_usage(uuid, bigint, bigint, bigint, int, int) is
  'Atomic upsert that adds usage to the running per-admin/day tally. '
  'Returns the new totals so the orchestrator can compute the soft '
  'warning flag in a single round-trip.';

revoke all on function public.bump_ai_copilot_usage(uuid, bigint, bigint, bigint, int, int) from public;
grant execute on function public.bump_ai_copilot_usage(uuid, bigint, bigint, bigint, int, int) to service_role;

-- =====================================================================
-- 3. Seed tool_versions for the copilot helper tools
-- =====================================================================
insert into public.tool_versions (tool_name, tool_version, lifecycle_status, activated_at, description)
values
  ('admin_dashboard.snapshot', '1.0.0', 'active', now(),
   'Snapshot KPI/funnel/top zones/advisors/conversations pour le dashboard pilote (read-only).'),
  ('admin_copilot.usage_today', '1.0.0', 'active', now(),
   'Retourne l''usage IA cumulé du jour pour l''admin connecté (tokens + coût + warning cap 5€).'),
  ('admin_copilot.suggest_prompts', '1.0.0', 'active', now(),
   'Retourne la liste des prompts pré-configurés du copilot selon le rôle.')
on conflict (tool_name, tool_version) do update
  set lifecycle_status = excluded.lifecycle_status,
      activated_at = coalesce(public.tool_versions.activated_at, excluded.activated_at),
      description = excluded.description;

commit;
