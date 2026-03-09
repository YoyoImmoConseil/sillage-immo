begin;

create extension if not exists pgcrypto;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null,
  email text not null,
  phone text,
  message text,
  source text,
  status text not null default 'new',
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_type text not null,
  actor_id uuid,
  action text not null,
  entity_type text,
  entity_id uuid,
  data jsonb not null default '{}'::jsonb
);

create table if not exists public.tool_versions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  tool_name text not null,
  tool_version text not null,
  lifecycle_status text not null default 'active',
  activated_at timestamptz,
  deprecated_at timestamptz,
  description text,
  changelog jsonb not null default '{}'::jsonb,
  unique (tool_name, tool_version)
);

create table if not exists public.zone_catalog (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  slug text not null unique,
  city text not null,
  score int2 not null,
  aliases jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.seller_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null,
  email text not null,
  phone text,
  property_type text,
  property_address text,
  city text,
  postal_code text,
  timeline text,
  occupancy_status text,
  estimated_price integer,
  diagnostics_ready boolean,
  diagnostics_support_needed boolean,
  syndic_docs_ready boolean,
  syndic_support_needed boolean,
  message text,
  source text,
  status text not null default 'new',
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.seller_scoring_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  seller_lead_id uuid not null references public.seller_leads(id) on delete cascade,
  score integer not null,
  segment text not null,
  next_best_action text not null,
  breakdown jsonb not null default '{}'::jsonb,
  reasons jsonb not null default '[]'::jsonb
);

create table if not exists public.seller_email_verifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text not null,
  code_hash text not null,
  verification_token text not null,
  expires_at timestamptz not null,
  verified_at timestamptz,
  consumed_at timestamptz,
  attempts int2 not null default 0
);

create table if not exists public.domain_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  occurred_at timestamptz not null default now(),
  aggregate_type text not null,
  aggregate_id uuid not null,
  event_name text not null,
  event_version int2 not null default 1,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  attempts int2 not null default 0,
  last_error text,
  published_at timestamptz
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_tool_versions_tool_name_not_blank'
  ) then
    alter table public.tool_versions
      add constraint chk_tool_versions_tool_name_not_blank
      check (length(btrim(tool_name)) > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_tool_versions_tool_name_format'
  ) then
    alter table public.tool_versions
      add constraint chk_tool_versions_tool_name_format
      check (tool_name ~ '^[a-z][a-z0-9._-]*$');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_tool_versions_tool_version_not_blank'
  ) then
    alter table public.tool_versions
      add constraint chk_tool_versions_tool_version_not_blank
      check (length(btrim(tool_version)) > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_tool_versions_tool_version_semver'
  ) then
    alter table public.tool_versions
      add constraint chk_tool_versions_tool_version_semver
      check (
        tool_version ~ '^[0-9]+[.][0-9]+[.][0-9]+(-[0-9A-Za-z.-]+)?([+][0-9A-Za-z.-]+)?$'
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_tool_versions_lifecycle_status_values'
  ) then
    alter table public.tool_versions
      add constraint chk_tool_versions_lifecycle_status_values
      check (lifecycle_status in ('draft', 'active', 'deprecated'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_tool_versions_changelog_object'
  ) then
    alter table public.tool_versions
      add constraint chk_tool_versions_changelog_object
      check (jsonb_typeof(changelog) = 'object');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_zone_catalog_slug_not_blank'
  ) then
    alter table public.zone_catalog
      add constraint chk_zone_catalog_slug_not_blank
      check (length(btrim(slug)) > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_zone_catalog_score_range'
  ) then
    alter table public.zone_catalog
      add constraint chk_zone_catalog_score_range
      check (score >= 0 and score <= 15);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_zone_catalog_aliases_array'
  ) then
    alter table public.zone_catalog
      add constraint chk_zone_catalog_aliases_array
      check (jsonb_typeof(aliases) = 'array');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_domain_events_status_values'
  ) then
    alter table public.domain_events
      add constraint chk_domain_events_status_values
      check (status in ('pending', 'processed', 'failed'));
  end if;
end
$$;

alter table public.leads enable row level security;
alter table public.audit_log enable row level security;
alter table public.tool_versions enable row level security;
alter table public.zone_catalog enable row level security;
alter table public.seller_leads enable row level security;
alter table public.seller_scoring_events enable row level security;
alter table public.domain_events enable row level security;

create index if not exists idx_audit_log_mcp_request_id
on public.audit_log ((data->>'request_id'));

create index if not exists idx_audit_log_execution_request_id
on public.audit_log ((data->'execution'->>'request_id'));

create index if not exists idx_audit_log_action_created_at
on public.audit_log (action, created_at desc);

create index if not exists idx_tool_versions_lifecycle_status
on public.tool_versions (lifecycle_status);

create index if not exists idx_zone_catalog_active_city
on public.zone_catalog (is_active, city);

create index if not exists idx_seller_leads_status_created_at
on public.seller_leads (status, created_at desc);

create index if not exists idx_seller_scoring_events_lead_created_at
on public.seller_scoring_events (seller_lead_id, created_at desc);

create index if not exists idx_seller_email_verifications_email_created_at
on public.seller_email_verifications (email, created_at desc);

create index if not exists idx_domain_events_status_created_at
on public.domain_events (status, created_at asc);

create index if not exists idx_domain_events_aggregate_created_at
on public.domain_events (aggregate_type, aggregate_id, created_at desc);

drop policy if exists "leads_insert_public" on public.leads;
create policy "leads_insert_public"
  on public.leads
  for insert
  to public
  with check (true);

drop policy if exists "audit_insert_authenticated" on public.audit_log;
create policy "audit_insert_authenticated"
  on public.audit_log
  for insert
  to authenticated
  with check (auth.uid() is not null);

drop policy if exists "seller_leads_insert_public" on public.seller_leads;
create policy "seller_leads_insert_public"
  on public.seller_leads
  for insert
  to public
  with check (true);

drop policy if exists "seller_scoring_events_insert_authenticated" on public.seller_scoring_events;
create policy "seller_scoring_events_insert_authenticated"
  on public.seller_scoring_events
  for insert
  to authenticated
  with check (auth.uid() is not null);

commit;
