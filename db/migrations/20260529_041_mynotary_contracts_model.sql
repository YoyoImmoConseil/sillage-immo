-- 20260529_041_mynotary_contracts_model.sql
--
-- Phase-1 MyNotary integration pivot: switch the canonical data source
-- from the legal mandate register (`GET /register-entries`) to the
-- operations/contracts API (`GET /operations` -> embedded `contracts[]`
-- + `GET /contracts/{id}`), per MyNotary support (Rémy, 29/05/2026):
--
--   "/register-entries n'est pas l'endpoint approprié pour récupérer
--    les offres et compromis signés. [...] Pour le backfill historique,
--    l'endpoint GET /contracts (via /operations) est le bon point
--    d'entrée."
--
-- The register only tracks mandates (carte T regulatory ledger), so
-- purchase offers + preliminary sales were structurally invisible.
-- Operations expose every contract with a precise `status`
-- (SIGNATURE_COMPLETED = signed) and a machine `model` we classify.
--
-- This migration:
--   1. Widens `contract_kind` to store ALL signed contracts (sale +
--      rental/management/other) so the data is available to the MCP /
--      AI layer, while the dashboard KPI cards keep filtering on the
--      3 sale kinds only.
--   2. Widens `match_method` to accept the name-based methods shipped
--      in migration 040 / PR #51 (`name_exact`, `name_fuzzy`) — the
--      previous CHECK silently rejected those writes.
--   3. Soft-deletes the stale rows ingested from the old
--      register-entries path (they carry `mynotary_register_type`
--      and their `mynotary_contract_id` is a register entry id, not a
--      real contract id) so the operations-based backfill starts clean.

begin;

-- 1. contract_kind — sale kinds (KPI) + non-sale kinds (stored only).
alter table public.mynotary_signed_documents
  drop constraint if exists chk_mynotary_signed_documents_kind;

alter table public.mynotary_signed_documents
  add constraint chk_mynotary_signed_documents_kind
  check (
    contract_kind = any (
      array[
        -- sale side — surfaced in the /admin dashboard KPI cards
        'mandate'::text,
        'purchase_offer'::text,
        'preliminary_sale'::text,
        -- rental / management / misc — stored for MCP + AI, not in KPI
        'rental_mandate'::text,
        'lease'::text,
        'guarantee'::text,
        'management_mandate'::text,
        'other'::text
      ]
    )
  );

-- 2. match_method — align with the code (migration 040 added the
--    name-based matcher; the CHECK was never updated).
alter table public.mynotary_signed_documents
  drop constraint if exists chk_mynotary_signed_documents_match_method;

alter table public.mynotary_signed_documents
  add constraint chk_mynotary_signed_documents_match_method
  check (
    match_method is null
    or match_method = any (
      array[
        'email_exact'::text,
        'name_exact'::text,
        'address_exact'::text,
        'address_fuzzy'::text,
        'name_fuzzy'::text,
        'manual'::text,
        'none'::text
      ]
    )
  );

-- 3. Retire the phantom register-entry rows. They were keyed on the
--    register entry id and could never reconcile with a real contract
--    id, so they'd otherwise live forever as unmatched duplicates.
update public.mynotary_signed_documents
  set deleted_at = now()
  where deleted_at is null
    and mynotary_register_type is not null;

commit;
