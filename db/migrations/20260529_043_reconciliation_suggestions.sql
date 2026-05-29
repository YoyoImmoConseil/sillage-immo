-- 20260529_043_reconciliation_suggestions.sql
--
-- Réconciliation multi-sources — Phase 2 (moteur de réconciliation).
--
-- `reconciliation_suggestions` is the review queue for *weak* matches
-- found by reconcile.service.ts. Strong matches are auto-linked
-- (project_properties + mynotary_signed_documents.matched_*); weak ones
-- land here so an operator confirms (→ link) or rejects them from the
-- /admin/reconciliation screen.
--
--   - source_kind / source_ref : the record being reconciled.
--       sweepbright_property → properties.id
--       mynotary_document    → mynotary_signed_documents.id
--       estimator_lead       → seller_leads.id
--   - target_client_project_id : the candidate hub it might belong to.
--   - score / reasons          : confidence + the signals that fired
--       (address_fuzzy, price_band, surface_band, name_fuzzy, email…).
--   - fields_preview           : snapshot of source vs target facts so
--       the reviewer can decide without extra queries.
--
-- RLS enabled, no policy (service_role only — admin paths go through
-- supabaseAdmin), consistent with the other reconciliation tables.
--
-- Idempotent: safe to re-apply.

begin;

create table if not exists public.reconciliation_suggestions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  source_kind text not null,
  source_ref text not null,

  target_client_project_id uuid references public.client_projects(id) on delete cascade,

  score numeric(3,2) not null default 0,
  reasons jsonb not null default '[]'::jsonb,
  fields_preview jsonb not null default '{}'::jsonb,

  status text not null default 'pending',
  resolved_at timestamptz,
  resolved_by_admin_profile_id uuid references public.admin_profiles(id) on delete set null,

  constraint chk_reconciliation_suggestions_kind
    check (source_kind in ('sweepbright_property', 'mynotary_document', 'estimator_lead')),
  constraint chk_reconciliation_suggestions_status
    check (status in ('pending', 'accepted', 'rejected', 'superseded')),
  constraint chk_reconciliation_suggestions_score
    check (score >= 0 and score <= 1),
  constraint chk_reconciliation_suggestions_reasons_array
    check (jsonb_typeof(reasons) = 'array'),
  constraint chk_reconciliation_suggestions_preview_object
    check (jsonb_typeof(fields_preview) = 'object')
);

-- One live (pending) suggestion per (source, target) pair. Re-running
-- reconcile() upserts on this key instead of piling up duplicates.
create unique index if not exists uq_reconciliation_suggestions_pending
  on public.reconciliation_suggestions (source_kind, source_ref, target_client_project_id)
  where status = 'pending';

create index if not exists idx_reconciliation_suggestions_pending
  on public.reconciliation_suggestions (created_at desc)
  where status = 'pending';

create index if not exists idx_reconciliation_suggestions_target
  on public.reconciliation_suggestions (target_client_project_id)
  where status = 'pending';

create or replace function public.set_reconciliation_suggestions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_reconciliation_suggestions_updated_at
  on public.reconciliation_suggestions;

create trigger trg_reconciliation_suggestions_updated_at
  before update on public.reconciliation_suggestions
  for each row
  execute function public.set_reconciliation_suggestions_updated_at();

alter table public.reconciliation_suggestions enable row level security;

comment on table public.reconciliation_suggestions is
  'Review queue for weak multi-source reconciliation matches (SweepBright '
  'property / MyNotary document / estimator lead → client_project hub). '
  'Strong matches are auto-linked; these are confirmed/rejected from '
  '/admin/reconciliation. service_role only.';

commit;
