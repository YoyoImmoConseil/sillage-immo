-- 20260527_038_mynotary_archive_storage.sql
--
-- Adds:
--   1. A PRIVATE Supabase Storage bucket `mynotary-archives` used to
--      persist the signed PDFs that MyNotary delivers via the
--      `signature_completed` webhook (`files[].url`). Those URLs may
--      be short-lived signed links — we download immediately on
--      receipt and store our own copy.
--   2. Three columns on `mynotary_signed_documents`:
--      - `signed_document_path`  : path inside the bucket of the
--                                  archived signed PDF.
--      - `signature_proof_path`  : path inside the bucket of the
--                                  audit trail / proof file when
--                                  MyNotary exposes it (still
--                                  TBD — column kept nullable).
--      - `mynotary_register_type`: register the document was found
--                                  in (`MANAGEMENT` | `TRANSACTION`)
--                                  for backfill telemetry + the
--                                  `seller_projects.milestones_stats`
--                                  MCP tool.
--   3. RLS on the bucket: only the service role can read/write — the
--      admin UI fetches signed URLs server-side via
--      `services/mynotary/archive-signed-document.service.ts`.
--
-- Idempotent.

begin;

-- 1. Storage bucket (private, no public access)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'mynotary-archives',
  'mynotary-archives',
  false,
  20 * 1024 * 1024,  -- 20 MB cap per file (signed PDFs are typically < 5 MB)
  array['application/pdf']::text[]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 2. New columns on mynotary_signed_documents
alter table public.mynotary_signed_documents
  add column if not exists signed_document_path text,
  add column if not exists signature_proof_path text,
  add column if not exists mynotary_register_type text;

-- Sanity: only the two values the spec defines for the register type.
alter table public.mynotary_signed_documents
  drop constraint if exists chk_mynotary_register_type;
alter table public.mynotary_signed_documents
  add constraint chk_mynotary_register_type
    check (
      mynotary_register_type is null
      or mynotary_register_type in ('MANAGEMENT', 'TRANSACTION')
    );

create index if not exists idx_mynotary_signed_documents_register_type
  on public.mynotary_signed_documents (mynotary_register_type)
  where mynotary_register_type is not null;

comment on column public.mynotary_signed_documents.signed_document_path is
  'Path within the `mynotary-archives` Supabase Storage bucket pointing to the signed PDF downloaded from MyNotary (`files[].url`).';
comment on column public.mynotary_signed_documents.signature_proof_path is
  'Path within the `mynotary-archives` bucket pointing to the eIDAS proof file when MyNotary exposes it.';
comment on column public.mynotary_signed_documents.mynotary_register_type is
  'MyNotary register the document belongs to: MANAGEMENT (mandats) or TRANSACTION (promesses / compromis / actes).';

-- 3. RLS on the storage bucket. Default storage policies forbid all
-- access to private buckets, which is what we want; we add an
-- explicit positive policy for the service role so the admin UI can
-- mint signed URLs server-side via supabaseAdmin.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'mynotary_archives_service_role_rw'
  ) then
    execute $POLICY$
      create policy mynotary_archives_service_role_rw
        on storage.objects
        for all
        to service_role
        using (bucket_id = 'mynotary-archives')
        with check (bucket_id = 'mynotary-archives');
    $POLICY$;
  end if;
end$$;

commit;
