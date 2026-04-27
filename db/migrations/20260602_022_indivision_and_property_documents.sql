-- 20260602_022_indivision_and_property_documents.sql
--
-- Goal:
--   1. Allow several `client_profiles` (co-owners / indivision) to share a
--      single `client_projects` (one mandate per property regardless of how
--      many natural owners). The legacy 1:1 link `client_projects.client_profile_id`
--      is kept untouched for backward compatibility (it now models the
--      "primary historical owner") and we add a side N:N table
--      `client_project_clients` carrying the role per (project, client).
--   2. Introduce a dedicated `property_documents` table to attach PDFs and
--      external links to a property. Documents are admin <-> client(s)
--      bidirectional with explicit visibility per row (admin_only or
--      admin_and_client) and explicit uploader (admin profile XOR client
--      profile). Storage lives in the private `property-documents` bucket.
--
-- Idempotent: re-running the script after a partial apply MUST be safe.

begin;

-- =====================================================================
-- 1. Indivision : table client_project_clients (N:N)
-- =====================================================================

create table if not exists public.client_project_clients (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  client_project_id uuid not null references public.client_projects(id) on delete cascade,
  client_profile_id uuid not null references public.client_profiles(id) on delete cascade,
  role text not null default 'co_owner',
  added_by_admin_profile_id uuid references public.admin_profiles(id) on delete set null,
  removed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  constraint chk_client_project_clients_role check (role in ('primary', 'co_owner'))
);

-- One active membership per (project, client).
create unique index if not exists idx_client_project_clients_active_unique
  on public.client_project_clients (client_project_id, client_profile_id)
  where removed_at is null;

-- At most one ACTIVE primary per project.
create unique index if not exists idx_client_project_clients_primary_unique
  on public.client_project_clients (client_project_id)
  where role = 'primary' and removed_at is null;

-- Hot path used by portal access checks.
create index if not exists idx_client_project_clients_profile_active
  on public.client_project_clients (client_profile_id)
  where removed_at is null;

create index if not exists idx_client_project_clients_project_active
  on public.client_project_clients (client_project_id)
  where removed_at is null;

comment on table public.client_project_clients is
  'N:N membership between client_projects and client_profiles to model '
  'co-ownership (indivision). The legacy column client_projects.client_profile_id '
  'is preserved as the historical primary client; portal access resolution must '
  'consult this table (role IN (primary, co_owner) AND removed_at IS NULL) AS '
  'the source of truth.';

-- Backfill : every existing client_projects row materializes its current owner
-- as a primary membership. Idempotent.
insert into public.client_project_clients (client_project_id, client_profile_id, role)
select id, client_profile_id, 'primary'
from public.client_projects
on conflict do nothing;

-- =====================================================================
-- 2. RLS for client_project_clients
-- =====================================================================
-- Pattern aligned with 20260326_017: server-side reads/writes use the
-- service_role key (supabaseAdmin), which bypasses RLS. Authenticated
-- frontend reads are restricted to memberships the requester owns.

alter table public.client_project_clients enable row level security;

drop policy if exists "client_project_clients_self_select" on public.client_project_clients;
create policy "client_project_clients_self_select"
  on public.client_project_clients
  for select
  to authenticated
  using (
    removed_at is null
    and exists (
      select 1
      from public.client_profiles cp
      where cp.id = client_project_clients.client_profile_id
        and cp.auth_user_id = auth.uid()
    )
  );

-- =====================================================================
-- 3. Extend portal-side RLS so co-owners can read shared projects.
-- =====================================================================
-- The 20260326_017 policies authorize reads only when the requester is the
-- legacy primary `client_projects.client_profile_id`. With indivision, a
-- co-owner whose profile lives in `client_project_clients` must also see
-- the project, the seller_project, the project_properties and the events.

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
    or exists (
      select 1
      from public.client_project_clients cpc
      join public.client_profiles cp on cp.id = cpc.client_profile_id
      where cpc.client_project_id = client_projects.id
        and cpc.removed_at is null
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
    or exists (
      select 1
      from public.client_project_clients cpc
      join public.client_profiles cp on cp.id = cpc.client_profile_id
      where cpc.client_project_id = seller_projects.client_project_id
        and cpc.removed_at is null
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
    and (
      exists (
        select 1
        from public.client_projects cproj
        join public.client_profiles cp on cp.id = cproj.client_profile_id
        where cproj.id = project_properties.client_project_id
          and cp.auth_user_id = auth.uid()
      )
      or exists (
        select 1
        from public.client_project_clients cpc
        join public.client_profiles cp on cp.id = cpc.client_profile_id
        where cpc.client_project_id = project_properties.client_project_id
          and cpc.removed_at is null
          and cp.auth_user_id = auth.uid()
      )
    )
  );

drop policy if exists "client_project_events_self_select" on public.client_project_events;
create policy "client_project_events_self_select"
  on public.client_project_events
  for select
  to authenticated
  using (
    visible_to_client = true
    and (
      exists (
        select 1
        from public.client_projects cproj
        join public.client_profiles cp on cp.id = cproj.client_profile_id
        where cproj.id = client_project_events.client_project_id
          and cp.auth_user_id = auth.uid()
      )
      or exists (
        select 1
        from public.client_project_clients cpc
        join public.client_profiles cp on cp.id = cpc.client_profile_id
        where cpc.client_project_id = client_project_events.client_project_id
          and cpc.removed_at is null
          and cp.auth_user_id = auth.uid()
      )
    )
  );

-- =====================================================================
-- 4. property_documents
-- =====================================================================

create table if not exists public.property_documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  property_id uuid not null references public.properties(id) on delete cascade,
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
  constraint chk_property_documents_kind check (kind in ('file', 'link')),
  constraint chk_property_documents_visibility check (visibility in ('admin_only', 'admin_and_client')),
  constraint chk_property_documents_uploader_xor check (
    (uploaded_by_admin_profile_id is not null)::int
    + (uploaded_by_client_profile_id is not null)::int = 1
  ),
  constraint chk_property_documents_file_storage check (
    kind <> 'file' or (storage_bucket is not null and storage_path is not null)
  ),
  constraint chk_property_documents_link_url check (
    kind <> 'link' or external_url is not null
  ),
  constraint chk_property_documents_client_visibility check (
    -- Sellers cannot publish admin_only documents.
    uploaded_by_client_profile_id is null or visibility = 'admin_and_client'
  )
);

create index if not exists idx_property_documents_property_active
  on public.property_documents (property_id)
  where deleted_at is null;

create index if not exists idx_property_documents_uploader_admin
  on public.property_documents (uploaded_by_admin_profile_id)
  where deleted_at is null;

create index if not exists idx_property_documents_uploader_client
  on public.property_documents (uploaded_by_client_profile_id)
  where deleted_at is null;

comment on table public.property_documents is
  'Bidirectional document store attached to a property: admin can upload PDFs '
  'or attach external links visible to seller co-owners, sellers can upload '
  'PDFs visible to admins. Visibility (admin_only vs admin_and_client) is '
  'controlled per row by the admin; sellers cannot publish admin_only rows.';

comment on column public.property_documents.visibility is
  'admin_only: visible only to admin team. admin_and_client: visible to admin '
  '+ all co-owners attached to the property via project_properties / '
  'client_project_clients.';

-- RLS: server-side via supabaseAdmin (service_role bypasses RLS). The
-- authenticated policy lets the frontend client read his own row set
-- defensively. All write paths go through the API server-side.
alter table public.property_documents enable row level security;

drop policy if exists "property_documents_client_select" on public.property_documents;
create policy "property_documents_client_select"
  on public.property_documents
  for select
  to authenticated
  using (
    deleted_at is null
    and (
      visibility = 'admin_and_client'
      or exists (
        select 1
        from public.client_profiles cp
        where cp.id = property_documents.uploaded_by_client_profile_id
          and cp.auth_user_id = auth.uid()
      )
    )
    and exists (
      select 1
      from public.project_properties pp
      join public.client_projects cproj on cproj.id = pp.client_project_id
      where pp.property_id = property_documents.property_id
        and pp.unlinked_at is null
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
-- 5. Storage bucket: property-documents (private)
-- =====================================================================
-- Reuse the same private-bucket pattern as `seller-estimation-property-media`.
-- Idempotent INSERT; no public read access; service_role uploads/downloads
-- via signed URLs.

insert into storage.buckets (id, name, public)
values ('property-documents', 'property-documents', false)
on conflict (id) do update set public = excluded.public;

commit;
