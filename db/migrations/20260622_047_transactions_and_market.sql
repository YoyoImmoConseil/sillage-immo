-- 20260622_047_transactions_and_market.sql
--
-- Goal:
--   Introduce the "transaction" first-class object and a market-observation
--   ledger, feeding the Admin Copilot analytics (Phase 3) and the agency's
--   revenue model.
--
--   A transaction ties together a property, the seller side (seller_project
--   and/or seller person(s)), the buyer side (buyer_project for a known BDD
--   buyer, OR an external acquéreur), an advisor (attribution), price
--   milestones (mandate / compromis / acte) and the agency honoraires (CA HT).
--
--   Tables:
--     - transactions             : the central object + lifecycle + prices + honoraires.
--     - transaction_sellers      : seller person(s) attached to a transaction.
--     - transaction_buyers       : buyer person(s) — supports external acquéreurs.
--     - honoraires_history       : append-only versioned trail of honoraires changes.
--     - market_observations      : price/m² observations (Loupe estimates + manual).
--
--   These tables carry internal business/finance data: RLS is enabled and
--   locked (no policy for `authenticated`); only the service role (server)
--   reads/writes them.
--
-- Idempotent: re-running the script after a partial apply MUST be safe.

begin;

-- =====================================================================
-- 1. transactions
-- =====================================================================

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reference text,
  business_type text not null default 'sale',
  status text not null default 'mandate',
  property_id uuid references public.properties(id) on delete set null,
  seller_project_id uuid references public.seller_projects(id) on delete set null,
  buyer_project_id uuid references public.buyer_projects(id) on delete set null,
  client_project_id uuid references public.client_projects(id) on delete set null,
  assigned_admin_profile_id uuid references public.admin_profiles(id) on delete set null,
  currency text not null default 'EUR',
  mandate_price_amount integer,
  agreed_price_amount integer,
  deed_price_amount integer,
  honoraires_amount integer,
  honoraires_source text,
  mandate_signed_at timestamptz,
  offer_received_at timestamptz,
  preliminary_sale_signed_at timestamptz,
  deed_signed_at timestamptz,
  cancelled_at timestamptz,
  source text not null default 'manual',
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  constraint chk_transactions_business_type check (business_type in ('sale', 'rental')),
  constraint chk_transactions_status check (
    status in ('prospect', 'mandate', 'offer', 'compromis', 'acte', 'cancelled')
  ),
  constraint chk_transactions_source check (source in ('manual', 'sweepbright', 'mynotary')),
  constraint chk_transactions_honoraires_source check (
    honoraires_source is null
    or honoraires_source in ('sweepbright', 'manual', 'adjusted', 'mynotary')
  )
);

create index if not exists idx_transactions_advisor on public.transactions (assigned_admin_profile_id);
create index if not exists idx_transactions_status on public.transactions (status);
create index if not exists idx_transactions_property on public.transactions (property_id);
create index if not exists idx_transactions_business_type on public.transactions (business_type);
create index if not exists idx_transactions_deed_signed_at on public.transactions (deed_signed_at);
create index if not exists idx_transactions_seller_project on public.transactions (seller_project_id);
create index if not exists idx_transactions_buyer_project on public.transactions (buyer_project_id);

comment on table public.transactions is
  'First-class transaction: property + seller side + buyer side + advisor + '
  'price milestones (mandate/compromis/acte) + agency honoraires (CA HT). '
  'Internal finance data: service-role only (RLS locked).';
comment on column public.transactions.honoraires_amount is
  'Current agency honoraires (assumed HT). Adjusted at compromis if negotiated.';
comment on column public.transactions.deed_signed_at is
  'Acte authentique signed date — drives realized revenue (CA réalisé).';

alter table public.transactions enable row level security;

-- =====================================================================
-- 2. transaction_sellers
-- =====================================================================

create table if not exists public.transaction_sellers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  contact_identity_id uuid references public.contact_identities(id) on delete set null,
  seller_lead_id uuid references public.seller_leads(id) on delete set null,
  client_profile_id uuid references public.client_profiles(id) on delete set null,
  external_name text,
  external_email text,
  share_percent numeric,
  metadata jsonb not null default '{}'::jsonb,
  constraint chk_transaction_sellers_identifier check (
    contact_identity_id is not null
    or seller_lead_id is not null
    or client_profile_id is not null
    or external_name is not null
  )
);

create index if not exists idx_transaction_sellers_transaction on public.transaction_sellers (transaction_id);
create index if not exists idx_transaction_sellers_contact on public.transaction_sellers (contact_identity_id);

comment on table public.transaction_sellers is
  'Seller person(s) attached to a transaction (multi-vendeurs/indivision supported).';

alter table public.transaction_sellers enable row level security;

-- =====================================================================
-- 3. transaction_buyers (external acquéreur supported)
-- =====================================================================

create table if not exists public.transaction_buyers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  contact_identity_id uuid references public.contact_identities(id) on delete set null,
  buyer_lead_id uuid references public.buyer_leads(id) on delete set null,
  client_profile_id uuid references public.client_profiles(id) on delete set null,
  external_name text,
  external_email text,
  is_external boolean not null default false,
  share_percent numeric,
  metadata jsonb not null default '{}'::jsonb,
  constraint chk_transaction_buyers_identifier check (
    contact_identity_id is not null
    or buyer_lead_id is not null
    or client_profile_id is not null
    or external_name is not null
  )
);

create index if not exists idx_transaction_buyers_transaction on public.transaction_buyers (transaction_id);
create index if not exists idx_transaction_buyers_contact on public.transaction_buyers (contact_identity_id);
create index if not exists idx_transaction_buyers_buyer_lead on public.transaction_buyers (buyer_lead_id);

comment on table public.transaction_buyers is
  'Buyer person(s) attached to a transaction. is_external=true when the '
  'acquéreur is not in the Sillage BDD (free-text name/email).';

alter table public.transaction_buyers enable row level security;

-- =====================================================================
-- 4. honoraires_history (versioned)
-- =====================================================================

create table if not exists public.honoraires_history (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  amount integer not null,
  currency text not null default 'EUR',
  source text not null default 'manual',
  reason text,
  recorded_by_admin_profile_id uuid references public.admin_profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  constraint chk_honoraires_history_source check (
    source in ('sweepbright', 'manual', 'adjusted', 'mynotary')
  )
);

create index if not exists idx_honoraires_history_transaction
  on public.honoraires_history (transaction_id, created_at desc);

comment on table public.honoraires_history is
  'Append-only trail of honoraires changes per transaction (audit of CA).';

alter table public.honoraires_history enable row level security;

-- =====================================================================
-- 5. market_observations (price/m² ledger)
-- =====================================================================

create table if not exists public.market_observations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  observed_at timestamptz not null default now(),
  source text not null default 'loupe',
  valuation_id uuid references public.valuations(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  city text,
  postal_code text,
  zone_slug text,
  neighborhood text,
  property_type text,
  business_type text not null default 'sale',
  price_per_m2 numeric,
  price_per_m2_low numeric,
  price_per_m2_high numeric,
  estimated_price integer,
  living_area_m2 numeric,
  currency text not null default 'EUR',
  raw_payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  constraint chk_market_observations_source check (source in ('loupe', 'manual')),
  constraint chk_market_observations_business_type check (business_type in ('sale', 'rental'))
);

create index if not exists idx_market_observations_city on public.market_observations (city);
create index if not exists idx_market_observations_postal on public.market_observations (postal_code);
create index if not exists idx_market_observations_observed_at on public.market_observations (observed_at desc);
create index if not exists idx_market_observations_property_type on public.market_observations (property_type);

comment on table public.market_observations is
  'Price/m² observations captured from Loupe estimates (and manual entries). '
  'Feeds market-trend analytics for the Admin Copilot.';

alter table public.market_observations enable row level security;

commit;
