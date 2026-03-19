begin;

create unique index if not exists idx_seller_projects_seller_lead_unique
  on public.seller_projects (seller_lead_id)
  where seller_lead_id is not null;

create unique index if not exists idx_client_profiles_email_active_unique
  on public.client_profiles (lower(email))
  where is_active = true;

create unique index if not exists idx_project_properties_active_unique
  on public.project_properties (client_project_id, property_id)
  where unlinked_at is null;

create unique index if not exists idx_project_properties_primary_unique
  on public.project_properties (client_project_id)
  where is_primary = true and unlinked_at is null;

commit;
