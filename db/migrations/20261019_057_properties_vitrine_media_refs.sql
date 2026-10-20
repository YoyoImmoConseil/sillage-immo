-- Fiche vitrine — lot 2 : choix des photos de l'affiche.
--
-- L'affiche place une grande photo à droite et une petite dans la carte. Par
-- défaut : 1re et 2e photo du carrousel SweepBright. Le collaborateur peut en
-- choisir d'autres depuis la fiche admin ; le choix est mémorisé par
-- l'identifiant SweepBright du média (`property_media.remote_media_id`), stable
-- d'une synchronisation à l'autre alors que les lignes `property_media` sont
-- supprimées et recréées à chaque synchronisation. Si le média choisi a disparu
-- de SweepBright, l'affiche retombe sur le défaut et le signale.

begin;

alter table public.properties
  add column if not exists vitrine_main_media_ref text,
  add column if not exists vitrine_card_media_ref text;

comment on column public.properties.vitrine_main_media_ref is
  'Fiche vitrine : remote_media_id SweepBright de la grande photo (null = 1re photo).';
comment on column public.properties.vitrine_card_media_ref is
  'Fiche vitrine : remote_media_id SweepBright de la photo de la carte (null = 2e photo).';

commit;
