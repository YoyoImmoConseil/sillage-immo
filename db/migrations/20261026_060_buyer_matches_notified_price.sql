-- Rapprochements acquéreurs — mail « Nouveau prix » (décision du 26/10/2026).
--
-- Quand le prix d'une annonce baisse, les acquéreurs qui l'avaient déjà
-- reçue sont prévenus une fois par baisse. Pour cela on mémorise, sur la
-- correspondance, le prix auquel l'acquéreur a été alerté pour la dernière
-- fois (`notified_price_amount`) et la date du dernier mail « Nouveau prix »
-- (`price_notified_at`).
--
-- Reprise de l'existant : les correspondances déjà notifiées prennent le prix
-- actuel de l'annonce, pour qu'une baisse ultérieure les déclenche.

begin;

alter table public.buyer_property_matches
  add column if not exists notified_price_amount numeric,
  add column if not exists price_notified_at timestamptz;

comment on column public.buyer_property_matches.notified_price_amount is
  'Prix de l''annonce au moment du dernier mail envoyé à l''acquéreur (alerte ou nouveau prix).';
comment on column public.buyer_property_matches.price_notified_at is
  'Date du dernier mail « Nouveau prix » envoyé pour cette correspondance.';

update public.buyer_property_matches m
set notified_price_amount = l.price_amount
from public.property_listings l
where l.id = m.property_listing_id
  and m.notified_at is not null
  and m.notified_price_amount is null;

commit;
