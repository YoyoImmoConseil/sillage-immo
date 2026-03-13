create table if not exists public.admin_profiles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  auth_user_id uuid not null unique,
  email text not null unique,
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

alter table public.admin_profiles enable row level security;
alter table public.admin_role_assignments enable row level security;
alter table public.buyer_leads enable row level security;
alter table public.buyer_search_profiles enable row level security;
alter table public.buyer_property_matches enable row level security;

create index if not exists idx_admin_profiles_email
on public.admin_profiles (email);

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
