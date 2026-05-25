-- 20260525_028_retention_cleanup.sql
--
-- Goal:
--   Single, idempotent retention entry point: `public.run_retention_cleanup`.
--   90 days is the agreed retention window (see scoping notes); the
--   function takes it as a parameter so we can dry-run a different value
--   from the admin console without redeploying.
--
--   What it prunes:
--     - audit_log         older than retention_days
--     - domain_events     where status in ('processed','failed') and
--                         older than retention_days
--     - api_idempotency_keys whose expires_at is more than 7 days in the
--                            past (idempotency replays are useless once
--                            the TTL has expired, no need to keep them
--                            indefinitely)
--     - ai_messages       orphaned by archived/closed conversations whose
--                         ended_at (or created_at fallback) is older than
--                         retention_days. We cascade by deleting the
--                         parent ai_conversation, which propagates to
--                         ai_messages via ON DELETE CASCADE.
--
--   Returns one row per target with the number of rows deleted, so the
--   caller can log it. Marked `security definer` to bypass the RLS
--   policies (this is a privileged maintenance job invoked by cron or
--   the admin console).
--
-- Idempotent: safe to re-apply.

begin;

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
  -- here regardless of age — they may simply be quiet, not abandoned.
  with msg_count as (
    select count(*)::bigint as c
    from public.ai_messages m
    join public.ai_conversations c on c.id = m.conversation_id
    where c.status in ('closed', 'archived')
      and coalesce(c.ended_at, c.created_at) < now() - v_retention
  )
  select c into v_ai_messages_count from msg_count;

  with deleted as (
    delete from public.ai_conversations
    where status in ('closed', 'archived')
      and coalesce(ended_at, created_at) < now() - v_retention
    returning 1
  )
  select count(*) into v_ai_conversations_count from deleted;

  return query
    select 'audit_log'::text, v_audit_count
    union all select 'domain_events'::text, v_domain_events_count
    union all select 'api_idempotency_keys'::text, v_idempotency_count
    union all select 'ai_conversations'::text, v_ai_conversations_count
    union all select 'ai_messages'::text, v_ai_messages_count;
end;
$$;

comment on function public.run_retention_cleanup(int) is
  'Idempotent retention pruning: deletes audit_log, processed/failed '
  'domain_events, expired api_idempotency_keys (+7d grace) and ai_* '
  'conversations older than the requested window. Returns per-target '
  'counts. security definer: callable by service_role only.';

revoke all on function public.run_retention_cleanup(int) from public;
grant execute on function public.run_retention_cleanup(int) to service_role;

commit;
