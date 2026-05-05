-- 20260610_023_property_visits.sql
--
-- Goal:
--   Capture visit lifecycle events for properties syndicated from SweepBright.
--   The SweepBright Website API does NOT expose visits, so we receive them
--   via Zapier (Webhooks Custom Request) which POSTs to
--   /api/webhooks/sweepbright-zapier. Each external_visit_id maps to a
--   single row, upserted on every event (.scheduled / .updated / .cancelled
--   / .completed).
--
-- Privacy stance (validated with the team):
--   The seller portal MUST NOT expose buyer PII (name, email, phone). To
--   enforce that even if a future PostgREST exposure is added, we ship a
--   privacy-first projection `property_visits_public_v` that replaces the
--   visitor identity with initials only (e.g. "Claire Caisson" -> "CC").
--   The raw table denies authenticated SELECT; admin / webhooks read it
--   exclusively via the supabase service_role key.
--
-- Idempotent.

begin;

-- =====================================================================
-- 1. Helper function: compute_contact_initials(name)
-- =====================================================================
create or replace function public.compute_contact_initials(name text)
returns text
language plpgsql
immutable
as $$
declare
  trimmed text;
  parts text[];
  first_word text;
  last_word text;
begin
  if name is null then
    return '—';
  end if;
  trimmed := btrim(name);
  if trimmed = '' then
    return '—';
  end if;
  parts := regexp_split_to_array(trimmed, '\s+');
  if parts is null or array_length(parts, 1) is null or array_length(parts, 1) = 0 then
    return '—';
  end if;
  first_word := parts[1];
  last_word := parts[array_length(parts, 1)];
  if first_word = last_word then
    return upper(substr(first_word, 1, 1));
  end if;
  return upper(substr(first_word, 1, 1) || substr(last_word, 1, 1));
end;
$$;

comment on function public.compute_contact_initials(text) is
  'Privacy-first projection helper: returns the initials (first letter of '
  'the first and last word, uppercase) of a contact full name. Used by '
  'property_visits_public_v to anonymize visitor identity before exposing '
  'visits to the seller portal. NULL or empty input returns the dash glyph.';

-- =====================================================================
-- 2. property_visits table
-- =====================================================================
create table if not exists public.property_visits (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  received_at timestamptz not null default now(),
  property_id uuid not null references public.properties(id) on delete cascade,
  external_visit_id text not null,
  status text not null,
  scheduled_at timestamptz,
  ended_at timestamptz,
  duration_minutes int generated always as (
    case
      when scheduled_at is not null
       and ended_at is not null
       and ended_at > scheduled_at
        then floor(extract(epoch from (ended_at - scheduled_at)) / 60)::int
      else null
    end
  ) stored,
  negotiator_email text,
  negotiator_name text,
  negotiator_phone text,
  contact_external_id text,
  contact_email text,
  contact_name text,
  contact_phone text,
  creator_email text,
  creator_name text,
  creator_phone text,
  feedback_rating int,
  feedback_comment_public text,
  feedback_comment_internal text,
  feedback_offer_amount numeric,
  zapier_event text not null,
  occurred_at timestamptz not null,
  raw_payload jsonb not null,
  constraint chk_property_visits_status
    check (status in ('scheduled', 'updated', 'cancelled', 'completed')),
  constraint chk_property_visits_zapier_event
    check (zapier_event in (
      'visit.scheduled', 'visit.updated', 'visit.cancelled', 'visit.completed'
    )),
  constraint chk_property_visits_feedback_rating
    check (feedback_rating is null or (feedback_rating between 0 and 5))
);

create unique index if not exists idx_property_visits_external_visit_id_unique
  on public.property_visits (external_visit_id);

create index if not exists idx_property_visits_property_scheduled
  on public.property_visits (property_id, scheduled_at desc);

create index if not exists idx_property_visits_status
  on public.property_visits (status);

create index if not exists idx_property_visits_occurred
  on public.property_visits (occurred_at desc);

comment on table public.property_visits is
  'Visit lifecycle events for a property, ingested via Zapier from '
  'SweepBright (Website API does not expose visits). One row per '
  'external_visit_id (upsert on every event). Contains buyer PII '
  '(contact_name/email/phone) which MUST NOT be exposed to the seller '
  'portal: read through property_visits_public_v for client-facing '
  'audiences, or use the service layer projection helpers for admin uses.';

-- =====================================================================
-- 3. updated_at trigger
-- =====================================================================
create or replace function public.set_property_visits_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_property_visits_updated_at on public.property_visits;
create trigger trg_property_visits_updated_at
  before update on public.property_visits
  for each row
  execute function public.set_property_visits_updated_at();

-- =====================================================================
-- 4. RLS : service_role bypasses (admin + webhooks).
--          authenticated cannot read the raw table.
-- =====================================================================
alter table public.property_visits enable row level security;

drop policy if exists "property_visits_no_authenticated"
  on public.property_visits;
create policy "property_visits_no_authenticated"
  on public.property_visits
  for all
  to authenticated
  using (false)
  with check (false);

-- =====================================================================
-- 5. Privacy-first projection: property_visits_public_v
--
-- The view runs as its owner (default security_invoker = false), which
-- means it can read the underlying table even though authenticated is
-- denied direct access. The WHERE clause restricts rows to properties
-- accessible by the calling auth user, supporting both:
--   - the legacy primary owner (client_projects.client_profile_id), and
--   - the indivision membership (client_project_clients).
-- security_barrier = true prevents predicate-pushdown attacks where a
-- malicious WHERE could leak hidden columns.
-- =====================================================================
create or replace view public.property_visits_public_v
with (security_barrier = true) as
select
  pv.id,
  pv.property_id,
  pv.status,
  pv.scheduled_at,
  pv.ended_at,
  pv.duration_minutes,
  pv.negotiator_name,
  pv.zapier_event,
  pv.occurred_at,
  public.compute_contact_initials(pv.contact_name) as contact_initials,
  pv.created_at,
  pv.updated_at
from public.property_visits pv
where exists (
  select 1
  from public.project_properties pp
  join public.client_projects cproj on cproj.id = pp.client_project_id
  join public.client_profiles cp on cp.id = cproj.client_profile_id
  where pp.property_id = pv.property_id
    and pp.unlinked_at is null
    and cp.auth_user_id = auth.uid()
)
or exists (
  select 1
  from public.project_properties pp
  join public.client_project_clients cpc
    on cpc.client_project_id = pp.client_project_id
  join public.client_profiles cp on cp.id = cpc.client_profile_id
  where pp.property_id = pv.property_id
    and pp.unlinked_at is null
    and cpc.removed_at is null
    and cp.auth_user_id = auth.uid()
);

comment on view public.property_visits_public_v is
  'Privacy-first projection of property_visits for the seller portal. '
  'Strips PII (contact_name/email/phone, full feedback comments, creator '
  'details) and replaces visitor identity with initials only. Filters '
  'rows to properties owned by the calling auth.uid() through legacy '
  'primary OR indivision membership. Service-layer code may bypass this '
  'view by reading property_visits directly via supabaseAdmin (service_role).';

grant select on public.property_visits_public_v to authenticated;

commit;
