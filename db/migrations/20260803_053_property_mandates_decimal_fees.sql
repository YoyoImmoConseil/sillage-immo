-- Correctif de la migration 052 : les honoraires fixes sont décimaux.
--
-- `vendor_fixed_fee` et `buyer_fixed_fee` avaient été typés `integer` par
-- cohérence avec `property_listings.price_amount`. SweepBright envoie en fait
-- des décimales — constaté à l'amorçage sur un bien porteur d'un honoraire
-- fixe de 605,15 €, dont l'insertion a échoué avec
-- « invalid input syntax for type integer ».
--
-- `numeric(12, 2)` couvre les montants en euros au centime près. Les
-- pourcentages étaient déjà en `numeric(6, 3)`.
--
-- ALTER autorisé ici : `property_mandates` est une table de ce lot, alimentée
-- par notre code, et non une table alimentée par SweepBright.

begin;

alter table public.property_mandates
  alter column vendor_fixed_fee type numeric(12, 2),
  alter column buyer_fixed_fee type numeric(12, 2);

commit;
