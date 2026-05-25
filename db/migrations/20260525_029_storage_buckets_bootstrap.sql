-- 20260525_029_storage_buckets_bootstrap.sql
--
-- Goal:
--   Bootstrap the two Supabase Storage buckets the platform expects but
--   that were never wired into a migration:
--     - `property-media-cache`              (cached SweepBright media)
--     - `seller-estimation-property-media`  (estimation tunnel uploads)
--
--   The `property-documents` bucket is already shipped by migration 022;
--   we leave it alone here. Both new buckets are kept PRIVATE: client &
--   admin code accesses them through signed URLs minted by the service
--   layer. No bucket policy is created — `service_role` bypasses RLS,
--   and end-user surfaces consume the signed-URL projection.
--
-- Idempotent: `insert ... on conflict do nothing` makes re-applies safe.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('property-media-cache', 'property-media-cache', false, null, null),
  ('seller-estimation-property-media', 'seller-estimation-property-media', false, null, null)
on conflict (id) do nothing;

commit;
