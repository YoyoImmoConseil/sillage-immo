create table if not exists public.crm_webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  provider text not null,
  event_name text not null,
  event_key text not null,
  estate_id text,
  company_id text,
  payload jsonb not null default '{}'::jsonb,
  signature text,
  status text not null default 'received',
  attempts int2 not null default 0,
  last_error text,
  processed_at timestamptz,
  response_status int2,
  response_payload jsonb,
  unique (provider, event_key)
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_synced_at timestamptz not null default now(),
  source text not null,
  source_ref text not null,
  company_id text,
  project_id text,
  is_project boolean not null default false,
  kind text not null default 'sale',
  negotiation text,
  title text,
  description text,
  property_type text,
  sub_type text,
  availability_status text,
  general_condition text,
  street text,
  street_number text,
  postal_code text,
  city text,
  country text,
  formatted_address text,
  latitude double precision,
  longitude double precision,
  living_area double precision,
  plot_area double precision,
  bedrooms int2,
  bathrooms int2,
  rooms int2,
  virtual_tour_url text,
  video_url text,
  appointment_service_url text,
  negotiator jsonb not null default '{}'::jsonb,
  legal jsonb not null default '{}'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  unique (source, source_ref)
);

create table if not exists public.property_listings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  property_id uuid not null references public.properties(id) on delete cascade,
  business_type text not null,
  publication_status text not null default 'active',
  is_published boolean not null default true,
  slug text not null unique,
  canonical_path text not null unique,
  title text,
  city text,
  postal_code text,
  property_type text,
  cover_image_url text,
  rooms int2,
  bedrooms int2,
  living_area double precision,
  price_amount integer,
  price_currency text not null default 'EUR',
  published_at timestamptz,
  unpublished_at timestamptz,
  listing_metadata jsonb not null default '{}'::jsonb,
  unique (property_id, business_type)
);

create table if not exists public.property_media (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  property_id uuid not null references public.properties(id) on delete cascade,
  remote_media_id text not null,
  kind text not null,
  ordinal int2 not null default 0,
  title text,
  description text,
  content_type text,
  remote_url text,
  cached_url text,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  unique (property_id, kind, remote_media_id)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'chk_crm_webhook_deliveries_status_values'
  ) then
    alter table public.crm_webhook_deliveries
      add constraint chk_crm_webhook_deliveries_status_values
      check (status in ('received', 'processing', 'processed', 'failed', 'ignored'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'chk_crm_webhook_deliveries_payload_object'
  ) then
    alter table public.crm_webhook_deliveries
      add constraint chk_crm_webhook_deliveries_payload_object
      check (jsonb_typeof(payload) = 'object');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'chk_properties_kind_values'
  ) then
    alter table public.properties
      add constraint chk_properties_kind_values
      check (kind in ('sale', 'rental', 'project', 'unit'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'chk_properties_negotiator_object'
  ) then
    alter table public.properties
      add constraint chk_properties_negotiator_object
      check (jsonb_typeof(negotiator) = 'object');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'chk_properties_legal_object'
  ) then
    alter table public.properties
      add constraint chk_properties_legal_object
      check (jsonb_typeof(legal) = 'object');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'chk_properties_raw_payload_object'
  ) then
    alter table public.properties
      add constraint chk_properties_raw_payload_object
      check (jsonb_typeof(raw_payload) = 'object');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'chk_properties_metadata_object'
  ) then
    alter table public.properties
      add constraint chk_properties_metadata_object
      check (jsonb_typeof(metadata) = 'object');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'chk_property_listings_business_type_values'
  ) then
    alter table public.property_listings
      add constraint chk_property_listings_business_type_values
      check (business_type in ('sale', 'rental'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'chk_property_listings_publication_status_values'
  ) then
    alter table public.property_listings
      add constraint chk_property_listings_publication_status_values
      check (publication_status in ('active', 'inactive', 'deleted'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'chk_property_listings_listing_metadata_object'
  ) then
    alter table public.property_listings
      add constraint chk_property_listings_listing_metadata_object
      check (jsonb_typeof(listing_metadata) = 'object');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'chk_property_media_kind_values'
  ) then
    alter table public.property_media
      add constraint chk_property_media_kind_values
      check (kind in ('image', 'plan', 'document'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'chk_property_media_metadata_object'
  ) then
    alter table public.property_media
      add constraint chk_property_media_metadata_object
      check (jsonb_typeof(metadata) = 'object');
  end if;
end
$$;

alter table public.crm_webhook_deliveries enable row level security;
alter table public.properties enable row level security;
alter table public.property_listings enable row level security;
alter table public.property_media enable row level security;

create index if not exists idx_crm_webhook_deliveries_status_created_at
on public.crm_webhook_deliveries (status, created_at asc);

create index if not exists idx_crm_webhook_deliveries_provider_estate
on public.crm_webhook_deliveries (provider, estate_id, created_at desc);

create index if not exists idx_properties_kind_city
on public.properties (kind, city, updated_at desc);

create index if not exists idx_properties_source_source_ref
on public.properties (source, source_ref);

create index if not exists idx_property_listings_business_type_published
on public.property_listings (business_type, is_published, updated_at desc);

create index if not exists idx_property_listings_property_id
on public.property_listings (property_id);

create index if not exists idx_property_media_property_kind_ordinal
on public.property_media (property_id, kind, ordinal asc);
