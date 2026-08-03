-- Lot 1 — Journaux append-only des prix et des statuts, et ancrage par mandat.
--
-- Problème résolu : la projection SweepBright écrit `properties` et
-- `property_listings` par upsert. Chaque synchronisation écrase donc le prix
-- précédent, le statut précédent et `published_at`, sans laisser de trace.
-- Le prix de mise en marché initial d'un bien vendu est aujourd'hui
-- irrécupérable, et la couche analytics (vues `analytics_*`, outil MCP) n'a
-- aucune série temporelle à lire.
--
-- Doctrine : additif, jamais destructif. Aucun ALTER sur les tables alimentées
-- par SweepBright (`properties`, `property_listings`, `property_media`),
-- aucune modification de l'upsert existant.
--
-- RLS : activée sans policy, comme les 29 autres tables de service du schéma.
-- L'accès reste réservé à `service_role`. Le Journal de bord public sera servi
-- par une route API agrégée, jamais par une vue Supabase ouverte.

begin;

-- ---------------------------------------------------------------------------
-- 1. property_mandates — l'ancre
-- ---------------------------------------------------------------------------
-- Un bien peut être re-mandaté des années plus tard, à un autre prix. Ancrer
-- le prix de mandat sur le bien seul ferait hériter le nouveau mandat de
-- l'ancien prix et fausserait tous les écarts. Le numéro de mandat SweepBright
-- (`settings.mandate.number`) est donc la clé métier.
--
-- Un mandat exclusif est un Mandat Sillage (décision du 03/08/2026) : c'est
-- `is_exclusive` qui porte le périmètre du registre public.
create table if not exists public.property_mandates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  property_id uuid not null references public.properties(id) on delete cascade,
  mandate_number text not null,
  is_exclusive boolean,
  start_date date,
  end_date date,
  vendor_percentage numeric(6, 3),
  vendor_fixed_fee integer,
  buyer_percentage numeric(6, 3),
  buyer_fixed_fee integer,
  -- Prix de mandat au sens Sillage : le prix constaté au PREMIER passage du
  -- bien à un statut public. Figé une seule fois, jamais réécrit — c'est cette
  -- immuabilité qui rend l'écart mandat/vente opposable.
  mandate_price_amount integer,
  mandate_price_currency text not null default 'EUR',
  first_published_at timestamptz,
  source text not null default 'sweepbright_webhook',
  metadata jsonb not null default '{}'::jsonb,
  unique (property_id, mandate_number)
);

create index if not exists property_mandates_property_idx
  on public.property_mandates (property_id);
create index if not exists property_mandates_exclusive_idx
  on public.property_mandates (is_exclusive)
  where is_exclusive is true;

alter table public.property_mandates enable row level security;

create or replace function public.set_property_mandates_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_property_mandates_updated_at on public.property_mandates;
create trigger trg_property_mandates_updated_at
  before update on public.property_mandates
  for each row
  execute function public.set_property_mandates_updated_at();

-- ---------------------------------------------------------------------------
-- 2. property_price_events — le fil chronologique des prix
-- ---------------------------------------------------------------------------
-- `occurred_at` est la date de l'événement métier (le `happened_at` du webhook,
-- la date d'une offre, la date d'un acte). `recorded_at` est la date à laquelle
-- nous l'avons constaté. Les confondre rendrait tout backfill mensonger.
--
-- `context = 'baseline'` désigne le premier prix jamais observé pour un bien
-- déjà en cours de commercialisation au moment du déploiement. Ce n'est PAS un
-- prix de mandat : un calcul d'écart qui l'utiliserait comme référence serait
-- flatté. À exclure explicitement du registre public.
create table if not exists public.property_price_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- Nullable : une estimation en rendez-vous précède le bien SweepBright.
  property_id uuid references public.properties(id) on delete cascade,
  seller_project_id uuid references public.seller_projects(id) on delete set null,
  mandate_number text,
  context text not null check (
    context in (
      'baseline',
      'estimation',
      'mandate',
      'listing_change',
      'offer',
      'agreement',
      'deed',
      'withdrawn'
    )
  ),
  amount integer not null,
  previous_amount integer,
  currency text not null default 'EUR',
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  source text not null check (
    source in (
      'sweepbright_webhook',
      'zapier',
      'admin',
      'valuation',
      'estimation_tunnel',
      'backfill'
    )
  ),
  source_ref text,
  delivery_id uuid references public.crm_webhook_deliveries(id) on delete set null,
  -- Porte l'idempotence : la file de livraison autorise 5 tentatives et le cron
  -- rejoue toutes les 10 minutes. Une contrainte sur (property_id, context,
  -- occurred_at, amount) ne suffirait pas, deux NULL étant distincts en
  -- PostgreSQL et `property_id` étant nullable.
  dedupe_key text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  constraint property_price_events_anchor_present check (
    property_id is not null or seller_project_id is not null
  )
);

create index if not exists property_price_events_property_occurred_idx
  on public.property_price_events (property_id, occurred_at desc);
create index if not exists property_price_events_context_occurred_idx
  on public.property_price_events (context, occurred_at desc);
create index if not exists property_price_events_mandate_idx
  on public.property_price_events (mandate_number)
  where mandate_number is not null;

alter table public.property_price_events enable row level security;

-- ---------------------------------------------------------------------------
-- 3. property_status_events — le fil chronologique des statuts
-- ---------------------------------------------------------------------------
-- Requis par la définition du prix de mandat : on ne détecte pas un PREMIER
-- passage au statut public sans enregistrer les transitions. Porte aussi le
-- taux de mandats menés à la vente, premier indicateur du Journal de bord.
--
-- `status` n'est pas contraint par un CHECK : la nomenclature vient de
-- SweepBright (available, agreement, sold, prospect, withdrawn, deleted…) et
-- peut évoluer sans préavis. Un CHECK ferait échouer l'ingestion sur une
-- valeur inconnue, ce qui violerait la doctrine de non-régression.
create table if not exists public.property_status_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  property_id uuid not null references public.properties(id) on delete cascade,
  mandate_number text,
  status text not null,
  previous_status text,
  -- Reflète la politique de publication de l'application, pas SweepBright :
  -- true si le statut autorise l'affichage au catalogue public.
  is_public boolean not null default false,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  source text not null check (
    source in ('sweepbright_webhook', 'zapier', 'admin', 'backfill')
  ),
  source_ref text,
  delivery_id uuid references public.crm_webhook_deliveries(id) on delete set null,
  dedupe_key text not null unique,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists property_status_events_property_occurred_idx
  on public.property_status_events (property_id, occurred_at desc);
create index if not exists property_status_events_status_idx
  on public.property_status_events (status, occurred_at desc);

alter table public.property_status_events enable row level security;

commit;
