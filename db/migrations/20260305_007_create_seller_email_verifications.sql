create table if not exists public.seller_email_verifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text not null,
  code_hash text not null,
  verification_token text not null,
  expires_at timestamptz not null,
  verified_at timestamptz,
  consumed_at timestamptz,
  attempts int2 not null default 0
);

create index if not exists idx_seller_email_verifications_email_created_at
on public.seller_email_verifications (email, created_at desc);
