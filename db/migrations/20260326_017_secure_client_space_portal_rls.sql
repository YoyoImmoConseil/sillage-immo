begin;

drop policy if exists "client_profiles_authenticated" on public.client_profiles;
drop policy if exists "client_projects_authenticated" on public.client_projects;
drop policy if exists "seller_projects_authenticated" on public.seller_projects;
drop policy if exists "project_properties_authenticated" on public.project_properties;
drop policy if exists "client_project_invitations_authenticated" on public.client_project_invitations;
drop policy if exists "seller_project_advisor_history_authenticated" on public.seller_project_advisor_history;
drop policy if exists "client_project_events_authenticated" on public.client_project_events;

drop policy if exists "client_profiles_self_select" on public.client_profiles;
create policy "client_profiles_self_select"
  on public.client_profiles
  for select
  to authenticated
  using (auth_user_id = auth.uid());

drop policy if exists "client_projects_self_select" on public.client_projects;
create policy "client_projects_self_select"
  on public.client_projects
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.client_profiles cp
      where cp.id = client_projects.client_profile_id
        and cp.auth_user_id = auth.uid()
    )
  );

drop policy if exists "seller_projects_self_select" on public.seller_projects;
create policy "seller_projects_self_select"
  on public.seller_projects
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.client_projects cproj
      join public.client_profiles cp on cp.id = cproj.client_profile_id
      where cproj.id = seller_projects.client_project_id
        and cp.auth_user_id = auth.uid()
    )
  );

drop policy if exists "project_properties_self_select" on public.project_properties;
create policy "project_properties_self_select"
  on public.project_properties
  for select
  to authenticated
  using (
    unlinked_at is null
    and exists (
      select 1
      from public.client_projects cproj
      join public.client_profiles cp on cp.id = cproj.client_profile_id
      where cproj.id = project_properties.client_project_id
        and cp.auth_user_id = auth.uid()
    )
  );

drop policy if exists "seller_project_advisor_history_self_select" on public.seller_project_advisor_history;
create policy "seller_project_advisor_history_self_select"
  on public.seller_project_advisor_history
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.seller_projects sp
      join public.client_projects cproj on cproj.id = sp.client_project_id
      join public.client_profiles cp on cp.id = cproj.client_profile_id
      where sp.id = seller_project_advisor_history.seller_project_id
        and cp.auth_user_id = auth.uid()
    )
  );

drop policy if exists "client_project_events_self_select" on public.client_project_events;
create policy "client_project_events_self_select"
  on public.client_project_events
  for select
  to authenticated
  using (
    visible_to_client = true
    and exists (
      select 1
      from public.client_projects cproj
      join public.client_profiles cp on cp.id = cproj.client_profile_id
      where cproj.id = client_project_events.client_project_id
        and cp.auth_user_id = auth.uid()
    )
  );

commit;
