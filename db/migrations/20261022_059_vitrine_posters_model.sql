-- Fiche vitrine — lot « statuts » : trace du modèle d'affiche utilisé.
--
-- Une affiche peut maintenant porter un ruban de statut (Sous offre, Sous
-- compromis, Vendu, Loué). L'archive `vitrine_posters` garde, en plus de
-- l'instantané JSON `content`, deux colonnes interrogeables :
--   - poster_model        : modèle rendu (sale, under_offer, under_contract,
--                           sold, rental, rented) ;
--   - availability_status : statut SweepBright du bien au moment du rendu,
--                           tel qu'il a été lu (jamais saisi à la main).
-- Les lignes antérieures restent à NULL : on ne réécrit pas l'historique.

begin;

alter table public.vitrine_posters
  add column if not exists poster_model text,
  add column if not exists availability_status text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'vitrine_posters_poster_model_check'
  ) then
    alter table public.vitrine_posters
      add constraint vitrine_posters_poster_model_check
      check (
        poster_model is null
        or poster_model in ('sale', 'under_offer', 'under_contract', 'sold', 'rental', 'rented')
      );
  end if;
end $$;

comment on column public.vitrine_posters.poster_model is
  'Modèle d''affiche rendu : sale | under_offer | under_contract | sold | rental | rented (NULL avant le lot statuts).';
comment on column public.vitrine_posters.availability_status is
  'Statut SweepBright (availability_status) du bien au moment du rendu.';

commit;
