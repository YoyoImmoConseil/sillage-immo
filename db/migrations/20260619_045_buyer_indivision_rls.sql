-- 20260619_045_buyer_indivision_rls.sql
--
-- Goal:
--   Align the BUYER-side portal RLS with the seller indivision model
--   introduced in 20260602_022. Until now the buyer SELECT policies on
--   buyer_projects / buyer_search_profiles / buyer_property_matches /
--   buyer_leads authorize reads only when the requester is the legacy
--   primary `client_projects.client_profile_id`. With multi-person projects
--   a co-acquéreur attached via `client_project_clients` (role primary |
--   co_owner, removed_at IS NULL) must also be able to read the shared
--   buyer project and everything that hangs off it.
--
--   This change is ADDITIVE: it only adds an OR-branch broadening access to
--   active members. The historical primary keeps the exact same access, so
--   no existing read can regress. The portal services use the service-role
--   key (RLS bypassed); these policies are the defense-in-depth layer for
--   any direct authenticated client read.
--
-- Idempotent: re-running the script after a partial apply MUST be safe.

begin;

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
    or exists (
      select 1
      from public.client_project_clients cpc
      join public.client_profiles cp on cp.id = cpc.client_profile_id
      where cpc.client_project_id = buyer_projects.client_project_id
        and cpc.removed_at is null
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
    and (
      exists (
        select 1
        from public.client_projects cproj
        join public.client_profiles cp on cp.id = cproj.client_profile_id
        where cproj.id = buyer_search_profiles.client_project_id
          and cp.auth_user_id = auth.uid()
      )
      or exists (
        select 1
        from public.client_project_clients cpc
        join public.client_profiles cp on cp.id = cpc.client_profile_id
        where cpc.client_project_id = buyer_search_profiles.client_project_id
          and cpc.removed_at is null
          and cp.auth_user_id = auth.uid()
      )
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
    or exists (
      select 1
      from public.buyer_search_profiles bsp
      join public.client_project_clients cpc on cpc.client_project_id = bsp.client_project_id
      join public.client_profiles cp on cp.id = cpc.client_profile_id
      where bsp.id = buyer_property_matches.buyer_search_profile_id
        and cpc.removed_at is null
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
    or exists (
      select 1
      from public.buyer_projects bp
      join public.client_project_clients cpc on cpc.client_project_id = bp.client_project_id
      join public.client_profiles cp on cp.id = cpc.client_profile_id
      where bp.buyer_lead_id = buyer_leads.id
        and cpc.removed_at is null
        and cp.auth_user_id = auth.uid()
    )
  );

commit;
