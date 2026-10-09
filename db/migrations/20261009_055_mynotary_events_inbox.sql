-- =====================================================================
-- 20261009_055_mynotary_events_inbox.sql
--
-- Étape 1 du chantier « registre des dossiers » : la table
-- `mynotary_events` devient la boîte de réception des webhooks MyNotary.
--
--   1. Colonnes de file d'attente sur `mynotary_events` :
--      - event_created_at : en-tête x-mynotary-event-creation-time, qui
--        fixe l'ORDRE de traitement (les événements n'arrivent pas dans
--        l'ordre) ;
--      - status : pending → processing → processed | ignored | error ;
--      - attempts / locked_at : reprise et verrou de traitement ;
--      - event_id reste l'en-tête x-mynotary-event-id (UNIQUE) : la base
--        fait la déduplication, un doublon est ignoré et renvoie 2xx.
--   2. Fonction `claim_mynotary_events(limit)` : réservation atomique
--      (FOR UPDATE SKIP LOCKED) d'un lot d'événements à traiter, dans
--      l'ordre d'event_created_at — appelée par le traitement différé
--      (after() du handler + cron), jamais par la requête webhook.
--   3. Table `mynotary_files` : un enregistrement par fichier signé
--      (file_id MyNotary, jamais d'URL signée) avec son échéance
--      d'archivage (signed_at + 9 ans 6 mois), sa copie locale et son
--      dernier échec. La copie immédiate à réception remplit
--      archived_at / storage_path ; la tâche mensuelle rattrape ce qui
--      arrive à échéance sans copie.
--
-- RLS : service uniquement (RLS activée, aucune policy, droits révoqués
-- pour anon / authenticated) — les payloads contiennent des liens
-- signés et des données personnelles ; ni l'admin ni l'Espace Sillage
-- n'y accèdent directement.
--
-- Idempotent : réapplicable sans effet de bord.
-- =====================================================================

begin;

-- 1. mynotary_events : colonnes de file d'attente -----------------------
alter table public.mynotary_events
  add column if not exists event_created_at timestamptz,
  add column if not exists status text not null default 'pending',
  add column if not exists attempts integer not null default 0,
  add column if not exists locked_at timestamptz;

alter table public.mynotary_events
  drop constraint if exists chk_mynotary_events_status;
alter table public.mynotary_events
  add constraint chk_mynotary_events_status
    check (status in ('pending', 'processing', 'processed', 'ignored', 'error'));

-- Lignes antérieures (journal brut de l'ancien handler) : statut déduit.
update public.mynotary_events
set status = case
  when processed_at is not null and error is null then 'processed'
  when error is not null then 'error'
  else 'pending'
end
where status = 'pending' and (processed_at is not null or error is not null);

create index if not exists idx_mynotary_events_queue
  on public.mynotary_events (event_created_at nulls last, received_at)
  where status in ('pending', 'error');

comment on table public.mynotary_events is
  'Boîte de réception des webhooks MyNotary. event_id = en-tête '
  'x-mynotary-event-id (UNIQUE, déduplication par la base). Le handler '
  'HTTP ne fait qu''insérer ; le traitement (projection vers '
  'mynotary_signed_documents puis, à l''étape 3, vers les dossiers) est '
  'différé et ordonné par event_created_at. Accès service uniquement.';
comment on column public.mynotary_events.event_created_at is
  'En-tête x-mynotary-event-creation-time : date de l''événement chez MyNotary, ordre de traitement.';
comment on column public.mynotary_events.status is
  'pending → processing → processed | ignored | error. Un événement en error est repris tant que attempts < plafond.';

revoke all on public.mynotary_events from anon, authenticated;

-- 2. Réservation atomique d'un lot à traiter ----------------------------
create or replace function public.claim_mynotary_events(
  p_limit integer default 10,
  p_max_attempts integer default 5,
  p_stale_lock_minutes integer default 15
)
returns setof public.mynotary_events
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with candidates as (
    select e.id
    from public.mynotary_events e
    where (
        e.status in ('pending', 'error')
        -- verrou abandonné (crash pendant le traitement) : repris après délai
        or (e.status = 'processing'
            and e.locked_at < now() - make_interval(mins => p_stale_lock_minutes))
      )
      and e.attempts < p_max_attempts
    order by e.event_created_at asc nulls last, e.received_at asc
    limit greatest(p_limit, 1)
    for update skip locked
  )
  update public.mynotary_events e
  set status = 'processing',
      attempts = e.attempts + 1,
      locked_at = now(),
      error = null
  from candidates c
  where e.id = c.id
  returning e.*;
end;
$$;

revoke all on function public.claim_mynotary_events(integer, integer, integer) from public, anon, authenticated;
grant execute on function public.claim_mynotary_events(integer, integer, integer) to service_role;

-- 3. mynotary_files : fichiers signés et échéances d'archivage ----------
create table if not exists public.mynotary_files (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Identifiant MyNotary du fichier (signedFileId / fileId). Jamais d'URL.
  file_id text not null,
  signed_document_id uuid references public.mynotary_signed_documents(id) on delete set null,
  mynotary_contract_id text,
  mynotary_operation_id text,
  name text,
  kind text not null default 'signed',

  signed_at timestamptz not null,
  -- Rétention MyNotary : 10 ans. On archive chez Sillage à 9 ans 6 mois
  -- pour n'archiver que ce qui approche de l'échéance.
  archive_due_at timestamptz generated always as (signed_at + interval '9 years 6 months') stored,
  archived_at timestamptz,
  storage_bucket text,
  storage_path text,
  archive_attempts integer not null default 0,
  last_error text,
  last_attempt_at timestamptz,

  constraint uq_mynotary_files_file_id unique (file_id),
  constraint chk_mynotary_files_kind check (kind in ('signed', 'proof', 'validated', 'other'))
);

create index if not exists idx_mynotary_files_archive_due
  on public.mynotary_files (archive_due_at)
  where archived_at is null;

create index if not exists idx_mynotary_files_document
  on public.mynotary_files (signed_document_id)
  where signed_document_id is not null;

create or replace function public.set_mynotary_files_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_mynotary_files_updated_at on public.mynotary_files;
create trigger trg_mynotary_files_updated_at
  before update on public.mynotary_files
  for each row
  execute function public.set_mynotary_files_updated_at();

alter table public.mynotary_files enable row level security;
revoke all on public.mynotary_files from anon, authenticated;

comment on table public.mynotary_files is
  'Un enregistrement par fichier MyNotary (signé, preuve, validé) : file_id '
  'permanent, échéance d''archivage (signed_at + 9 ans 6 mois), copie locale '
  'dans le bucket mynotary-archives. Jamais d''URL signée. Service uniquement.';

commit;
