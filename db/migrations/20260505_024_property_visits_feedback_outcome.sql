-- 20260505_024_property_visits_feedback_outcome.sql
--
-- Goal:
--   Align the property_visits feedback model with the *real* SweepBright
--   Feedback UX, observed live: a visiting report does NOT carry a numeric
--   rating (1-5), but a qualitative enum among 5 buckets:
--     - no_interest
--     - wants_info
--     - wants_to_visit
--     - offer
--     - deal
--   The two comment fields (public / internal) are explicitly distinguished
--   in SweepBright's UI by a 🔒 lock icon and a "this text will appear in
--   the owner report" hint. We respect that distinction: the seller portal
--   exposes ONLY the public comment; the internal comment stays admin-only.
--
-- Scope:
--   1. ADD column property_visits.feedback_outcome (text, nullable, no check
--      constraint — kept open for forward compatibility with future
--      SweepBright values).
--   2. REFRESH the privacy-first view property_visits_public_v to surface
--      feedback_outcome and feedback_comment_public, while continuing to
--      hide feedback_comment_internal. This is defense-in-depth: today we
--      bypass the view via supabaseAdmin in the service layer, but the view
--      is the canonical "seller-safe projection" for any future direct read.
--
-- Backwards compatible. Idempotent.

begin;

-- =====================================================================
-- 1. Add feedback_outcome column
-- =====================================================================
alter table public.property_visits
  add column if not exists feedback_outcome text;

comment on column public.property_visits.feedback_outcome is
  'SweepBright Feedback enum value attached to a visiting report. '
  'Free-form text — typical values observed: no_interest, wants_info, '
  'wants_to_visit, offer, deal. Stored as text rather than a postgres '
  'enum for forward compatibility with future SweepBright values; the '
  'application layer does the localization.';

-- =====================================================================
-- 2. Refresh property_visits_public_v
--    - keeps it free of any internal comment / PII (unchanged from 023)
--    - adds feedback_outcome and feedback_comment_public (the only two
--      feedback fields safe to expose to the seller)
--    - keeps the WHERE clause (RLS via owner / co-owner) byte-identical
--      with migration 023.
-- =====================================================================
-- Note: existing columns must keep their original position when running
-- `create or replace view`. We append the new feedback_* columns after the
-- legacy projection (created_at / updated_at) to satisfy that invariant.
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
  pv.updated_at,
  pv.feedback_outcome,
  pv.feedback_comment_public
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
  'Strips PII (contact_name/email/phone, internal comment, creator '
  'details, raw payload) and replaces visitor identity with initials only. '
  'Exposes feedback_outcome and feedback_comment_public so the seller can '
  'see the advisor''s public takeaway from a completed visit, but never '
  'feedback_comment_internal (advisor-only, lock-icon flagged in '
  'SweepBright UI). Filters rows to properties owned by the calling '
  'auth.uid() through legacy primary OR indivision membership.';

grant select on public.property_visits_public_v to authenticated;

commit;
