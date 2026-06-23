-- 20260623_050_zapier_ingestion.sql
--
-- Goal:
--   Support idempotent ingestion fed by the Zapier integration (Porte 4
--   extension). Inbound Zaps (SweepBright / MyNotary → Zapier → Sillage)
--   create or update transactions and append market observations. To make
--   Zap retries safe and replayable, we key inbound rows by the source
--   record id (`external_id`) and tag their provenance with a new `'zapier'`
--   source value.
--
-- Changes:
--   - transactions.external_id (unique when present) + 'zapier' source value
--     (transaction source + honoraires source).
--   - honoraires_history: 'zapier' source value.
--   - market_observations.external_id (unique when present) + 'zapier' source.
--
-- Idempotent: re-running the script after a partial apply MUST be safe.

begin;

-- =====================================================================
-- 1. transactions — idempotency key + zapier provenance
-- =====================================================================

alter table public.transactions
  add column if not exists external_id text;

comment on column public.transactions.external_id is
  'Stable id of the originating record (e.g. SweepBright deal / MyNotary '
  'contract) for idempotent inbound upserts. Unique when present.';

create unique index if not exists uq_transactions_external_id
  on public.transactions (external_id)
  where external_id is not null;

alter table public.transactions
  drop constraint if exists chk_transactions_source;
alter table public.transactions
  add constraint chk_transactions_source
  check (source in ('manual', 'sweepbright', 'mynotary', 'zapier'));

alter table public.transactions
  drop constraint if exists chk_transactions_honoraires_source;
alter table public.transactions
  add constraint chk_transactions_honoraires_source
  check (
    honoraires_source is null
    or honoraires_source in ('sweepbright', 'manual', 'adjusted', 'mynotary', 'zapier')
  );

-- =====================================================================
-- 2. honoraires_history — zapier provenance
-- =====================================================================

alter table public.honoraires_history
  drop constraint if exists chk_honoraires_history_source;
alter table public.honoraires_history
  add constraint chk_honoraires_history_source
  check (source in ('sweepbright', 'manual', 'adjusted', 'mynotary', 'zapier'));

-- =====================================================================
-- 3. market_observations — idempotency key + zapier provenance
-- =====================================================================

alter table public.market_observations
  add column if not exists external_id text;

comment on column public.market_observations.external_id is
  'Stable id of the originating record for idempotent inbound dedupe. '
  'Unique when present.';

create unique index if not exists uq_market_observations_external_id
  on public.market_observations (external_id)
  where external_id is not null;

alter table public.market_observations
  drop constraint if exists chk_market_observations_source;
alter table public.market_observations
  add constraint chk_market_observations_source
  check (source in ('loupe', 'manual', 'zapier'));

commit;
