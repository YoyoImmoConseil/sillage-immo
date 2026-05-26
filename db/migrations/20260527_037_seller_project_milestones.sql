-- 20260527_037_seller_project_milestones.sql
--
-- Manual milestone fields on `seller_projects` so the agency can
-- backfill the historical state of pre-MyNotary projects:
--
--   - mandate_signed_at        (already added in 034)
--   - offer_received_at        NEW — date when an offer was received
--   - offer_buyer_lead_id      NEW — link to the offerer's buyer_lead
--   - offer_buyer_name         NEW — free-text fallback when no lead
--   - preliminary_sale_signed_at NEW — date of the compromis
--   - deed_signed_at           NEW — date of the acte authentique
--
-- The MyNotary inbound integration (webhook + backfill) already writes
-- `mandate_signed_at` when it matches a project with confidence >= 0.7.
-- This migration also extends the auto-match flow on the SQL side so
-- it can ALSO populate the new offer / preliminary_sale columns when
-- the matched MyNotary doc has that kind. (Wired in 038 — see service
-- layer for the application logic.)
--
-- The dashboard aggregator counts (MyNotary docs) ∪ (manual milestones)
-- de-duplicated per seller_project, so backfilling these columns lifts
-- the historical KPIs without double-counting current MyNotary
-- ingestion.
--
-- RLS: existing seller_projects policies still apply; the milestone
-- writes go through supabaseAdmin in `seller-project.service.ts` so no
-- new policy is required.
--
-- Seeds an MCP tool version for `seller_projects.milestones_stats`
-- shipped in the same PR.
--
-- Idempotent.

begin;

alter table public.seller_projects
  add column if not exists offer_received_at timestamptz,
  add column if not exists offer_buyer_lead_id uuid
    references public.buyer_leads(id) on delete set null,
  add column if not exists offer_buyer_name text,
  add column if not exists preliminary_sale_signed_at timestamptz,
  add column if not exists deed_signed_at timestamptz;

create index if not exists idx_seller_projects_offer_received_at
  on public.seller_projects (offer_received_at desc)
  where offer_received_at is not null;

create index if not exists idx_seller_projects_preliminary_sale_signed_at
  on public.seller_projects (preliminary_sale_signed_at desc)
  where preliminary_sale_signed_at is not null;

create index if not exists idx_seller_projects_deed_signed_at
  on public.seller_projects (deed_signed_at desc)
  where deed_signed_at is not null;

create index if not exists idx_seller_projects_offer_buyer_lead
  on public.seller_projects (offer_buyer_lead_id)
  where offer_buyer_lead_id is not null;

comment on column public.seller_projects.offer_received_at is
  'Date à laquelle une offre d''achat a été reçue (saisie manuelle ou propagée par MyNotary).';
comment on column public.seller_projects.offer_buyer_lead_id is
  'Lien optionnel vers le buyer_lead qui a soumis l''offre (pour relier le projet acquéreur).';
comment on column public.seller_projects.offer_buyer_name is
  'Nom libre de l''offrant lorsque la personne n''a pas encore de buyer_lead Sillage.';
comment on column public.seller_projects.preliminary_sale_signed_at is
  'Date de signature du compromis (saisie manuelle ou propagée par MyNotary).';
comment on column public.seller_projects.deed_signed_at is
  'Date de signature de l''acte authentique (saisie manuelle uniquement — pas encore d''équivalent MyNotary).';

-- Seed MCP tool version (rolled out in the same PR)
insert into public.tool_versions (tool_name, tool_version, lifecycle_status, activated_at, description)
values
  ('seller_projects.milestones_stats', '1.0.0', 'active', now(),
   'Agrège les jalons signés (mandat / offre / compromis / acte) par période, en union MyNotary + saisie manuelle.')
on conflict (tool_name, tool_version) do update
  set lifecycle_status = excluded.lifecycle_status,
      description = excluded.description,
      activated_at = coalesce(public.tool_versions.activated_at, excluded.activated_at);

commit;
