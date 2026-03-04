alter table public.audit_log enable row level security;

create policy "audit_insert_authenticated"
  on public.audit_log
  for insert
  to authenticated
  with check (auth.uid() is not null);
