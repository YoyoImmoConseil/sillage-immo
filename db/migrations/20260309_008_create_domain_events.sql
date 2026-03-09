create table if not exists public.domain_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  occurred_at timestamptz not null default now(),
  aggregate_type text not null,
  aggregate_id uuid not null,
  event_name text not null,
  event_version int2 not null default 1,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  attempts int2 not null default 0,
  last_error text,
  published_at timestamptz
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'chk_domain_events_status_values'
  ) then
    alter table public.domain_events
      add constraint chk_domain_events_status_values
      check (status in ('pending', 'processed', 'failed'));
  end if;
end
$$;

alter table public.domain_events enable row level security;

create index if not exists idx_domain_events_status_created_at
on public.domain_events (status, created_at asc);

create index if not exists idx_domain_events_aggregate_created_at
on public.domain_events (aggregate_type, aggregate_id, created_at desc);
