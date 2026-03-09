create table if not exists public.seller_scoring_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  seller_lead_id uuid not null references public.seller_leads(id) on delete cascade,
  score integer not null,
  segment text not null,
  next_best_action text not null,
  breakdown jsonb not null default '{}'::jsonb,
  reasons jsonb not null default '[]'::jsonb
);

alter table public.seller_scoring_events enable row level security;

drop policy if exists "seller_scoring_events_insert_authenticated" on public.seller_scoring_events;
create policy "seller_scoring_events_insert_authenticated"
  on public.seller_scoring_events
  for insert
  to authenticated
  with check (auth.uid() is not null);

create index if not exists idx_seller_scoring_events_lead_created_at
on public.seller_scoring_events (seller_lead_id, created_at desc);
