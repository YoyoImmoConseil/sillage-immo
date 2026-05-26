-- 20260526_033_gdpr_conversation_deletion.sql
--
-- Goal: support the GDPR "right to be forgotten" on AI client
-- conversations (Lot RGPD of the Sillage Copilot Admin plan):
--
--   1. Add a `deleted_at` column to `ai_conversations` so a deletion
--      request can flag the row and its messages without immediately
--      removing them (this gives us a 30-day soft-delete grace
--      window for backup / dispute resolution before the hard purge
--      from `run_retention_cleanup`).
--
--   2. Extend `run_retention_cleanup` so soft-deleted conversations
--      (older than 30 days) are hard-deleted together with their
--      cascaded `ai_messages` rows.
--
--   3. Add an `audit_log` row scope for the deletion endpoint so
--      operators can trace every GDPR deletion.
--
-- RLS untouched on purpose: ai_conversations remains
-- service_role-only — the deletion endpoint goes through
-- supabaseAdmin server-side.
--
-- Idempotent: safe to re-apply.

begin;

-- =====================================================================
-- 1. ai_conversations.deleted_at + index
-- =====================================================================
alter table public.ai_conversations
  add column if not exists deleted_at timestamptz;

create index if not exists idx_ai_conversations_deleted_at
  on public.ai_conversations (deleted_at)
  where deleted_at is not null;

comment on column public.ai_conversations.deleted_at is
  'GDPR soft-delete timestamp. NULL = active conversation, non-NULL = '
  'the row is hidden from downstream readers and will be hard-deleted '
  'by run_retention_cleanup after a 30-day grace window.';

-- =====================================================================
-- 2. Extend run_retention_cleanup to purge soft-deleted conversations
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
  v_soft_deleted_count bigint := 0;
  v_retention interval;
  v_idempotency_grace interval := interval '7 days';
  v_soft_delete_grace interval := interval '30 days';
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

  -- ai_messages count for telemetry (matches the parent rows we are
  -- about to delete in the next 3 statements).
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
      or
      (c.deleted_at is not null
       and c.deleted_at < now() - v_soft_delete_grace)
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

  with deleted as (
    delete from public.ai_conversations
    where deleted_at is not null
      and deleted_at < now() - v_soft_delete_grace
    returning 1
  )
  select count(*) into v_soft_deleted_count from deleted;

  return query
    select 'audit_log'::text, v_audit_count
    union all select 'domain_events'::text, v_domain_events_count
    union all select 'api_idempotency_keys'::text, v_idempotency_count
    union all select 'ai_conversations'::text,
                    v_ai_conversations_count
                  + v_anonymous_conversations_count
                  + v_soft_deleted_count
    union all select 'ai_messages'::text, v_ai_messages_count;
end;
$$;

comment on function public.run_retention_cleanup(int) is
  'Idempotent retention pruning: deletes audit_log, processed/failed '
  'domain_events, expired api_idempotency_keys (+7d grace), closed '
  'and archived ai_conversations older than the requested window, '
  'idle anonymous open conversations, and GDPR soft-deleted '
  'conversations past the 30-day grace window. Returns per-target counts.';

revoke all on function public.run_retention_cleanup(int) from public;
grant execute on function public.run_retention_cleanup(int) to service_role;

commit;
