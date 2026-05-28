-- 20260528_040_mynotary_match_seller_project_by_names_fn.sql
--
-- Companion to migration 039: fuzzy-match a list of normalized
-- person names (extracted from MyNotary register entries' free-form
-- `mandants` text) against `seller_leads.full_name` to discover the
-- `seller_project` we should attach a signed mandate to.
--
-- Rationale:
--   /register-entries does NOT ship a structured `signers[]` array —
--   we only get free-form "Monsieur LEVI Mickaël Roland - <address>"
--   strings. Address-based matching catches ~25% of historical
--   mandates in the field; name-based matching is the missing leg
--   for the rest. The webhook payload (for future signatures) DOES
--   ship structured emails, so this RPC is only needed for backfill.
--
-- The function returns the best matching seller_project ranked by
-- the maximum trigram similarity across all queried names — so a
-- mandate co-signed by two persons returns the lead that matches
-- either of them.
--
-- Idempotent: safe to re-apply.

begin;

create index if not exists seller_leads_full_name_trgm_idx
  on public.seller_leads
  using gin (full_name gin_trgm_ops);

create or replace function public.mynotary_match_seller_project_by_names(
  p_names text[],
  p_min_similarity real default 0.55,
  p_limit int default 5
)
returns table (
  seller_project_id uuid,
  seller_lead_id uuid,
  full_name text,
  matched_query text,
  similarity real
)
language sql
security definer
set search_path = public
as $$
  with name_queries as (
    select unnest(p_names) as q
  ),
  scored as (
    select
      sp.id as seller_project_id,
      sp.seller_lead_id,
      sl.full_name,
      nq.q as matched_query,
      similarity(coalesce(sl.full_name, ''), nq.q) as sim,
      sp.updated_at
    from public.seller_projects sp
    join public.seller_leads sl on sl.id = sp.seller_lead_id
    cross join name_queries nq
    where sl.full_name is not null
      and sl.full_name <> ''
      and similarity(sl.full_name, nq.q) >= p_min_similarity
  ),
  best_per_project as (
    select distinct on (seller_project_id)
      seller_project_id,
      seller_lead_id,
      full_name,
      matched_query,
      sim,
      updated_at
    from scored
    order by seller_project_id, sim desc, updated_at desc
  )
  select
    seller_project_id,
    seller_lead_id,
    full_name,
    matched_query,
    sim as similarity
  from best_per_project
  order by sim desc, updated_at desc
  limit greatest(p_limit, 1);
$$;

revoke all on function public.mynotary_match_seller_project_by_names(text[], real, int) from public;
grant execute on function public.mynotary_match_seller_project_by_names(text[], real, int) to service_role;

commit;
