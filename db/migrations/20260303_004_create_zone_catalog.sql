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

do $$
begin
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
end
$$;

alter table public.zone_catalog enable row level security;

create index if not exists idx_zone_catalog_active_city
on public.zone_catalog (is_active, city);
