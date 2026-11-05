-- Réactivation de la base dormante SweepBright (06/11/2026).
--
-- Une ligne par contact importé de SweepBright pour la campagne de
-- requalification par e-mail (tunnel J0 / J+7 / J+21, boutons trackés
-- /suivi/<jeton>?r=…). Ces contacts ne sont pas des leads du site : ils
-- vivent dans leur propre table, et seuls ceux qui répondent « je vends » ou
-- « sa valeur » sont promus en seller_lead (colonne seller_lead_id).
--
-- status : pending (à envoyer) · sent (séquence en cours) · responded ·
--          dormant (fin de séquence sans clic) · excluded · bounced ·
--          unsubscribed
-- sequence_step : 0 rien envoyé · 1 J0 envoyé · 2 rappel J+7 envoyé ·
--                 3 dernier mail J+21 envoyé

begin;

create table if not exists public.reactivation_contacts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  campaign text not null default 'reac-proprietaires-2026-11',
  segment text not null,
  sweepbright_contact_id text not null,
  sweepbright_type text,
  sweepbright_created_at timestamptz,
  sweepbright_labels text[] not null default '{}',
  negotiator text,

  first_name text,
  last_name text,
  full_name text,
  email text not null,
  normalized_email text not null,
  phone text,

  status text not null default 'pending',
  exclude_reason text,
  subject_variant text,
  sequence_step smallint not null default 0,
  sent_count integer not null default 0,
  first_sent_at timestamptz,
  last_sent_at timestamptz,
  next_send_at timestamptz,

  response text,
  responded_at timestamptz,
  response_history jsonb not null default '[]'::jsonb,
  seller_lead_id uuid references public.seller_leads (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,

  constraint reactivation_contacts_status_check check (
    status in ('pending', 'sent', 'responded', 'dormant', 'excluded', 'bounced', 'unsubscribed')
  ),
  constraint reactivation_contacts_segment_check check (
    segment in ('v1_proprietaire', 'v3_client', 'a1_acquereur', 'a2_ancien')
  ),
  constraint reactivation_contacts_step_check check (sequence_step between 0 and 3)
);

create unique index if not exists reactivation_contacts_campaign_sb_id_idx
  on public.reactivation_contacts (campaign, sweepbright_contact_id);
create unique index if not exists reactivation_contacts_campaign_email_idx
  on public.reactivation_contacts (campaign, normalized_email);
create index if not exists reactivation_contacts_send_queue_idx
  on public.reactivation_contacts (campaign, status, next_send_at, sweepbright_created_at);
create index if not exists reactivation_contacts_responded_idx
  on public.reactivation_contacts (campaign, responded_at desc) where responded_at is not null;

alter table public.reactivation_contacts enable row level security;
-- Accès serveur uniquement (clé service) : aucune politique publique.

create or replace function public.reactivation_contacts_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists reactivation_contacts_touch_updated_at on public.reactivation_contacts;
create trigger reactivation_contacts_touch_updated_at
  before update on public.reactivation_contacts
  for each row execute function public.reactivation_contacts_touch_updated_at();

commit;
