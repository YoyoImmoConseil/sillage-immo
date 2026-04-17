select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('contact_identities', 'buyer_projects', 'valuations')
order by table_name;

select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'seller_leads' and column_name = 'contact_identity_id')
    or (table_name = 'buyer_leads' and column_name = 'contact_identity_id')
    or (table_name = 'client_profiles' and column_name = 'contact_identity_id')
    or (table_name = 'buyer_search_profiles' and column_name = 'client_project_id')
  )
order by table_name, column_name;

select 'contact_identities' as name, count(*)::int as count from public.contact_identities
union all
select 'buyer_projects', count(*)::int from public.buyer_projects
union all
select 'valuations', count(*)::int from public.valuations
union all
select 'seller_leads_with_contact_identity', count(*)::int from public.seller_leads where contact_identity_id is not null
union all
select 'buyer_leads_with_contact_identity', count(*)::int from public.buyer_leads where contact_identity_id is not null
union all
select 'client_profiles_with_contact_identity', count(*)::int from public.client_profiles where contact_identity_id is not null
union all
select 'buyer_search_profiles_with_project', count(*)::int from public.buyer_search_profiles where client_project_id is not null
union all
select 'properties_from_seller_estimation', count(*)::int from public.properties where source = 'seller_estimation'
union all
select 'seller_projects_with_latest_valuation', count(*)::int from public.seller_projects where latest_valuation_id is not null;

select kind, count(*)::int as count
from public.property_media
group by kind
order by kind asc;
