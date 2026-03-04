alter table public.seller_leads enable row level security;

create policy "seller_leads_insert_public"
  on public.seller_leads
  for insert
  to public
  with check (true);
