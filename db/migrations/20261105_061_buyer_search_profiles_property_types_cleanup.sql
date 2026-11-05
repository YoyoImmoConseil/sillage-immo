-- Profils de recherche acquéreurs — nettoyage des types de biens (05/11/2026).
--
-- Le Zap SweepBright concaténait deux booléens « appartement ? » / « maison ? »
-- (« TrueFalse », « FalseTrue », « FalseFalse ») et laissait passer des libellés
-- libres (« T3 », « 2 piece », « Parking box »…). Le rapprochement bloque dès
-- que la liste est non vide et que le type du bien n'y figure pas : les 478
-- profils « TrueFalse » n'ont jamais pu correspondre à un bien.
--
-- Mapping (identique à lib/buyers/property-type-normalizer.ts, appliqué
-- désormais à l'entrée) :
--   TrueFalse → apartment ; FalseTrue → house ; TrueTrue → apartment + house ;
--   FalseFalse → aucun type (tout type accepté) ;
--   T2 / T3 / « 2 piece » / Appartement / « TrueFalse appartement T3 » →
--   apartment, et rooms_min = 2 ou 3 s'il n'était pas renseigné ;
--   Parking box → other, libellé conservé dans location_text.
-- La valeur d'origine est conservée dans criteria->'property_types_raw'.

begin;

-- 1. Trace de l'original (une seule fois).
update public.buyer_search_profiles
set criteria = coalesce(criteria, '{}'::jsonb)
  || jsonb_build_object('property_types_raw', to_jsonb(property_types))
where property_types is not null
  and array_length(property_types, 1) > 0
  and exists (
    select 1 from unnest(property_types) t
    where lower(t) not in ('apartment','house','villa','studio','loft','duplex','penthouse','land','building','office','commercial','other')
  )
  and (criteria is null or not (criteria ? 'property_types_raw'));

-- 2. Pièces déduites des libellés « T2 », « T3 », « 2 piece » (si vides).
update public.buyer_search_profiles
set rooms_min = 3
where rooms_min is null
  and exists (select 1 from unnest(property_types) t where lower(t) ~ '(^|\s)t3(\s|$)');

update public.buyer_search_profiles
set rooms_min = 2
where rooms_min is null
  and exists (select 1 from unnest(property_types) t where lower(t) ~ '(^|\s)(t2|2 piece)(\s|$)');

-- 3. Parking : mention conservée en texte libre.
update public.buyer_search_profiles
set location_text = trim(both ' · ' from coalesce(location_text, '') || ' · Parking / box')
where exists (select 1 from unnest(property_types) t where lower(t) like '%parking%' or lower(t) like '%box%')
  and coalesce(location_text, '') not ilike '%parking%';

-- 4. Réécriture des types.
update public.buyer_search_profiles p
set property_types = mapped.types,
    updated_at = now()
from (
  select id,
         array_remove(array_agg(distinct mapped_type), null) as types
  from (
    select p2.id,
           case
             when lower(t) in ('apartment','house','villa','studio','loft','duplex','penthouse','land','building','office','commercial','other') then lower(t)
             when lower(t) = 'truefalse' or lower(t) like 'truefalse %' then 'apartment'
             when lower(t) = 'falsetrue' or lower(t) like 'falsetrue %' then 'house'
             when lower(t) like '%appart%' or lower(t) like '%apartment%' then 'apartment'
             when lower(t) like '%maison%' or lower(t) like '%house%' then 'house'
             when lower(t) like '%villa%' then 'villa'
             when lower(t) like '%studio%' then 'studio'
             when lower(t) ~ '(^|\s)(t|f)[1-9](\s|$)' or lower(t) ~ '(^|\s)[1-9]\s?(p|piece|pieces)(\s|$)' then 'apartment'
             when lower(t) like '%parking%' or lower(t) like '%box%' or lower(t) like '%garage%' then 'other'
             else null
           end as mapped_type
    from public.buyer_search_profiles p2
    cross join lateral unnest(p2.property_types) as raw_t
    -- TrueTrue vaut deux types.
    cross join lateral unnest(
      case when lower(raw_t) = 'truetrue' or lower(raw_t) like 'truetrue %'
           then array['apartment', 'house'] else array[raw_t] end
    ) as t
    where exists (
      select 1 from unnest(p2.property_types) x
      where lower(x) not in ('apartment','house','villa','studio','loft','duplex','penthouse','land','building','office','commercial','other')
    )
  ) s
  group by id
) mapped
where mapped.id = p.id;

-- 5. Sécurité : plus aucun libellé hors vocabulaire canonique.
do $$
declare bad int;
begin
  select count(*) into bad
  from public.buyer_search_profiles
  where exists (
    select 1 from unnest(property_types) t
    where lower(t) not in ('apartment','house','villa','studio','loft','duplex','penthouse','land','building','office','commercial','other')
  );
  if bad > 0 then
    raise exception 'property_types : % profil(s) encore hors vocabulaire', bad;
  end if;
end $$;

commit;
