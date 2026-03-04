create table if not exists public.seller_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null,
  email text not null,
  phone text,
  property_type text,
  property_address text,
  city text,
  postal_code text,
  timeline text,
  occupancy_status text,
  estimated_price integer,
  diagnostics_ready boolean,
  diagnostics_support_needed boolean,
  syndic_docs_ready boolean,
  syndic_support_needed boolean,
  message text,
  source text,
  status text not null default 'new',
  metadata jsonb not null default '{}'::jsonb
);

alter table public.seller_leads enable row level security;

drop policy if exists "seller_leads_insert_public" on public.seller_leads;
create policy "seller_leads_insert_public"
  on public.seller_leads
  for insert
  to public
  with check (true);

create index if not exists idx_seller_leads_status_created_at
on public.seller_leads (status, created_at desc);
