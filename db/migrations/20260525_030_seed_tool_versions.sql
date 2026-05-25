-- 20260525_030_seed_tool_versions.sql
--
-- Goal:
--   Seed `public.tool_versions` with every MCP tool registered in
--   `lib/mcp/tools/`, so that `isRegisteredToolVersion` lets them
--   execute. Every entry is shipped at version 1.0.0 with
--   `lifecycle_status='active'` and `activated_at=now()`. Re-runs are
--   no-ops thanks to the unique constraint on (tool_name, tool_version).
--
-- Idempotent: safe to re-apply.

begin;

insert into public.tool_versions (tool_name, tool_version, lifecycle_status, activated_at, description)
values
  -- Legacy tools (untouched behaviour, just moved to lib/mcp/tools/)
  ('leads.create', '1.0.0', 'active', now(), 'Enregistre un lead entrant et retourne un statut.'),
  ('leads.score', '1.0.0', 'active', now(), 'Calcule un score de priorité pour un lead.'),
  ('seller_leads.create_or_reuse', '1.0.0', 'active', now(), 'Crée un lead vendeur ou réutilise un lead récent.'),
  ('seller_leads.score', '1.0.0', 'active', now(), 'Calcule le scoring vendeur et met à jour le lead.'),
  ('seller_leads.generate_ai_insight', '1.0.0', 'active', now(), 'Génère une analyse IA actionnable pour un lead vendeur.'),
  ('seller_leads.get_context', '1.0.0', 'active', now(), 'Retourne un contexte vendeur consolidé.'),
  ('seller_leads.enrich', '1.0.0', 'active', now(), 'Orchestre create_or_reuse + score + insight IA.'),
  ('home_assistant.get_context', '1.0.0', 'active', now(), 'Contexte global pour l''assistant homepage.'),

  -- Properties domain (read-only + listing publish/unpublish)
  ('properties.search', '1.0.0', 'active', now(), 'Recherche multi-critères sur les biens.'),
  ('properties.get', '1.0.0', 'active', now(), 'Récupère un bien par id ou slug.'),
  ('properties.list_recent', '1.0.0', 'active', now(), 'Liste les biens récemment mis à jour.'),
  ('property_listings.publish', '1.0.0', 'active', now(), 'Publie un listing.'),
  ('property_listings.unpublish', '1.0.0', 'active', now(), 'Dépublie un listing.'),
  ('property_visits.list_for_property', '1.0.0', 'active', now(), 'Liste les visites d''un bien (audience-aware).'),
  ('property_visits.list_for_seller_project', '1.0.0', 'active', now(), 'Liste les visites d''un seller_project.'),
  ('property_documents.list_for_property', '1.0.0', 'active', now(), 'Liste les documents d''un bien (audience-aware).'),

  -- Buyer domain
  ('buyer_leads.create_or_enrich', '1.0.0', 'active', now(), 'Crée/enrichit un buyer_lead + search profile + matching.'),
  ('buyer_leads.get_context', '1.0.0', 'active', now(), 'Contexte buyer consolidé.'),
  ('buyer_searches.upsert', '1.0.0', 'active', now(), 'Met à jour le search profile d''un buyer_lead.'),
  ('buyer_matching.recompute_for_lead', '1.0.0', 'active', now(), 'Recalcule les matches pour un buyer_lead.'),
  ('buyer_matching.recompute_for_property', '1.0.0', 'active', now(), 'Recalcule les matches pour une propriété.'),
  ('buyer_matching.list_for_lead', '1.0.0', 'active', now(), 'Liste les matches d''un buyer_lead.'),
  ('buyer_matching.list_for_property', '1.0.0', 'active', now(), 'Liste les buyer_leads matchés sur une propriété.'),

  -- Valuations + projects
  ('valuations.list_for_project', '1.0.0', 'active', now(), 'Liste les valuations d''un client_project.'),
  ('valuations.get_latest_for_project', '1.0.0', 'active', now(), 'Dernière valuation d''un client_project.'),
  ('client_projects.list', '1.0.0', 'active', now(), 'Liste les client_projects (filtres type/status).'),
  ('client_projects.get', '1.0.0', 'active', now(), 'Récupère un client_project + seller/buyer + properties.'),
  ('client_projects.timeline', '1.0.0', 'active', now(), 'Timeline d''un client_project (audience-aware).'),
  ('seller_projects.advance_status', '1.0.0', 'active', now(), 'Change le project_status d''un seller_project.'),
  ('seller_projects.assign_advisor', '1.0.0', 'active', now(), 'Assigne un admin à un seller_project.'),

  -- Contacts
  ('contacts.find_or_merge', '1.0.0', 'active', now(), 'Retourne (ou crée) un contact_identity unifié.'),

  -- AI
  ('ai.semantic_search', '1.0.0', 'active', now(), 'Recherche sémantique via pgvector (cosine).'),
  ('ai.embed_entity', '1.0.0', 'active', now(), 'Force l''embedding d''une entité (idempotent).'),

  -- Audit (read-only)
  ('audit.search', '1.0.0', 'active', now(), 'Recherche read-only dans audit_log.')
on conflict (tool_name, tool_version) do update
  set lifecycle_status = excluded.lifecycle_status,
      activated_at = coalesce(public.tool_versions.activated_at, excluded.activated_at),
      description = excluded.description;

commit;
