create table if not exists public.contact_identities (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email text,
  normalized_email text,
  phone text,
  normalized_phone text,
  first_name text,
  last_name text,
  full_name text,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.seller_leads
  add column if not exists contact_identity_id uuid references public.contact_identities(id) on delete set null;

alter table public.buyer_leads
  add column if not exists contact_identity_id uuid references public.contact_identities(id) on delete set null;

alter table public.client_profiles
  add column if not exists contact_identity_id uuid references public.contact_identities(id) on delete set null;

alter table public.buyer_search_profiles
  add column if not exists client_project_id uuid references public.client_projects(id) on delete set null;

create table if not exists public.buyer_projects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  client_project_id uuid not null unique references public.client_projects(id) on delete cascade,
  buyer_lead_id uuid unique references public.buyer_leads(id) on delete set null,
  active_search_profile_id uuid references public.buyer_search_profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.valuations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  client_project_id uuid references public.client_projects(id) on delete set null,
  seller_project_id uuid references public.seller_projects(id) on delete set null,
  seller_lead_id uuid references public.seller_leads(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  contact_identity_id uuid references public.contact_identities(id) on delete set null,
  source text not null,
  source_ref text,
  provider text,
  valuation_kind text not null default 'seller_estimation',
  status text not null default 'completed',
  estimated_price integer,
  valuation_low integer,
  valuation_high integer,
  currency text not null default 'EUR',
  valuated_at timestamptz not null default now(),
  raw_payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'seller_projects_latest_valuation_id_fkey'
  ) then
    alter table public.seller_projects
      add constraint seller_projects_latest_valuation_id_fkey
      foreign key (latest_valuation_id) references public.valuations(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'chk_contact_identities_metadata_object'
  ) then
    alter table public.contact_identities
      add constraint chk_contact_identities_metadata_object
      check (jsonb_typeof(metadata) = 'object');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'chk_client_projects_project_type_values'
  ) then
    alter table public.client_projects
      add constraint chk_client_projects_project_type_values
      check (project_type in ('seller', 'buyer', 'rental', 'wealth'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'chk_client_projects_status_values'
  ) then
    alter table public.client_projects
      add constraint chk_client_projects_status_values
      check (status in ('active', 'on_hold', 'closed', 'archived'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'chk_client_projects_created_from_values'
  ) then
    alter table public.client_projects
      add constraint chk_client_projects_created_from_values
      check (created_from in ('seller_lead', 'buyer_lead', 'crm_property', 'admin_manual'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'chk_seller_leads_status_values'
  ) then
    alter table public.seller_leads
      add constraint chk_seller_leads_status_values
      check (status in ('new', 'to_call', 'qualified', 'closed'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'chk_buyer_leads_status_values'
  ) then
    alter table public.buyer_leads
      add constraint chk_buyer_leads_status_values
      check (status in ('new', 'qualified', 'active_search', 'visit', 'won', 'lost'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'chk_buyer_search_profiles_status_values'
  ) then
    alter table public.buyer_search_profiles
      add constraint chk_buyer_search_profiles_status_values
      check (status in ('active', 'paused', 'closed'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'chk_seller_projects_entry_channel_values'
  ) then
    alter table public.seller_projects
      add constraint chk_seller_projects_entry_channel_values
      check (entry_channel in ('sillage_tunnel', 'crm_direct', 'admin_created'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'chk_seller_projects_project_status_values'
  ) then
    alter table public.seller_projects
      add constraint chk_seller_projects_project_status_values
      check (
        project_status in (
          'estimation_realisee',
          'a_contacter',
          'rdv_estimation_planifie',
          'estimation_physique_realisee',
          'mandat_en_preparation',
          'mandat_signe',
          'bien_en_commercialisation',
          'bien_sous_offre',
          'bien_vendu',
          'projet_suspendu'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'chk_seller_projects_mandate_status_values'
  ) then
    alter table public.seller_projects
      add constraint chk_seller_projects_mandate_status_values
      check (mandate_status in ('none', 'draft', 'signed', 'terminated'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'chk_project_properties_relationship_values'
  ) then
    alter table public.project_properties
      add constraint chk_project_properties_relationship_values
      check (
        relationship_type in (
          'seller_subject_property',
          'rental_managed_property',
          'buyer_target_property',
          'archived_relation'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'chk_buyer_projects_metadata_object'
  ) then
    alter table public.buyer_projects
      add constraint chk_buyer_projects_metadata_object
      check (jsonb_typeof(metadata) = 'object');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'chk_valuations_kind_values'
  ) then
    alter table public.valuations
      add constraint chk_valuations_kind_values
      check (valuation_kind in ('seller_estimation', 'seller_sync', 'admin_review', 'manual'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'chk_valuations_status_values'
  ) then
    alter table public.valuations
      add constraint chk_valuations_status_values
      check (status in ('draft', 'completed', 'superseded', 'cancelled'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'chk_valuations_raw_payload_object'
  ) then
    alter table public.valuations
      add constraint chk_valuations_raw_payload_object
      check (jsonb_typeof(raw_payload) = 'object');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'chk_valuations_metadata_object'
  ) then
    alter table public.valuations
      add constraint chk_valuations_metadata_object
      check (jsonb_typeof(metadata) = 'object');
  end if;
end
$$;

create unique index if not exists idx_contact_identities_normalized_email_unique
  on public.contact_identities (normalized_email)
  where normalized_email is not null;

create unique index if not exists idx_contact_identities_normalized_phone_unique
  on public.contact_identities (normalized_phone)
  where normalized_phone is not null;

create index if not exists idx_seller_leads_contact_identity
  on public.seller_leads (contact_identity_id);

create index if not exists idx_buyer_leads_contact_identity
  on public.buyer_leads (contact_identity_id);

create index if not exists idx_client_profiles_contact_identity
  on public.client_profiles (contact_identity_id);

create index if not exists idx_buyer_search_profiles_client_project
  on public.buyer_search_profiles (client_project_id);

create index if not exists idx_buyer_projects_buyer_lead
  on public.buyer_projects (buyer_lead_id);

create index if not exists idx_buyer_projects_active_search_profile
  on public.buyer_projects (active_search_profile_id);

create index if not exists idx_valuations_client_project
  on public.valuations (client_project_id, valuated_at desc);

create index if not exists idx_valuations_seller_project
  on public.valuations (seller_project_id, valuated_at desc);

create index if not exists idx_valuations_seller_lead
  on public.valuations (seller_lead_id, valuated_at desc);

create index if not exists idx_valuations_property
  on public.valuations (property_id, valuated_at desc);

create index if not exists idx_valuations_contact_identity
  on public.valuations (contact_identity_id, valuated_at desc);

insert into public.contact_identities (
  email,
  normalized_email,
  phone,
  normalized_phone,
  first_name,
  last_name,
  full_name,
  metadata
)
select distinct on (normalized_email)
  email,
  normalized_email,
  phone,
  normalized_phone,
  first_name,
  last_name,
  full_name,
  jsonb_build_object('backfilled', true, 'source', source_name)
from (
  select
    lower(cp.email) as email,
    lower(cp.email) as normalized_email,
    cp.phone,
    nullif(regexp_replace(coalesce(cp.phone, ''), '[^0-9+]', '', 'g'), '') as normalized_phone,
    cp.first_name,
    cp.last_name,
    cp.full_name,
    cp.created_at,
    1 as sort_rank,
    'client_profiles' as source_name
  from public.client_profiles cp
  where cp.email is not null and length(btrim(cp.email)) > 0
  union all
  select
    lower(bl.email) as email,
    lower(bl.email) as normalized_email,
    bl.phone,
    nullif(regexp_replace(coalesce(bl.phone, ''), '[^0-9+]', '', 'g'), '') as normalized_phone,
    split_part(bl.full_name, ' ', 1) as first_name,
    nullif(substr(bl.full_name, length(split_part(bl.full_name, ' ', 1)) + 2), '') as last_name,
    bl.full_name,
    bl.created_at,
    2 as sort_rank,
    'buyer_leads' as source_name
  from public.buyer_leads bl
  where bl.email is not null and length(btrim(bl.email)) > 0
  union all
  select
    lower(sl.email) as email,
    lower(sl.email) as normalized_email,
    sl.phone,
    nullif(regexp_replace(coalesce(sl.phone, ''), '[^0-9+]', '', 'g'), '') as normalized_phone,
    split_part(sl.full_name, ' ', 1) as first_name,
    nullif(substr(sl.full_name, length(split_part(sl.full_name, ' ', 1)) + 2), '') as last_name,
    sl.full_name,
    sl.created_at,
    3 as sort_rank,
    'seller_leads' as source_name
  from public.seller_leads sl
  where sl.email is not null and length(btrim(sl.email)) > 0
) contacts
where normalized_email is not null
on conflict do nothing;

update public.client_profiles cp
set contact_identity_id = ci.id
from public.contact_identities ci
where cp.contact_identity_id is null
  and lower(cp.email) = ci.normalized_email;

update public.seller_leads sl
set contact_identity_id = ci.id
from public.contact_identities ci
where sl.contact_identity_id is null
  and lower(sl.email) = ci.normalized_email;

update public.buyer_leads bl
set contact_identity_id = ci.id
from public.contact_identities ci
where bl.contact_identity_id is null
  and lower(bl.email) = ci.normalized_email;

insert into public.client_profiles (
  email,
  phone,
  first_name,
  last_name,
  full_name,
  contact_identity_id,
  metadata
)
select
  lower(bl.email),
  bl.phone,
  split_part(bl.full_name, ' ', 1),
  nullif(substr(bl.full_name, length(split_part(bl.full_name, ' ', 1)) + 2), ''),
  bl.full_name,
  bl.contact_identity_id,
  jsonb_build_object('backfilled_from', 'buyer_lead', 'buyer_lead_id', bl.id)
from public.buyer_leads bl
left join public.client_profiles cp on lower(cp.email) = lower(bl.email) and cp.is_active = true
where cp.id is null;

insert into public.client_projects (
  client_profile_id,
  project_type,
  status,
  title,
  created_from,
  primary_admin_profile_id,
  source,
  metadata
)
select
  cp.id,
  'buyer',
  'active',
  'Achat - ' || coalesce(bl.full_name, bl.email),
  'buyer_lead',
  bl.assigned_admin_profile_id,
  bl.source,
  jsonb_build_object('backfilled_from', 'buyer_lead', 'buyer_lead_id', bl.id)
from public.buyer_leads bl
join public.client_profiles cp on lower(cp.email) = lower(bl.email) and cp.is_active = true
left join public.buyer_projects bp on bp.buyer_lead_id = bl.id
where bp.id is null;

insert into public.buyer_projects (
  client_project_id,
  buyer_lead_id,
  active_search_profile_id,
  metadata
)
select
  cpj.id,
  bl.id,
  bsp.id,
  jsonb_build_object('backfilled', true)
from public.buyer_leads bl
join public.client_profiles cp on lower(cp.email) = lower(bl.email) and cp.is_active = true
join public.client_projects cpj
  on cpj.client_profile_id = cp.id
 and cpj.project_type = 'buyer'
 and cpj.created_from = 'buyer_lead'
 and (cpj.metadata->>'buyer_lead_id') = bl.id::text
left join lateral (
  select id
  from public.buyer_search_profiles
  where buyer_lead_id = bl.id
  order by created_at desc
  limit 1
) bsp on true
left join public.buyer_projects existing_bp on existing_bp.client_project_id = cpj.id
where existing_bp.id is null;

update public.buyer_search_profiles bsp
set client_project_id = bp.client_project_id
from public.buyer_projects bp
where bsp.client_project_id is null
  and bp.buyer_lead_id = bsp.buyer_lead_id;

insert into public.properties (
  source,
  source_ref,
  kind,
  negotiation,
  title,
  property_type,
  street,
  postal_code,
  city,
  country,
  formatted_address,
  living_area,
  bedrooms,
  rooms,
  floor,
  has_terrace,
  has_elevator,
  raw_payload,
  metadata
)
select
  'seller_estimation',
  sl.id::text,
  'sale',
  'sale',
  coalesce(nullif(concat_ws(', ', sl.property_address, concat_ws(' ', sl.postal_code, sl.city)), ''), 'Bien estimation ' || sl.id::text),
  sl.property_type,
  sl.property_address,
  sl.postal_code,
  sl.city,
  'France',
  nullif(concat_ws(', ', sl.property_address, concat_ws(' ', sl.postal_code, sl.city)), ''),
  case
    when (sl.metadata->'property_details'->>'living_area') ~ '^-?[0-9]+([.][0-9]+)?$'
      then (sl.metadata->'property_details'->>'living_area')::double precision
    else null
  end,
  case
    when (sl.metadata->'property_details'->>'bedrooms') ~ '^-?[0-9]+([.][0-9]+)?$'
      then round((sl.metadata->'property_details'->>'bedrooms')::numeric)::int2
    else null
  end,
  case
    when (sl.metadata->'property_details'->>'rooms') ~ '^-?[0-9]+([.][0-9]+)?$'
      then round((sl.metadata->'property_details'->>'rooms')::numeric)::int2
    else null
  end,
  case
    when (sl.metadata->'property_details'->>'floor') ~ '^-?[0-9]+$'
      then (sl.metadata->'property_details'->>'floor')::int2
    else null
  end,
  case
    when sl.metadata->'property_details'->>'terrace' in ('true', 'false')
      then (sl.metadata->'property_details'->>'terrace')::boolean
    else null
  end,
  case
    when sl.metadata->'property_details'->>'elevator' in ('true', 'false')
      then (sl.metadata->'property_details'->>'elevator')::boolean
    else null
  end,
  coalesce(sl.metadata->'valuation'->'normalized', '{}'::jsonb),
  jsonb_build_object(
    'origin', 'seller_estimation',
    'seller_lead_id', sl.id,
    'contact_identity_id', sl.contact_identity_id
  )
from public.seller_projects sp
join public.seller_leads sl on sl.id = sp.seller_lead_id
left join public.project_properties pp
  on pp.client_project_id = sp.client_project_id
 and pp.unlinked_at is null
left join public.properties existing_property
  on existing_property.source = 'seller_estimation'
 and existing_property.source_ref = sl.id::text
where pp.id is null
  and existing_property.id is null;

insert into public.project_properties (
  client_project_id,
  property_id,
  relationship_type,
  is_primary,
  metadata
)
select
  sp.client_project_id,
  p.id,
  'seller_subject_property',
  true,
  jsonb_build_object('backfilled_from', 'seller_lead')
from public.seller_projects sp
join public.seller_leads sl on sl.id = sp.seller_lead_id
join public.properties p
  on p.source = 'seller_estimation'
 and p.source_ref = sl.id::text
left join public.project_properties existing_pp
  on existing_pp.client_project_id = sp.client_project_id
 and existing_pp.property_id = p.id
 and existing_pp.unlinked_at is null
where existing_pp.id is null;

insert into public.valuations (
  client_project_id,
  seller_project_id,
  seller_lead_id,
  property_id,
  contact_identity_id,
  source,
  provider,
  valuation_kind,
  status,
  estimated_price,
  valuation_low,
  valuation_high,
  valuated_at,
  raw_payload,
  metadata
)
select
  sp.client_project_id,
  sp.id,
  sl.id,
  p.id,
  sl.contact_identity_id,
  'seller_lead_backfill',
  coalesce(sl.metadata->'valuation'->>'provider', 'loupe'),
  'seller_estimation',
  'completed',
  coalesce(
    sl.estimated_price,
    case
      when (sl.metadata->'valuation'->'normalized'->>'valuationPrice') ~ '^-?[0-9]+([.][0-9]+)?$'
        then round((sl.metadata->'valuation'->'normalized'->>'valuationPrice')::numeric)::integer
      else null
    end
  ),
  case
    when (sl.metadata->'valuation'->'normalized'->>'valuationPriceLow') ~ '^-?[0-9]+([.][0-9]+)?$'
      then round((sl.metadata->'valuation'->'normalized'->>'valuationPriceLow')::numeric)::integer
    else null
  end,
  case
    when (sl.metadata->'valuation'->'normalized'->>'valuationPriceHigh') ~ '^-?[0-9]+([.][0-9]+)?$'
      then round((sl.metadata->'valuation'->'normalized'->>'valuationPriceHigh')::numeric)::integer
    else null
  end,
  coalesce((sl.metadata->'valuation'->>'synced_at')::timestamptz, now()),
  coalesce(sl.metadata->'valuation'->'normalized', '{}'::jsonb),
  jsonb_build_object('backfilled_from', 'seller_lead')
from public.seller_projects sp
join public.seller_leads sl on sl.id = sp.seller_lead_id
left join public.properties p
  on p.source = 'seller_estimation'
 and p.source_ref = sl.id::text
where sp.latest_valuation_id is null
  and (
    sl.estimated_price is not null
    or (sl.metadata->'valuation'->'normalized'->>'valuationPrice') is not null
    or (sl.metadata->'valuation'->'normalized'->>'valuationPriceLow') is not null
    or (sl.metadata->'valuation'->'normalized'->>'valuationPriceHigh') is not null
  );

update public.seller_projects sp
set latest_valuation_id = valuation_latest.id
from (
  select distinct on (seller_project_id)
    id,
    seller_project_id
  from public.valuations
  where seller_project_id is not null
  order by seller_project_id, valuated_at desc, created_at desc
) valuation_latest
where sp.latest_valuation_id is null
  and valuation_latest.seller_project_id = sp.id;

alter table public.contact_identities enable row level security;
alter table public.buyer_projects enable row level security;
alter table public.valuations enable row level security;
