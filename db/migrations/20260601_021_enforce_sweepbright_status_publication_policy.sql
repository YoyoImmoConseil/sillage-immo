-- 20260601_021_enforce_sweepbright_status_publication_policy.sql
--
-- Goal: enforce a conservative whitelist on the public catalogue surface and
-- document the PII sensitivity of `properties.raw_payload`.
--
-- Background: the SweepBright ingestion pipeline (services/properties/
-- sweepbright-sync.service.ts) used to force `is_published=true` and
-- `publication_status='active'` for every estate, regardless of its
-- `availability_status`. As a result, properties carrying internal statuses
-- such as `prospect` (estimation in progress), `option`, `agreement`, or even
-- `null` ended up on the public site and on buyer alerts.
--
-- Fix policy (validated with the product owner): only `available`, `agreement`
-- and `option` are allowed on the public surface; everything else stays
-- hidden until SweepBright moves the estate to a public status.
--
-- This migration:
--   1. adds a self-documenting COMMENT on `properties.raw_payload` to flag
--      the RGPD-sensitive vendors PII contained inside (names, emails,
--      phones of property owners) — RLS is already enabled with zero policy
--      on this table, which means only `service_role` can read it; this
--      comment makes the constraint explicit for future contributors.
--   2. retro-actively unpublishes every listing whose underlying property has
--      a non-public availability_status. The query is idempotent: running it
--      again after a fresh ingestion will only touch rows that should not be
--      published.

begin;

-- (1) Document the RGPD-sensitive nature of `raw_payload`.
comment on column public.properties.raw_payload is
  'SweepBright estate snapshot kept as-is for re-projection / debugging. '
  'Contains RGPD-sensitive owner PII under raw_payload->''vendors'' '
  '(first_name, last_name, email, phone). Never expose this column on the '
  'public surface; only `service_role` should read it. RLS on `properties` '
  'is enabled with zero policy, which already denies anon / authenticated '
  'reads by default.';

-- (2) Idempotent retro-fix on existing listings.
--     We deliberately key the whitelist on the same SQL literal as the
--     application code (lib/properties/canonical-types.ts) to keep the
--     two in sync; bumping the whitelist requires bumping both.
update public.property_listings as pl
set
  is_published = false,
  publication_status = 'inactive',
  unpublished_at = coalesce(pl.unpublished_at, now()),
  updated_at = now()
from public.properties as p
where pl.property_id = p.id
  and pl.is_published = true
  and (
    p.availability_status is null
    or lower(trim(p.availability_status)) not in ('available', 'agreement', 'option')
  );

commit;
