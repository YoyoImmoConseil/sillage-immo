-- Lot 1: Espace client vendeur - Tables socle
-- client_profiles, client_projects, seller_projects, project_properties,
-- client_project_invitations, seller_project_advisor_history, client_project_events

begin;

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

-- Indexes
create index if not exists idx_client_profiles_email on public.client_profiles (email);
create unique index if not exists idx_client_profiles_auth_user_id_unique
  on public.client_profiles (auth_user_id) where auth_user_id is not null;

create index if not exists idx_client_projects_client_profile on public.client_projects (client_profile_id);
create index if not exists idx_client_projects_type_status on public.client_projects (project_type, status);

create index if not exists idx_seller_projects_assigned_admin on public.seller_projects (assigned_admin_profile_id);
create index if not exists idx_seller_projects_seller_lead on public.seller_projects (seller_lead_id);
create index if not exists idx_seller_projects_project_status on public.seller_projects (project_status);

create index if not exists idx_project_properties_client_project on public.project_properties (client_project_id);
create index if not exists idx_project_properties_property on public.project_properties (property_id);
create index if not exists idx_project_properties_unlinked on public.project_properties (unlinked_at) where unlinked_at is null;

create index if not exists idx_client_project_invitations_project on public.client_project_invitations (client_project_id);
create index if not exists idx_client_project_invitations_email on public.client_project_invitations (email);

create index if not exists idx_seller_project_advisor_history_project on public.seller_project_advisor_history (seller_project_id);

create index if not exists idx_client_project_events_project on public.client_project_events (client_project_id);
create index if not exists idx_client_project_events_created on public.client_project_events (created_at desc);

-- RLS
alter table public.client_profiles enable row level security;
alter table public.client_projects enable row level security;
alter table public.seller_projects enable row level security;
alter table public.project_properties enable row level security;
alter table public.client_project_invitations enable row level security;
alter table public.seller_project_advisor_history enable row level security;
alter table public.client_project_events enable row level security;

-- Policies: admin uses service role (bypasses RLS). These policies allow authenticated access for future client auth.
create policy "client_profiles_authenticated" on public.client_profiles for all to authenticated using (true) with check (true);
create policy "client_projects_authenticated" on public.client_projects for all to authenticated using (true) with check (true);
create policy "seller_projects_authenticated" on public.seller_projects for all to authenticated using (true) with check (true);
create policy "project_properties_authenticated" on public.project_properties for all to authenticated using (true) with check (true);
create policy "client_project_invitations_authenticated" on public.client_project_invitations for all to authenticated using (true) with check (true);
create policy "seller_project_advisor_history_authenticated" on public.seller_project_advisor_history for all to authenticated using (true) with check (true);
create policy "client_project_events_authenticated" on public.client_project_events for all to authenticated using (true) with check (true);

commit;
