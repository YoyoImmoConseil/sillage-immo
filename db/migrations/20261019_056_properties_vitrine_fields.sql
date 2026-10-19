-- Fiche vitrine — lot 1 : champs éditoriaux saisis par le collaborateur.
--
-- L'affiche A3 reprend les données SweepBright telles quelles, sauf deux
-- éléments qui n'existent nulle part dans le flux et qui sont rédigés à la
-- main sur la fiche : les « points forts » (3 à 5 lignes courtes) et le nom
-- du quartier tel qu'il doit apparaître dans le bandeau.
--
-- Ces colonnes vivent sur `properties` (et non dans `metadata`) pour être
-- typées, interrogeables et surtout hors de portée de la synchronisation
-- SweepBright : l'upsert de `sweepbright-sync.service.ts` n'écrit que la
-- liste explicite de colonnes qu'il connaît (PostgREST ne touche pas aux
-- colonnes absentes du payload), donc une resynchronisation du bien ne peut
-- ni effacer ni écraser ce qui a été saisi ici. Un test vitest verrouille ce
-- contrat côté code.
--
-- Validation métier (3 à 5 lignes, 28 caractères max, trim) : côté service,
-- pas en contrainte SQL, pour pouvoir évoluer sans migration. Seule la borne
-- haute « jamais plus de 5 lignes » est verrouillée ici comme garde-fou.

begin;

alter table public.properties
  add column if not exists vitrine_highlights text[] not null default '{}'::text[],
  add column if not exists vitrine_quartier text,
  add column if not exists vitrine_updated_at timestamptz,
  add column if not exists vitrine_updated_by text;

alter table public.properties
  drop constraint if exists properties_vitrine_highlights_max_check;

alter table public.properties
  add constraint properties_vitrine_highlights_max_check
  check (coalesce(array_length(vitrine_highlights, 1), 0) <= 5);

comment on column public.properties.vitrine_highlights is
  'Fiche vitrine : points forts rédigés à la main (3 à 5 lignes, 28 caractères max). Jamais alimenté par SweepBright.';
comment on column public.properties.vitrine_quartier is
  'Fiche vitrine : nom du quartier affiché sur l''affiche (saisi à la main, pré-rempli depuis le titre).';
comment on column public.properties.vitrine_updated_at is
  'Fiche vitrine : dernière modification des champs éditoriaux.';
comment on column public.properties.vitrine_updated_by is
  'Fiche vitrine : e-mail du collaborateur ayant fait la dernière modification.';

commit;
