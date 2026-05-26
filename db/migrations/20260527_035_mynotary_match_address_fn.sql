-- 20260527_035_mynotary_match_address_fn.sql
--
-- Companion to migration 034: tiny SQL helper used by
-- services/mynotary/auto-match.service.ts to fuzzy-match a normalized
-- address against `properties.formatted_address` via pg_trgm.
--
-- Why a dedicated function?
--   PostgREST does not expose the pg_trgm `similarity()` operator
--   from the JS client side. A SECURITY DEFINER function called via
--   `supabaseAdmin.rpc(...)` keeps the fuzzy logic server-side and
--   trivially performant (pg_trgm GIN index already exists on the
--   `properties.formatted_address` column).
--
-- Idempotent: safe to re-apply.

begin;

create or replace function public.mynotary_match_address(
  p_query text,
  p_min_similarity real default 0.6,
  p_limit int default 5
)
returns table (
  property_id uuid,
  similarity real
)
language sql
security definer
set search_path = public
as $$
  select
    p.id as property_id,
    similarity(coalesce(p.formatted_address, ''), p_query) as similarity
  from public.properties p
  where p.formatted_address is not null
    and similarity(p.formatted_address, p_query) >= p_min_similarity
  order by similarity desc
  limit greatest(p_limit, 1);
$$;

revoke all on function public.mynotary_match_address(text, real, int) from public;
grant execute on function public.mynotary_match_address(text, real, int) to service_role;

commit;
