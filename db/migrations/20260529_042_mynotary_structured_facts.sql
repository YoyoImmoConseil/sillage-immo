-- 20260529_042_mynotary_structured_facts.sql
--
-- Goal (Réconciliation multi-sources — Phase 1): enrich every signed
-- MyNotary contract with the *structured facts* parsed from the operation
-- detail (GET /operations/{id} + GET /records/{id}), so the reconciliation
-- engine and the golden record can match on price / surface / seller
-- identity instead of address alone.
--
--   - seller_contacts : array of seller-side parties (VENDEUR / MANDANT…)
--       [{ role, fullName, firstName, lastName, email, phone, address,
--          isCompany }]. RGPD-sensitive (owner PII) → service_role only.
--   - property_price   : headline contract price (offre_prix for offers,
--       prix_vente_total for mandates…), in euros.
--   - living_area      : Loi Carrez / living area in m² from the
--       BIEN_VENDU record.
--
-- Idempotent: safe to re-apply.

begin;

alter table public.mynotary_signed_documents
  add column if not exists seller_contacts jsonb not null default '[]'::jsonb,
  add column if not exists property_price numeric,
  add column if not exists living_area numeric;

alter table public.mynotary_signed_documents
  drop constraint if exists chk_mynotary_signed_documents_seller_contacts_array;
alter table public.mynotary_signed_documents
  add constraint chk_mynotary_signed_documents_seller_contacts_array
  check (jsonb_typeof(seller_contacts) = 'array');

comment on column public.mynotary_signed_documents.seller_contacts is
  'Seller-side parties parsed from the MyNotary operation records '
  '(VENDEUR / MANDANT…): [{role, fullName, firstName, lastName, email, '
  'phone, address, isCompany}]. RGPD-sensitive PII — service_role only.';

comment on column public.mynotary_signed_documents.property_price is
  'Headline contract price in euros (offre_prix for offers, '
  'prix_vente_total for mandates). Used by the reconciliation engine.';

comment on column public.mynotary_signed_documents.living_area is
  'Living area / Loi Carrez surface in m² parsed from the BIEN_VENDU '
  'record. Used by the reconciliation engine.';

commit;
