-- 20260528_039_mynotary_match_seller_project_fn.sql
--
-- Companion to migration 035: fuzzy/exact-match a normalized address
-- against `seller_leads.property_address` to discover the
-- `seller_project` we should attach a signed MyNotary mandate to.
--
-- Why a dedicated function (vs reusing the JS ILIKE path)?
--   PostgREST does not expose pg_trgm `similarity()` from the JS
--   client. A SECURITY DEFINER function called via
--   `supabaseAdmin.rpc(...)` keeps the fuzzy logic server-side and
--   benefits from the pg_trgm GIN index on
--   `seller_leads.property_address`.
--
-- Used by `services/mynotary/auto-match.service.ts` to bridge the
-- "we have a property address from MyNotary but no signer email" case
-- — without this RPC, auto-match could only attach a `property_id`
-- and never the `seller_project_id`, which left the dashboard KPIs at
-- 0 even for clearly-matched mandates.
--
-- Idempotent: safe to re-apply.

begin;

-- Belt-and-suspenders: make sure the pg_trgm GIN index that the
-- function relies on exists. Creating it idempotently keeps the
-- migration self-contained even if migration 025 happened to be
-- partially rolled back on a given environment.
create index if not exists seller_leads_property_address_trgm_idx
  on public.seller_leads
  using gin (property_address gin_trgm_ops);

create or replace function public.mynotary_match_seller_project_by_address(
  p_query text,
  p_min_similarity real default 0.6,
  p_limit int default 5
)
returns table (
  seller_project_id uuid,
  seller_lead_id uuid,
  property_address text,
  similarity real
)
language sql
security definer
set search_path = public
as $$
  with ranked as (
    select
      sp.id as seller_project_id,
      sp.seller_lead_id,
      sl.property_address,
      similarity(coalesce(sl.property_address, ''), p_query) as sim,
      sp.updated_at,
      row_number() over (
        partition by sp.id
        order by similarity(coalesce(sl.property_address, ''), p_query) desc,
                 sp.updated_at desc
      ) as rn
    from public.seller_projects sp
    join public.seller_leads sl on sl.id = sp.seller_lead_id
    where sl.property_address is not null
      and sl.property_address <> ''
      and similarity(sl.property_address, p_query) >= p_min_similarity
  )
  select
    seller_project_id,
    seller_lead_id,
    property_address,
    sim as similarity
  from ranked
  where rn = 1
  order by similarity desc, updated_at desc
  limit greatest(p_limit, 1);
$$;

revoke all on function public.mynotary_match_seller_project_by_address(text, real, int) from public;
grant execute on function public.mynotary_match_seller_project_by_address(text, real, int) to service_role;

commit;
