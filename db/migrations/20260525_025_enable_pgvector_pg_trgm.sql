-- 20260525_025_enable_pgvector_pg_trgm.sql
--
-- Goal:
--   Enable the two Postgres extensions required by the AI uplift:
--     - `vector` (pgvector) for semantic similarity search over embeddings
--       stored in `entity_embeddings`.
--     - `pg_trgm` for trigram-based fuzzy text search (used by free-text
--       lookups across leads, properties, etc.).
--
--   Both extensions are first-party Supabase extensions (preinstalled on
--   the platform) and `create extension if not exists` is idempotent.
--
-- Idempotent: safe to re-apply.

begin;

create extension if not exists vector;
create extension if not exists pg_trgm;

commit;
