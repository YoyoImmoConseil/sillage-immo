-- 20260526_031_conversation_logger_lot0.sql
--
-- Goal: enable the cross-surface conversation logger (Lot 0):
--
--   1. Extend `entity_embeddings.chk_entity_embeddings_entity_type`
--      to allow `ai_conversation`. The embedding worker will use that
--      entity_type to attach 1536-dim OpenAI vectors to closed
--      conversations so `conversations.search` (semantic) becomes a
--      first-class MCP tool.
--
--   2. Extend `public.run_retention_cleanup` so anonymous home-assistant
--      conversations (status='open', entity_type='anonymous') that
--      have been idle for `retention_days` are also pruned, not just
--      closed/archived ones. Without this they would accumulate
--      forever since they are never explicitly closed.
--
--   3. Seed `public.tool_versions` for the two new MCP tools shipped
--      in this lot: `conversations.search` and `conversations.trends`.
--
-- RLS untouched on purpose: ai_conversations / ai_messages /
-- entity_embeddings remain service_role-only (see migration 027).
--
-- Idempotent: safe to re-apply.

begin;

-- =====================================================================
-- 1. entity_embeddings.entity_type: allow ai_conversation
-- =====================================================================
alter table public.entity_embeddings
  drop constraint if exists chk_entity_embeddings_entity_type;

alter table public.entity_embeddings
  add constraint chk_entity_embeddings_entity_type
  check (entity_type in (
    'property',
    'property_listing',
    'seller_lead',
    'buyer_lead',
    'client_project',
    'agency_knowledge',
    'ai_conversation'
  ));

-- =====================================================================
-- 2. run_retention_cleanup: prune idle anonymous conversations too
-- =====================================================================
create or replace function public.run_retention_cleanup(retention_days int default 90)
returns table (target text, deleted_count bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_audit_count bigint := 0;
  v_domain_events_count bigint := 0;
  v_idempotency_count bigint := 0;
  v_ai_conversations_count bigint := 0;
  v_ai_messages_count bigint := 0;
  v_anonymous_conversations_count bigint := 0;
  v_retention interval;
  v_idempotency_grace interval := interval '7 days';
begin
  if retention_days is null or retention_days < 1 then
    raise exception 'retention_days must be >= 1 (got %)', retention_days;
  end if;
  v_retention := make_interval(days => retention_days);

  with deleted as (
    delete from public.audit_log
    where created_at < now() - v_retention
    returning 1
  )
  select count(*) into v_audit_count from deleted;

  with deleted as (
    delete from public.domain_events
    where status in ('processed', 'failed')
      and created_at < now() - v_retention
    returning 1
  )
  select count(*) into v_domain_events_count from deleted;

  with deleted as (
    delete from public.api_idempotency_keys
    where expires_at < now() - v_idempotency_grace
    returning 1
  )
  select count(*) into v_idempotency_count from deleted;

  -- ai_messages are cascaded by deleting parent ai_conversations whose
  -- archive window has elapsed. We do NOT delete `open` conversations
  -- here regardless of age — they may simply be quiet, not abandoned —
  -- EXCEPT for entity_type='anonymous' conversations (home assistant /
  -- estimation flows from anonymous sessions): those naturally stay
  -- "open" but are abandoned after a few minutes, so we treat their
  -- `updated_at` as the truth signal and prune them too.
  with msg_count as (
    select count(*)::bigint as c
    from public.ai_messages m
    join public.ai_conversations c on c.id = m.conversation_id
    where (
      (c.status in ('closed', 'archived')
       and coalesce(c.ended_at, c.created_at) < now() - v_retention)
      or
      (c.status = 'open'
       and c.entity_type = 'anonymous'
       and c.updated_at < now() - v_retention)
    )
  )
  select c into v_ai_messages_count from msg_count;

  with deleted as (
    delete from public.ai_conversations
    where status in ('closed', 'archived')
      and coalesce(ended_at, created_at) < now() - v_retention
    returning 1
  )
  select count(*) into v_ai_conversations_count from deleted;

  with deleted as (
    delete from public.ai_conversations
    where status = 'open'
      and entity_type = 'anonymous'
      and updated_at < now() - v_retention
    returning 1
  )
  select count(*) into v_anonymous_conversations_count from deleted;

  return query
    select 'audit_log'::text, v_audit_count
    union all select 'domain_events'::text, v_domain_events_count
    union all select 'api_idempotency_keys'::text, v_idempotency_count
    union all select 'ai_conversations'::text,
                    v_ai_conversations_count + v_anonymous_conversations_count
    union all select 'ai_messages'::text, v_ai_messages_count;
end;
$$;

comment on function public.run_retention_cleanup(int) is
  'Idempotent retention pruning: deletes audit_log, processed/failed '
  'domain_events, expired api_idempotency_keys (+7d grace), closed '
  'and archived ai_conversations older than the requested window, '
  'plus idle anonymous open conversations. Returns per-target counts.';

revoke all on function public.run_retention_cleanup(int) from public;
grant execute on function public.run_retention_cleanup(int) to service_role;

-- =====================================================================
-- 3. Seed tool_versions for the new MCP tools (Lot 0)
-- =====================================================================
insert into public.tool_versions (tool_name, tool_version, lifecycle_status, activated_at, description)
values
  ('conversations.search', '1.0.0', 'active', now(),
   'Recherche sémantique pgvector dans ai_conversations (par entity_type/channel/date_range).'),
  ('conversations.trends', '1.0.0', 'active', now(),
   'Agrège volumes + topics dominants des ai_conversations sur une période (group_by topic|zone|channel|entity_type).')
on conflict (tool_name, tool_version) do update
  set lifecycle_status = excluded.lifecycle_status,
      activated_at = coalesce(public.tool_versions.activated_at, excluded.activated_at),
      description = excluded.description;

commit;
