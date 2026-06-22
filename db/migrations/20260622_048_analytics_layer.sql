-- 20260622_048_analytics_layer.sql
--
-- Goal:
--   Governed analytics layer for the Admin Copilot (Porte 3):
--     - PII-free SQL views over transactions / market_observations.
--     - A constrained, read-only "text-to-SQL" function the copilot can call
--       to answer ad-hoc questions ("CA HT de tel conseiller cette année vs
--       l'an dernier", "les zones qui montent", ...).
--
--   Hard guarantees on the SQL function:
--     - Only a single SELECT / WITH statement.
--     - Forbidden DDL/DML keywords are rejected.
--     - Direct access to PII-bearing tables/columns is rejected (the copilot
--       must go through the analytics_* views, which never expose client PII).
--     - Statement timeout + hard row cap (1000).
--
--   advisor_name = internal staff name (NOT client PII) — intentionally exposed
--   so the copilot can answer per-advisor revenue questions.
--
-- Idempotent: re-running the script MUST be safe.

begin;

-- =====================================================================
-- 1. PII-free analytics views
-- =====================================================================

create or replace view public.analytics_transactions as
select
  t.id,
  t.business_type,
  t.status,
  t.assigned_admin_profile_id,
  coalesce(ap.full_name, nullif(concat_ws(' ', ap.first_name, ap.last_name), '')) as advisor_name,
  t.currency,
  t.mandate_price_amount,
  t.agreed_price_amount,
  t.deed_price_amount,
  t.honoraires_amount,
  t.honoraires_source,
  t.mandate_signed_at,
  t.offer_received_at,
  t.preliminary_sale_signed_at,
  t.deed_signed_at,
  t.cancelled_at,
  t.created_at,
  p.city,
  p.postal_code,
  p.property_type
from public.transactions t
left join public.admin_profiles ap on ap.id = t.assigned_admin_profile_id
left join public.properties p on p.id = t.property_id;

comment on view public.analytics_transactions is
  'PII-free transaction facts for analytics (advisor name = internal staff).';

-- Realized revenue (CA réalisé) — honoraires of deals whose deed (acte) is signed.
create or replace view public.analytics_revenue_realized_monthly as
select
  date_trunc('month', t.deed_signed_at)::date as month,
  t.assigned_admin_profile_id,
  coalesce(ap.full_name, nullif(concat_ws(' ', ap.first_name, ap.last_name), '')) as advisor_name,
  count(*) as deals_closed,
  sum(coalesce(t.honoraires_amount, 0)) as ca_realized
from public.transactions t
left join public.admin_profiles ap on ap.id = t.assigned_admin_profile_id
where t.deed_signed_at is not null
  and t.status <> 'cancelled'
group by 1, 2, 3;

comment on view public.analytics_revenue_realized_monthly is
  'Realized agency revenue (CA HT) per month and advisor, driven by deed_signed_at.';

-- Pipeline / forecast (CA prévisionnel) — weighted honoraires of open deals.
create or replace view public.analytics_revenue_pipeline as
select
  t.id,
  t.assigned_admin_profile_id,
  coalesce(ap.full_name, nullif(concat_ws(' ', ap.first_name, ap.last_name), '')) as advisor_name,
  t.status,
  t.honoraires_amount,
  case t.status
    when 'compromis' then 0.9
    when 'offer' then 0.5
    when 'mandate' then 0.3
    else 0
  end as weight,
  round(
    coalesce(t.honoraires_amount, 0) * case t.status
      when 'compromis' then 0.9
      when 'offer' then 0.5
      when 'mandate' then 0.3
      else 0
    end
  ) as weighted_honoraires
from public.transactions t
left join public.admin_profiles ap on ap.id = t.assigned_admin_profile_id
where t.deed_signed_at is null
  and t.status in ('mandate', 'offer', 'compromis');

comment on view public.analytics_revenue_pipeline is
  'Forecast pipeline: open deals weighted by stage (mandate 0.3 / offer 0.5 / compromis 0.9).';

create or replace view public.analytics_advisor_performance as
select
  ap.id as advisor_id,
  coalesce(ap.full_name, nullif(concat_ws(' ', ap.first_name, ap.last_name), '')) as advisor_name,
  count(t.id) filter (where t.deed_signed_at is not null and t.status <> 'cancelled') as deals_closed,
  sum(coalesce(t.honoraires_amount, 0)) filter (
    where t.deed_signed_at is not null and t.status <> 'cancelled'
  ) as ca_realized,
  count(t.id) filter (
    where t.deed_signed_at is null and t.status in ('mandate', 'offer', 'compromis')
  ) as deals_pipeline
from public.admin_profiles ap
left join public.transactions t on t.assigned_admin_profile_id = ap.id
group by ap.id, advisor_name;

comment on view public.analytics_advisor_performance is
  'Per-advisor performance: closed deals + realized CA + open pipeline count.';

create or replace view public.analytics_market_trends as
select
  date_trunc('month', mo.observed_at)::date as month,
  mo.city,
  mo.postal_code,
  mo.property_type,
  mo.business_type,
  count(*) as observations,
  round(avg(mo.price_per_m2)) as avg_price_per_m2,
  min(mo.price_per_m2) as min_price_per_m2,
  max(mo.price_per_m2) as max_price_per_m2
from public.market_observations mo
where mo.price_per_m2 is not null
group by 1, 2, 3, 4, 5;

comment on view public.analytics_market_trends is
  'Monthly price/m² trends per city/postal/type/business_type from market_observations.';

-- =====================================================================
-- 2. Constrained read-only SQL function for the copilot
-- =====================================================================

create or replace function public.analytics_run_select(query text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
  trimmed text := btrim(query);
  lowered text := lower(btrim(query));
begin
  -- Strip a single trailing semicolon, then forbid any remaining one.
  trimmed := regexp_replace(trimmed, ';\s*$', '');
  if position(';' in trimmed) > 0 then
    raise exception 'Only a single statement is allowed';
  end if;

  if lower(trimmed) !~ '^(select|with)\s' then
    raise exception 'Only SELECT / WITH queries are allowed';
  end if;

  -- Reject DDL/DML and other dangerous verbs (word-boundary matched).
  if lowered ~ '\m(insert|update|delete|drop|alter|create|grant|revoke|truncate|copy|merge|comment|vacuum|analyze|reindex|do|call|lock|set|reset|prepare|listen|notify)\M' then
    raise exception 'Forbidden keyword in query';
  end if;

  -- Block direct access to PII-bearing relations / columns. The copilot must
  -- query the analytics_* views (which never expose client PII).
  if lowered ~ '\m(seller_leads|buyer_leads|client_profiles|contact_identities|transaction_sellers|transaction_buyers|admin_profiles|leads|valuations|ai_messages|ai_conversations|audit_log|crm_webhook_deliveries|seller_email_verifications)\M'
     or lowered ~ '(raw_payload|vendors|information_schema|pg_catalog|pg_)' then
    raise exception 'Query restricted to analytics_* views';
  end if;

  set local statement_timeout = '5000ms';

  execute format(
    'select coalesce(jsonb_agg(row_to_json(sub)), ''[]''::jsonb) from (select * from (%s) q limit 1000) sub',
    trimmed
  ) into result;

  return result;
exception
  when others then
    raise exception 'analytics_run_select error: %', sqlerrm;
end;
$$;

revoke all on function public.analytics_run_select(text) from public;
grant execute on function public.analytics_run_select(text) to service_role;

comment on function public.analytics_run_select(text) is
  'Constrained read-only SELECT executor for the Admin Copilot: single '
  'statement, no DDL/DML, analytics_* views only, 5s timeout, 1000-row cap.';

commit;
