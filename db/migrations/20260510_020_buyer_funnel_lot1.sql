-- Lot 1: Tunnel acquereur - evolutions schema et RLS
--
-- Objectif : supporter le parcours self-serve acquereur
--  - Un meme buyer_lead peut etre rattache a plusieurs buyer_projects (multi-recherches)
--  - Un buyer_project a au plus un buyer_search_profile actif (unicite via client_project_id)
--  - Tracabilite SweepBright (id contact, horodatage sync, erreur)
--  - Verification email (email_verified_at sur buyer_leads)
--  - Alertes lues/non-lues sur buyer_property_matches
--  - Policies RLS "self select" pour que le portail client puisse lire avec le JWT utilisateur

begin;

-- 1. Desserrer UNIQUE(buyer_lead_id) sur buyer_search_profiles
alter table public.buyer_search_profiles
  drop constraint if exists buyer_search_profiles_buyer_lead_id_key;

create index if not exists idx_buyer_search_profiles_buyer_lead
  on public.buyer_search_profiles (buyer_lead_id);

-- Garantir au maximum 1 profil de recherche par projet client (lorsque client_project_id non null)
create unique index if not exists idx_buyer_search_profiles_client_project_unique
  on public.buyer_search_profiles (client_project_id)
  where client_project_id is not null;

-- 2. Desserrer UNIQUE(buyer_lead_id) sur buyer_projects (multi-projets pour un meme lead)
alter table public.buyer_projects
  drop constraint if exists buyer_projects_buyer_lead_id_key;

-- L'index non-unique existant est suffisant. Verifier sa presence :
create index if not exists idx_buyer_projects_buyer_lead
  on public.buyer_projects (buyer_lead_id);

-- 3. Tracabilite SweepBright + verification email sur buyer_leads
alter table public.buyer_leads
  add column if not exists sweepbright_contact_id text,
  add column if not exists sweepbright_synced_at timestamptz,
  add column if not exists sweepbright_last_error text,
  add column if not exists email_verified_at timestamptz;

create index if not exists idx_buyer_leads_sweepbright_contact
  on public.buyer_leads (sweepbright_contact_id)
  where sweepbright_contact_id is not null;

-- 4. Alertes et etat lu/non lu sur buyer_property_matches
alter table public.buyer_property_matches
  add column if not exists notified_at timestamptz,
  add column if not exists read_at timestamptz,
  add column if not exists first_seen_at timestamptz not null default now();

-- Index partiel pour le compteur "non-lus" par recherche
create index if not exists idx_buyer_property_matches_unread
  on public.buyer_property_matches (buyer_search_profile_id, created_at desc)
  where read_at is null;

-- Index pour la file des alertes a envoyer
create index if not exists idx_buyer_property_matches_pending_notify
  on public.buyer_property_matches (created_at)
  where notified_at is null;

-- 5. RLS select policies (self-service) pour que le portail client accede via JWT utilisateur
drop policy if exists "buyer_projects_self_select" on public.buyer_projects;
create policy "buyer_projects_self_select"
  on public.buyer_projects
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.client_projects cproj
      join public.client_profiles cp on cp.id = cproj.client_profile_id
      where cproj.id = buyer_projects.client_project_id
        and cp.auth_user_id = auth.uid()
    )
  );

drop policy if exists "buyer_search_profiles_self_select" on public.buyer_search_profiles;
create policy "buyer_search_profiles_self_select"
  on public.buyer_search_profiles
  for select
  to authenticated
  using (
    client_project_id is not null
    and exists (
      select 1
      from public.client_projects cproj
      join public.client_profiles cp on cp.id = cproj.client_profile_id
      where cproj.id = buyer_search_profiles.client_project_id
        and cp.auth_user_id = auth.uid()
    )
  );

drop policy if exists "buyer_property_matches_self_select" on public.buyer_property_matches;
create policy "buyer_property_matches_self_select"
  on public.buyer_property_matches
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.buyer_search_profiles bsp
      join public.client_projects cproj on cproj.id = bsp.client_project_id
      join public.client_profiles cp on cp.id = cproj.client_profile_id
      where bsp.id = buyer_property_matches.buyer_search_profile_id
        and cp.auth_user_id = auth.uid()
    )
  );

drop policy if exists "buyer_leads_self_select" on public.buyer_leads;
create policy "buyer_leads_self_select"
  on public.buyer_leads
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.buyer_projects bp
      join public.client_projects cproj on cproj.id = bp.client_project_id
      join public.client_profiles cp on cp.id = cproj.client_profile_id
      where bp.buyer_lead_id = buyer_leads.id
        and cp.auth_user_id = auth.uid()
    )
  );

commit;
