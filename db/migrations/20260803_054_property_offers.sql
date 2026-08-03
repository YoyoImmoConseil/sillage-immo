-- Lot 2 — Offres SweepBright.
--
-- SweepBright n'expose ni prix de compromis ni prix d'acte, ni par son API
-- publique ni par Zapier (confirmé par leur support le 03/08/2026). En
-- revanche les offres sont intégralement exposées par les déclencheurs Zapier
-- `Offer *` : montant proposé, chaînage des contre-offres, issue et sa date,
-- honoraires réels.
--
-- Le montant de l'offre acceptée est donc le meilleur substitut du prix de
-- vente, et le second terme de l'écart « prix de mandat → prix obtenu ».
--
-- Projection, pas journal : une offre a un cycle de vie et `Offer Changed` se
-- déclenche à chaque modification, donc la ligne porte l'état courant de
-- l'offre. La chronologie vit dans `property_price_events` (lot 1), qui reçoit
-- un événement `offer` à la création et au refus, et `agreement` à
-- l'acceptation.
--
-- RLS activée sans policy : accès `service_role` uniquement, comme les autres
-- tables de service. Les montants d'offres et les honoraires ne doivent jamais
-- être exposés publiquement.

begin;

create table if not exists public.property_offers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  property_id uuid not null references public.properties(id) on delete cascade,
  -- Identifiant SweepBright de l'offre : porte l'idempotence de l'upsert.
  external_offer_id text not null unique,
  -- Chaînage des contre-offres (`Parent ID` côté SweepBright).
  parent_external_offer_id text,
  company_id text,
  -- Vocabulaire SweepBright (PENDING, ACCEPTED, CANCELLED…), volontairement
  -- non contraint : une valeur inconnue ne doit pas faire échouer l'ingestion.
  status text,
  -- Discriminant du déclencheur `Offer Changed`.
  reason text,
  notes text,
  currency text not null default 'EUR',
  transaction_amount numeric(14, 2),
  -- Le prix proposé par l'acquéreur : c'est LE montant qui compte.
  buyer_gross_amount numeric(14, 2),
  owner_net_amount numeric(14, 2),
  total_agency_fee numeric(14, 2),
  buyer_total_fee numeric(14, 2),
  buyer_fee_fixed numeric(14, 2),
  buyer_fee_percentage numeric(6, 3),
  owner_total_fee numeric(14, 2),
  owner_fee_fixed numeric(14, 2),
  owner_fee_percentage numeric(6, 3),
  source_created_at timestamptz,
  source_updated_at timestamptz,
  valid_until timestamptz,
  accepted_at timestamptz,
  refused_at timestamptz,
  cancelled_at timestamptz,
  archived_at timestamptz,
  -- Jalon retenu par le serveur et sa nature (accepted, refused, created…).
  occurred_at timestamptz not null,
  occurrence_kind text not null,
  source text not null default 'zapier',
  raw_payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists property_offers_property_idx
  on public.property_offers (property_id, occurred_at desc);
create index if not exists property_offers_status_idx
  on public.property_offers (status);
create index if not exists property_offers_parent_idx
  on public.property_offers (parent_external_offer_id)
  where parent_external_offer_id is not null;
create index if not exists property_offers_accepted_idx
  on public.property_offers (accepted_at)
  where accepted_at is not null;

alter table public.property_offers enable row level security;

create or replace function public.set_property_offers_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_property_offers_updated_at on public.property_offers;
create trigger trg_property_offers_updated_at
  before update on public.property_offers
  for each row
  execute function public.set_property_offers_updated_at();

commit;
