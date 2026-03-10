create table if not exists public.api_idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  scope text not null,
  key_hash text not null,
  status_code int2,
  response_payload jsonb,
  expires_at timestamptz not null
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'uq_api_idempotency_scope_key_hash'
  ) then
    alter table public.api_idempotency_keys
      add constraint uq_api_idempotency_scope_key_hash
      unique (scope, key_hash);
  end if;
end
$$;

alter table public.api_idempotency_keys enable row level security;

create index if not exists idx_api_idempotency_expires_at
on public.api_idempotency_keys (expires_at asc);
