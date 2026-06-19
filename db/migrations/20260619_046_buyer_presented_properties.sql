-- 20260619_046_buyer_presented_properties.sql
--
-- Goal:
--   Introduce advisor-curated "presented properties" for a BUYER project.
--   An advisor presents one or several apartments to an acquéreur; each
--   apartment may or may not exist in the Sillage catalog (`properties`).
--   Each presented property is a GROUP that carries its own documents,
--   uploadable by the admin AND by the buyer (co-titulaires included), and
--   visible to every member of the buyer project via the indivision model
--   (client_project_clients) — consistent with 20260602_022 and 20260619_045.
--
--   Two tables:
--     - buyer_presented_properties        : the group (label/address/optional
--                                            link to a real properties row or
--                                            an external URL).
--     - buyer_presented_property_documents : documents attached to a group,
--                                            mirror of property_documents but
--                                            keyed by presented_property_id.
--
--   Storage reuses the existing private bucket `property-documents`
--   (path prefix `presented/{presentedPropertyId}/...`).
--
-- Idempotent: re-running the script after a partial apply MUST be safe.

begin;

-- =====================================================================
-- 1. buyer_presented_properties (the group)
-- =====================================================================

create table if not exists public.buyer_presented_properties (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  client_project_id uuid not null references public.client_projects(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  label text not null,
  address text,
  city text,
  price_amount integer,
  rooms int2,
  living_area_m2 double precision,
  external_url text,
  notes text,
  created_by_admin_profile_id uuid references public.admin_profiles(id) on delete set null,
  archived_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_buyer_presented_properties_project_active
  on public.buyer_presented_properties (client_project_id)
  where archived_at is null;

comment on table public.buyer_presented_properties is
  'Advisor-curated apartment presented to a buyer project. May link to a '
  'real properties row (property_id) or stand alone (external/off-catalog). '
  'Groups its documents in buyer_presented_property_documents.';

alter table public.buyer_presented_properties enable row level security;

drop policy if exists "buyer_presented_properties_client_select" on public.buyer_presented_properties;
create policy "buyer_presented_properties_client_select"
  on public.buyer_presented_properties
  for select
  to authenticated
  using (
    archived_at is null
    and exists (
      select 1
      from public.client_projects cproj
      where cproj.id = buyer_presented_properties.client_project_id
        and (
          exists (
            select 1
            from public.client_profiles cp
            where cp.id = cproj.client_profile_id
              and cp.auth_user_id = auth.uid()
          )
          or exists (
            select 1
            from public.client_project_clients cpc
            join public.client_profiles cp on cp.id = cpc.client_profile_id
            where cpc.client_project_id = cproj.id
              and cpc.removed_at is null
              and cp.auth_user_id = auth.uid()
          )
        )
    )
  );

-- =====================================================================
-- 2. buyer_presented_property_documents (documents of a group)
-- =====================================================================

create table if not exists public.buyer_presented_property_documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  presented_property_id uuid not null references public.buyer_presented_properties(id) on delete cascade,
  kind text not null,
  visibility text not null default 'admin_and_client',
  label text not null,
  external_url text,
  storage_bucket text,
  storage_path text,
  mime_type text,
  size_bytes bigint,
  uploaded_by_admin_profile_id uuid references public.admin_profiles(id) on delete set null,
  uploaded_by_client_profile_id uuid references public.client_profiles(id) on delete set null,
  deleted_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  constraint chk_bpp_documents_kind check (kind in ('file', 'link')),
  constraint chk_bpp_documents_visibility check (visibility in ('admin_only', 'admin_and_client')),
  constraint chk_bpp_documents_uploader_xor check (
    (uploaded_by_admin_profile_id is not null)::int
    + (uploaded_by_client_profile_id is not null)::int = 1
  ),
  constraint chk_bpp_documents_file_storage check (
    kind <> 'file' or (storage_bucket is not null and storage_path is not null)
  ),
  constraint chk_bpp_documents_link_url check (
    kind <> 'link' or external_url is not null
  ),
  constraint chk_bpp_documents_client_visibility check (
    -- Buyers cannot publish admin_only documents.
    uploaded_by_client_profile_id is null or visibility = 'admin_and_client'
  )
);

create index if not exists idx_bpp_documents_presented_active
  on public.buyer_presented_property_documents (presented_property_id)
  where deleted_at is null;

create index if not exists idx_bpp_documents_uploader_admin
  on public.buyer_presented_property_documents (uploaded_by_admin_profile_id)
  where deleted_at is null;

create index if not exists idx_bpp_documents_uploader_client
  on public.buyer_presented_property_documents (uploaded_by_client_profile_id)
  where deleted_at is null;

comment on table public.buyer_presented_property_documents is
  'Documents attached to a buyer_presented_properties group. admin_only: '
  'visible to admin team only. admin_and_client: visible to admin + all '
  'members of the buyer project. Buyers can only publish admin_and_client.';

alter table public.buyer_presented_property_documents enable row level security;

drop policy if exists "bpp_documents_client_select" on public.buyer_presented_property_documents;
create policy "bpp_documents_client_select"
  on public.buyer_presented_property_documents
  for select
  to authenticated
  using (
    deleted_at is null
    and (
      visibility = 'admin_and_client'
      or exists (
        select 1
        from public.client_profiles cp
        where cp.id = buyer_presented_property_documents.uploaded_by_client_profile_id
          and cp.auth_user_id = auth.uid()
      )
    )
    and exists (
      select 1
      from public.buyer_presented_properties bpp
      join public.client_projects cproj on cproj.id = bpp.client_project_id
      where bpp.id = buyer_presented_property_documents.presented_property_id
        and bpp.archived_at is null
        and (
          exists (
            select 1
            from public.client_profiles cp
            where cp.id = cproj.client_profile_id
              and cp.auth_user_id = auth.uid()
          )
          or exists (
            select 1
            from public.client_project_clients cpc
            join public.client_profiles cp on cp.id = cpc.client_profile_id
            where cpc.client_project_id = cproj.id
              and cpc.removed_at is null
              and cp.auth_user_id = auth.uid()
          )
        )
    )
  );

-- =====================================================================
-- 3. Storage bucket (reuse existing private property-documents bucket)
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('property-documents', 'property-documents', false)
on conflict (id) do update set public = excluded.public;

commit;
