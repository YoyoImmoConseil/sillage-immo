-- 20260624_051_lead_external_ids.sql
--
-- Goal:
--   Support idempotent ingestion + identity merge for buyer and seller leads
--   fed by the Zapier integration (SweepBright Lead / Owner triggers).
--
--   Contacts may already exist in our base from self-service flows (a buyer
--   creating a search on the website, a seller asking for an estimation).
--   When the same person later arrives through a SweepBright Zap, we must
--   merge on EMAIL instead of creating a duplicate, and attach their stable
--   SweepBright identifier (`external_id`) to the existing record. Once
--   attached, `external_id` is the direct upsert key for subsequent updates
--   (Lead Updated / Owner Updated).
--
-- Idempotent: re-running after a partial apply is safe.

begin;

-- buyer_leads ----------------------------------------------------------------
alter table public.buyer_leads
  add column if not exists external_id text;

comment on column public.buyer_leads.external_id is
  'Stable id of the originating record (e.g. SweepBright lead id) for '
  'idempotent inbound upsert + email-based merge. Unique when present.';

create unique index if not exists uq_buyer_leads_external_id
  on public.buyer_leads (external_id)
  where external_id is not null;

-- seller_leads ---------------------------------------------------------------
alter table public.seller_leads
  add column if not exists external_id text;

comment on column public.seller_leads.external_id is
  'Stable id of the originating record (e.g. SweepBright owner id) for '
  'idempotent inbound upsert + email-based merge. Unique when present.';

create unique index if not exists uq_seller_leads_external_id
  on public.seller_leads (external_id)
  where external_id is not null;

commit;
