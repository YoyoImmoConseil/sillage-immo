alter table public.leads enable row level security;

create policy "leads_insert_public"
  on public.leads
  for insert
  to public
  with check (true);
