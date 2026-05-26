-- 20260527_034_mynotary_integration.sql
--
-- Goal: ingest signed contracts from MyNotary (mandate de vente,
-- offre d'achat, compromis de vente) so the dashboard /admin shows
-- real signed-contract counts instead of `mandate_status='signed'`
-- (which is never written today) and so the MCP copilot can query
-- the signing history through dedicated tools.
--
-- This migration is INBOUND-ONLY (phase 1):
--
--   1. `mynotary_signed_documents` is the canonical row per signed
--      contract returned by MyNotary (one row = one mynotary_contract_id).
--      It carries the kind (mandate / purchase_offer / preliminary_sale),
--      the signing timestamp, the signers + signed file URLs, a copy of
--      the raw event payload (for audit + replay), plus best-effort
--      matching pointers to `seller_projects` / `properties`.
--
--   2. `mynotary_events` is the append-only event log used to make
--      the inbound webhook strictly idempotent. The `event_id`
--      column is the MyNotary-supplied unique identifier we
--      ON CONFLICT-skip when the same event is delivered twice.
--
--   3. `seller_projects` gains `mandate_signed_at` (the real signing
--      date — distinct from `updated_at` which can be polluted by
--      any unrelated edit) and `mynotary_operation_id` so we can
--      navigate from a project to the MyNotary operation it lives in.
--
--   4. `app_settings` is a tiny key/value table created here because
--      we need a place to remember `mynotary.last_synced_at` for the
--      incremental backfill cron (Lot 4). RLS service_role only.
--
--   5. Seed `tool_versions` for the 3 new MCP tools shipped in Lot 4.
--
-- RLS: enabled on every new table, NO policy shipped on purpose.
-- The webhook + cron + admin endpoints all go through supabaseAdmin
-- (service_role), exactly like the other AI / MCP tables.
--
-- Idempotent: safe to re-apply.

begin;

-- =====================================================================
-- 1. mynotary_signed_documents
-- =====================================================================
create table if not exists public.mynotary_signed_documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  mynotary_operation_id text not null,
  mynotary_contract_id text not null,

  contract_kind text not null,
  contract_type_raw text,

  signed_at timestamptz not null,
  signers jsonb not null default '[]'::jsonb,
  files jsonb not null default '[]'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb,

  matched_seller_project_id uuid references public.seller_projects(id) on delete set null,
  matched_property_id uuid references public.properties(id) on delete set null,
  match_confidence numeric(3,2),
  match_method text,
  match_attempted_at timestamptz,

  constraint uq_mynotary_contract unique (mynotary_contract_id),
  constraint chk_mynotary_signed_documents_kind
    check (contract_kind in ('mandate', 'purchase_offer', 'preliminary_sale')),
  constraint chk_mynotary_signed_documents_signers_array
    check (jsonb_typeof(signers) = 'array'),
  constraint chk_mynotary_signed_documents_files_array
    check (jsonb_typeof(files) = 'array'),
  constraint chk_mynotary_signed_documents_payload_object
    check (jsonb_typeof(raw_payload) = 'object'),
  constraint chk_mynotary_signed_documents_match_method
    check (
      match_method is null or
      match_method in ('email_exact', 'address_exact', 'address_fuzzy', 'manual', 'none')
    ),
  constraint chk_mynotary_signed_documents_confidence
    check (
      match_confidence is null or
      (match_confidence >= 0 and match_confidence <= 1)
    )
);

create index if not exists idx_mynotary_signed_documents_kind_signed_at
  on public.mynotary_signed_documents (contract_kind, signed_at desc);

create index if not exists idx_mynotary_signed_documents_operation
  on public.mynotary_signed_documents (mynotary_operation_id);

create index if not exists idx_mynotary_signed_documents_matched_project
  on public.mynotary_signed_documents (matched_seller_project_id)
  where matched_seller_project_id is not null;

create index if not exists idx_mynotary_signed_documents_unmatched
  on public.mynotary_signed_documents (signed_at desc)
  where matched_seller_project_id is null and deleted_at is null;

comment on table public.mynotary_signed_documents is
  'Canonical row per signed contract returned by MyNotary (mandate / '
  'purchase_offer / preliminary_sale). Source of truth for the admin '
  'dashboard KPI cards "Mandats signés" / "Offres signées" / '
  '"Compromis signés".';

-- =====================================================================
-- 2. updated_at trigger
-- =====================================================================
create or replace function public.set_mynotary_signed_documents_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_mynotary_signed_documents_updated_at
  on public.mynotary_signed_documents;

create trigger trg_mynotary_signed_documents_updated_at
  before update on public.mynotary_signed_documents
  for each row
  execute function public.set_mynotary_signed_documents_updated_at();

alter table public.mynotary_signed_documents enable row level security;

-- =====================================================================
-- 3. mynotary_events (idempotent event log)
-- =====================================================================
create table if not exists public.mynotary_events (
  id uuid primary key default gen_random_uuid(),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error text,
  event_id text not null,
  event_type text not null,
  signature text,
  raw_payload jsonb not null default '{}'::jsonb,
  constraint uq_mynotary_event_id unique (event_id),
  constraint chk_mynotary_events_payload_object
    check (jsonb_typeof(raw_payload) = 'object')
);

create index if not exists idx_mynotary_events_received_at
  on public.mynotary_events (received_at desc);

create index if not exists idx_mynotary_events_type
  on public.mynotary_events (event_type, received_at desc);

create index if not exists idx_mynotary_events_unprocessed
  on public.mynotary_events (received_at)
  where processed_at is null;

comment on table public.mynotary_events is
  'Append-only audit log of every MyNotary webhook payload we receive. '
  'event_id is unique to make the webhook strictly idempotent: a replay '
  'of the same event simply hits the conflict and returns 200 OK.';

alter table public.mynotary_events enable row level security;

-- =====================================================================
-- 4. seller_projects: mandate_signed_at + mynotary_operation_id
-- =====================================================================
alter table public.seller_projects
  add column if not exists mandate_signed_at timestamptz,
  add column if not exists mynotary_operation_id text;

create unique index if not exists uq_seller_projects_mynotary_operation
  on public.seller_projects (mynotary_operation_id)
  where mynotary_operation_id is not null;

create index if not exists idx_seller_projects_mandate_signed_at
  on public.seller_projects (mandate_signed_at desc)
  where mandate_signed_at is not null;

comment on column public.seller_projects.mandate_signed_at is
  'Canonical signature timestamp for the mandat de vente attached to '
  'this project. Set by the MyNotary integration on signature_completed.';

comment on column public.seller_projects.mynotary_operation_id is
  'MyNotary operation id when this project has been opened in MyNotary. '
  'Used by the inbound webhook to attach a signed contract to its project.';

-- =====================================================================
-- 5. app_settings (key/value, service_role only)
-- =====================================================================
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint chk_app_settings_value_object
    check (jsonb_typeof(value) = 'object')
);

create or replace function public.set_app_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_app_settings_updated_at on public.app_settings;
create trigger trg_app_settings_updated_at
  before update on public.app_settings
  for each row
  execute function public.set_app_settings_updated_at();

alter table public.app_settings enable row level security;

comment on table public.app_settings is
  'Key/value bag for cross-deploy server state (e.g. mynotary.last_synced_at '
  'for incremental backfills). service_role only; never read from the client.';

-- =====================================================================
-- 6. Seed tool_versions for the MCP tools shipped in Lot 4
-- =====================================================================
insert into public.tool_versions (tool_name, tool_version, lifecycle_status, activated_at, description)
values
  ('mynotary.list_signed_documents', '1.0.0', 'active', now(),
   'Liste les contrats signés ingérés depuis MyNotary (mandat / offre / compromis) avec filtres period / kind / matched.'),
  ('mynotary.get_signed_document', '1.0.0', 'active', now(),
   'Récupère le détail d''un contrat MyNotary signé (signataires, fichiers, projet/bien rattaché).'),
  ('mynotary.stats_signed_by_period', '1.0.0', 'active', now(),
   'Agrège le nombre de contrats MyNotary signés sur une période (group_by day|week|month|kind|advisor).')
on conflict (tool_name, tool_version) do update
  set lifecycle_status = excluded.lifecycle_status,
      activated_at = coalesce(public.tool_versions.activated_at, excluded.activated_at),
      description = excluded.description;

commit;
