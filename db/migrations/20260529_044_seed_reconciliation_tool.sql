-- 20260529_044_seed_reconciliation_tool.sql
--
-- Réconciliation multi-sources — Phase 5. Seed the new MCP tool into
-- `tool_versions` so `isRegisteredToolVersion` lets the external MCP
-- endpoint execute it.
--
-- Idempotent: safe to re-apply.

begin;

insert into public.tool_versions (tool_name, tool_version, lifecycle_status, activated_at, description)
values
  ('reconciliation.get_unified_property', '1.0.0', 'active', now(),
   'Fiche bien + vendeur unifiée (golden record multi-sources : estimateur, SweepBright, MyNotary) d''un dossier vendeur, avec source retenue par champ, divergences et suggestions de réconciliation en attente.')
on conflict (tool_name, tool_version) do update
  set lifecycle_status = excluded.lifecycle_status,
      activated_at = coalesce(public.tool_versions.activated_at, excluded.activated_at),
      description = excluded.description;

commit;
