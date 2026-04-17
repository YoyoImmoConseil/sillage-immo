select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'client_profiles',
    'client_projects',
    'seller_projects',
    'project_properties',
    'client_project_events',
    'contact_identities',
    'buyer_projects',
    'valuations'
  )
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

with all_contacts as (
  select lower(cp.email) as normalized_email,
         nullif(regexp_replace(coalesce(cp.phone, ''), '[^0-9+]', '', 'g'), '') as normalized_phone,
         'client_profiles' as source_name
  from public.client_profiles cp
  where cp.email is not null and length(btrim(cp.email)) > 0
  union all
  select lower(bl.email),
         nullif(regexp_replace(coalesce(bl.phone, ''), '[^0-9+]', '', 'g'), ''),
         'buyer_leads'
  from public.buyer_leads bl
  where bl.email is not null and length(btrim(bl.email)) > 0
  union all
  select lower(sl.email),
         nullif(regexp_replace(coalesce(sl.phone, ''), '[^0-9+]', '', 'g'), ''),
         'seller_leads'
  from public.seller_leads sl
  where sl.email is not null and length(btrim(sl.email)) > 0
)
select normalized_phone, count(*) as row_count
from all_contacts
where normalized_phone is not null
group by normalized_phone
having count(*) > 1
order by row_count desc, normalized_phone asc;
