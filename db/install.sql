begin;

create extension if not exists pgcrypto;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null,
  email text not null,
  phone text,
  message text,
  source text,
  status text not null default 'new',
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_type text not null,
  actor_id uuid,
  action text not null,
  entity_type text,
  entity_id uuid,
  data jsonb not null default '{}'::jsonb
);

create table if not exists public.tool_versions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  tool_name text not null,
  tool_version text not null,
  lifecycle_status text not null default 'active',
  activated_at timestamptz,
  deprecated_at timestamptz,
  description text,
  changelog jsonb not null default '{}'::jsonb,
  unique (tool_name, tool_version)
);

create table if not exists public.zone_catalog (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  slug text not null unique,
  city text not null,
  score int2 not null,
  aliases jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.seller_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null,
  email text not null,
  phone text,
  property_type text,
  property_address text,
  city text,
  postal_code text,
  timeline text,
  occupancy_status text,
  estimated_price integer,
  diagnostics_ready boolean,
  diagnostics_support_needed boolean,
  syndic_docs_ready boolean,
  syndic_support_needed boolean,
  message text,
  source text,
  status text not null default 'new',
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.seller_scoring_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  seller_lead_id uuid not null references public.seller_leads(id) on delete cascade,
  score integer not null,
  segment text not null,
  next_best_action text not null,
  breakdown jsonb not null default '{}'::jsonb,
  reasons jsonb not null default '[]'::jsonb
);

create table if not exists public.seller_email_verifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text not null,
  code_hash text not null,
  verification_token text not null,
  expires_at timestamptz not null,
  verified_at timestamptz,
  consumed_at timestamptz,
  attempts int2 not null default 0
);

create table if not exists public.domain_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  occurred_at timestamptz not null default now(),
  aggregate_type text not null,
  aggregate_id uuid not null,
  event_name text not null,
  event_version int2 not null default 1,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  attempts int2 not null default 0,
  last_error text,
  published_at timestamptz
);

create table if not exists public.api_idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  scope text not null,
  key_hash text not null,
  status_code int2,
  response_payload jsonb,
  expires_at timestamptz not null
);

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
  floor int2,
  has_terrace boolean,
  has_elevator boolean,
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
  floor int2,
  has_terrace boolean,
  has_elevator boolean,
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

create table if not exists public.admin_profiles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  auth_user_id uuid,
  email text not null unique,
  first_name text,
  last_name text,
  full_name text,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.admin_role_assignments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  admin_profile_id uuid not null unique references public.admin_profiles(id) on delete cascade,
  role text not null,
  granted_by_profile_id uuid references public.admin_profiles(id) on delete set null,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.buyer_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_name text not null,
  email text not null,
  phone text,
  source text,
  status text not null default 'new',
  timeline text,
  financing_status text,
  preferred_contact_channel text,
  notes text,
  assigned_admin_profile_id uuid references public.admin_profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.buyer_search_profiles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  buyer_lead_id uuid not null unique references public.buyer_leads(id) on delete cascade,
  business_type text not null default 'sale',
  status text not null default 'active',
  location_text text,
  cities text[] not null default '{}',
  property_types text[] not null default '{}',
  budget_min integer,
  budget_max integer,
  rooms_min int2,
  rooms_max int2,
  bedrooms_min int2,
  living_area_min double precision,
  living_area_max double precision,
  floor_min int2,
  floor_max int2,
  requires_terrace boolean,
  requires_elevator boolean,
  criteria jsonb not null default '{}'::jsonb
);

create table if not exists public.buyer_property_matches (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  buyer_lead_id uuid not null references public.buyer_leads(id) on delete cascade,
  buyer_search_profile_id uuid not null references public.buyer_search_profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  property_listing_id uuid not null references public.property_listings(id) on delete cascade,
  score int2 not null,
  status text not null default 'suggested',
  blockers jsonb not null default '[]'::jsonb,
  matched_criteria jsonb not null default '{}'::jsonb,
  notes text,
  computed_at timestamptz not null default now(),
  unique (buyer_search_profile_id, property_listing_id)
);

alter table public.seller_leads
  add column if not exists assigned_admin_profile_id uuid references public.admin_profiles(id) on delete set null;

-- Lot 1: Espace client vendeur
create table if not exists public.client_profiles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  auth_user_id uuid,
  email text not null,
  phone text,
  first_name text,
  last_name text,
  full_name text,
  is_active boolean not null default true,
  last_login_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.client_projects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  client_profile_id uuid not null references public.client_profiles(id) on delete cascade,
  project_type text not null,
  status text not null default 'active',
  title text,
  created_from text not null,
  primary_admin_profile_id uuid references public.admin_profiles(id) on delete set null,
  source text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.seller_projects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  client_project_id uuid not null unique references public.client_projects(id) on delete cascade,
  seller_lead_id uuid references public.seller_leads(id) on delete set null,
  assigned_admin_profile_id uuid references public.admin_profiles(id) on delete set null,
  entry_channel text not null,
  project_status text not null default 'estimation_realisee',
  mandate_status text not null default 'none',
  latest_valuation_id uuid,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.project_properties (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  client_project_id uuid not null references public.client_projects(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  relationship_type text not null default 'seller_subject_property',
  is_primary boolean not null default false,
  linked_by_admin_profile_id uuid references public.admin_profiles(id) on delete set null,
  unlinked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.client_project_invitations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  client_project_id uuid not null references public.client_projects(id) on delete cascade,
  client_profile_id uuid not null references public.client_profiles(id) on delete cascade,
  email text not null,
  token_hash text not null,
  provider_hint text,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_by_admin_profile_id uuid references public.admin_profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.seller_project_advisor_history (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  seller_project_id uuid not null references public.seller_projects(id) on delete cascade,
  admin_profile_id uuid not null references public.admin_profiles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unassigned_at timestamptz,
  assigned_by_admin_profile_id uuid references public.admin_profiles(id) on delete set null,
  reason text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.client_project_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  client_project_id uuid not null references public.client_projects(id) on delete cascade,
  seller_project_id uuid references public.seller_projects(id) on delete set null,
  event_name text not null,
  event_category text not null,
  visible_to_client boolean not null default true,
  actor_type text,
  actor_id uuid,
  payload jsonb not null default '{}'::jsonb
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_tool_versions_tool_name_not_blank'
  ) then
    alter table public.tool_versions
      add constraint chk_tool_versions_tool_name_not_blank
      check (length(btrim(tool_name)) > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_tool_versions_tool_name_format'
  ) then
    alter table public.tool_versions
      add constraint chk_tool_versions_tool_name_format
      check (tool_name ~ '^[a-z][a-z0-9._-]*$');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_tool_versions_tool_version_not_blank'
  ) then
    alter table public.tool_versions
      add constraint chk_tool_versions_tool_version_not_blank
      check (length(btrim(tool_version)) > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_tool_versions_tool_version_semver'
  ) then
    alter table public.tool_versions
      add constraint chk_tool_versions_tool_version_semver
      check (
        tool_version ~ '^[0-9]+[.][0-9]+[.][0-9]+(-[0-9A-Za-z.-]+)?([+][0-9A-Za-z.-]+)?$'
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_tool_versions_lifecycle_status_values'
  ) then
    alter table public.tool_versions
      add constraint chk_tool_versions_lifecycle_status_values
      check (lifecycle_status in ('draft', 'active', 'deprecated'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_tool_versions_changelog_object'
  ) then
    alter table public.tool_versions
      add constraint chk_tool_versions_changelog_object
      check (jsonb_typeof(changelog) = 'object');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_zone_catalog_slug_not_blank'
  ) then
    alter table public.zone_catalog
      add constraint chk_zone_catalog_slug_not_blank
      check (length(btrim(slug)) > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_zone_catalog_score_range'
  ) then
    alter table public.zone_catalog
      add constraint chk_zone_catalog_score_range
      check (score >= 0 and score <= 15);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_zone_catalog_aliases_array'
  ) then
    alter table public.zone_catalog
      add constraint chk_zone_catalog_aliases_array
      check (jsonb_typeof(aliases) = 'array');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_domain_events_status_values'
  ) then
    alter table public.domain_events
      add constraint chk_domain_events_status_values
      check (status in ('pending', 'processed', 'failed'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'uq_api_idempotency_scope_key_hash'
  ) then
    alter table public.api_idempotency_keys
      add constraint uq_api_idempotency_scope_key_hash
      unique (scope, key_hash);
  end if;

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

alter table public.leads enable row level security;
alter table public.audit_log enable row level security;
alter table public.tool_versions enable row level security;
alter table public.zone_catalog enable row level security;
alter table public.seller_leads enable row level security;
alter table public.seller_scoring_events enable row level security;
alter table public.seller_email_verifications enable row level security;
alter table public.domain_events enable row level security;
alter table public.api_idempotency_keys enable row level security;
alter table public.crm_webhook_deliveries enable row level security;
alter table public.properties enable row level security;
alter table public.property_listings enable row level security;
alter table public.property_media enable row level security;
alter table public.admin_profiles enable row level security;
alter table public.admin_role_assignments enable row level security;
alter table public.buyer_leads enable row level security;
alter table public.buyer_search_profiles enable row level security;
alter table public.buyer_property_matches enable row level security;
alter table public.client_profiles enable row level security;
alter table public.client_projects enable row level security;
alter table public.seller_projects enable row level security;
alter table public.project_properties enable row level security;
alter table public.client_project_invitations enable row level security;
alter table public.seller_project_advisor_history enable row level security;
alter table public.client_project_events enable row level security;

create index if not exists idx_audit_log_mcp_request_id
on public.audit_log ((data->>'request_id'));

create index if not exists idx_audit_log_execution_request_id
on public.audit_log ((data->'execution'->>'request_id'));

create index if not exists idx_audit_log_action_created_at
on public.audit_log (action, created_at desc);

create index if not exists idx_tool_versions_lifecycle_status
on public.tool_versions (lifecycle_status);

create index if not exists idx_zone_catalog_active_city
on public.zone_catalog (is_active, city);

create index if not exists idx_seller_leads_status_created_at
on public.seller_leads (status, created_at desc);

create index if not exists idx_seller_scoring_events_lead_created_at
on public.seller_scoring_events (seller_lead_id, created_at desc);

create index if not exists idx_seller_email_verifications_email_created_at
on public.seller_email_verifications (email, created_at desc);

create index if not exists idx_domain_events_status_created_at
on public.domain_events (status, created_at asc);

create index if not exists idx_domain_events_aggregate_created_at
on public.domain_events (aggregate_type, aggregate_id, created_at desc);

create index if not exists idx_api_idempotency_expires_at
on public.api_idempotency_keys (expires_at asc);

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

create index if not exists idx_property_listings_rooms_surface
on public.property_listings (rooms, living_area);

create index if not exists idx_property_listings_floor
on public.property_listings (floor);

create index if not exists idx_property_listings_terrace
on public.property_listings (has_terrace);

create index if not exists idx_property_listings_elevator
on public.property_listings (has_elevator);

create index if not exists idx_admin_profiles_email
on public.admin_profiles (email);

create unique index if not exists idx_admin_profiles_auth_user_id_unique
on public.admin_profiles (auth_user_id)
where auth_user_id is not null;

create index if not exists idx_admin_role_assignments_role
on public.admin_role_assignments (role, is_active);

create index if not exists idx_seller_leads_assigned_admin
on public.seller_leads (assigned_admin_profile_id, created_at desc);

create index if not exists idx_buyer_leads_status_created_at
on public.buyer_leads (status, created_at desc);

create index if not exists idx_buyer_leads_assigned_admin
on public.buyer_leads (assigned_admin_profile_id, created_at desc);

create index if not exists idx_buyer_search_profiles_business_type
on public.buyer_search_profiles (business_type, status);

create index if not exists idx_buyer_search_profiles_cities
on public.buyer_search_profiles using gin (cities);

create index if not exists idx_buyer_search_profiles_property_types
on public.buyer_search_profiles using gin (property_types);

create index if not exists idx_buyer_property_matches_buyer
on public.buyer_property_matches (buyer_lead_id, score desc);

create index if not exists idx_buyer_property_matches_property
on public.buyer_property_matches (property_id, score desc);

create index if not exists idx_client_profiles_email on public.client_profiles (email);
create unique index if not exists idx_client_profiles_auth_user_id_unique
  on public.client_profiles (auth_user_id) where auth_user_id is not null;
create index if not exists idx_client_projects_client_profile on public.client_projects (client_profile_id);
create index if not exists idx_client_projects_type_status on public.client_projects (project_type, status);
create index if not exists idx_seller_projects_assigned_admin on public.seller_projects (assigned_admin_profile_id);
create index if not exists idx_seller_projects_seller_lead on public.seller_projects (seller_lead_id);
create index if not exists idx_seller_projects_project_status on public.seller_projects (project_status);
create unique index if not exists idx_seller_projects_seller_lead_unique
  on public.seller_projects (seller_lead_id)
  where seller_lead_id is not null;
create index if not exists idx_project_properties_client_project on public.project_properties (client_project_id);
create index if not exists idx_project_properties_property on public.project_properties (property_id);
create index if not exists idx_project_properties_unlinked on public.project_properties (unlinked_at) where unlinked_at is null;
create unique index if not exists idx_project_properties_active_unique
  on public.project_properties (client_project_id, property_id)
  where unlinked_at is null;
create unique index if not exists idx_project_properties_primary_unique
  on public.project_properties (client_project_id)
  where is_primary = true and unlinked_at is null;
create index if not exists idx_client_project_invitations_project on public.client_project_invitations (client_project_id);
create index if not exists idx_client_project_invitations_email on public.client_project_invitations (email);
create index if not exists idx_seller_project_advisor_history_project on public.seller_project_advisor_history (seller_project_id);
create index if not exists idx_client_project_events_project on public.client_project_events (client_project_id);
create index if not exists idx_client_project_events_created on public.client_project_events (created_at desc);
create unique index if not exists idx_client_profiles_email_active_unique
  on public.client_profiles (lower(email))
  where is_active = true;

drop policy if exists "client_profiles_authenticated" on public.client_profiles;
create policy "client_profiles_authenticated" on public.client_profiles for all to authenticated using (true) with check (true);
drop policy if exists "client_projects_authenticated" on public.client_projects;
create policy "client_projects_authenticated" on public.client_projects for all to authenticated using (true) with check (true);
drop policy if exists "seller_projects_authenticated" on public.seller_projects;
create policy "seller_projects_authenticated" on public.seller_projects for all to authenticated using (true) with check (true);
drop policy if exists "project_properties_authenticated" on public.project_properties;
create policy "project_properties_authenticated" on public.project_properties for all to authenticated using (true) with check (true);
drop policy if exists "client_project_invitations_authenticated" on public.client_project_invitations;
create policy "client_project_invitations_authenticated" on public.client_project_invitations for all to authenticated using (true) with check (true);
drop policy if exists "seller_project_advisor_history_authenticated" on public.seller_project_advisor_history;
create policy "seller_project_advisor_history_authenticated" on public.seller_project_advisor_history for all to authenticated using (true) with check (true);
drop policy if exists "client_project_events_authenticated" on public.client_project_events;
create policy "client_project_events_authenticated" on public.client_project_events for all to authenticated using (true) with check (true);

drop policy if exists "leads_insert_public" on public.leads;
create policy "leads_insert_public"
  on public.leads
  for insert
  to public
  with check (true);

drop policy if exists "audit_insert_authenticated" on public.audit_log;
create policy "audit_insert_authenticated"
  on public.audit_log
  for insert
  to authenticated
  with check (auth.uid() is not null);

drop policy if exists "seller_leads_insert_public" on public.seller_leads;
create policy "seller_leads_insert_public"
  on public.seller_leads
  for insert
  to public
  with check (true);

drop policy if exists "seller_scoring_events_insert_authenticated" on public.seller_scoring_events;
create policy "seller_scoring_events_insert_authenticated"
  on public.seller_scoring_events
  for insert
  to authenticated
  with check (auth.uid() is not null);

commit;
