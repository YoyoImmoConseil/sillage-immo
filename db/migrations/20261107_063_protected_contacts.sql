-- Contacts protégés (06/11/2026, règle permanente fixée par Yoann) :
-- aucune campagne de relance ne doit toucher un client qui a signé un mandat,
-- un avenant ou un compromis dans les 12 derniers mois (glissants).
--
-- La table est recalculée chaque jour depuis MyNotary (cron
-- /api/internal/cron/protected-contacts-sync) : une ligne par personne
-- (vendeur, bailleur, acquéreur) et par contrat signé, avec la date de
-- signature. Le service d'envoi la consulte au moment d'envoyer : un contact
-- protégé est sauté sans changer de statut, et redevient contactable de
-- lui-même quand la fenêtre de 12 mois est écoulée.

begin;

create table if not exists public.protected_contacts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  synced_at timestamptz not null default now(),

  source text not null default 'mynotary',
  contract_id text not null,
  contract_model text,
  operation_id text,
  operation_label text,
  operation_archived boolean not null default false,
  record_id text not null,
  role text not null,

  first_name text,
  last_name text,
  normalized_email text,
  normalized_name text,
  signed_at timestamptz not null,

  constraint protected_contacts_source_contract_record_key unique (source, contract_id, record_id)
);

create index if not exists protected_contacts_email_signed_idx
  on public.protected_contacts (normalized_email, signed_at desc)
  where normalized_email is not null;

create index if not exists protected_contacts_name_signed_idx
  on public.protected_contacts (normalized_name, signed_at desc)
  where normalized_name is not null;

alter table public.protected_contacts enable row level security;

commit;
