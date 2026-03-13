alter table public.admin_profiles
  alter column auth_user_id drop not null;

alter table public.admin_profiles
  add column if not exists first_name text,
  add column if not exists last_name text;

create unique index if not exists idx_admin_profiles_auth_user_id_unique
on public.admin_profiles (auth_user_id)
where auth_user_id is not null;
