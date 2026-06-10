-- Rate limiting persistant (multi-instances serverless).
-- Compteurs a fenetre fixe, manipules atomiquement via la fonction
-- rate_limit_hit() appelee par lib/rate-limit/persistent.ts avec la
-- service role key (aucune policy RLS : la table n'est pas exposee).

create table if not exists public.rate_limit_counters (
  key text primary key,
  count integer not null default 0,
  window_expires_at timestamptz not null
);

create index if not exists rate_limit_counters_expires_idx
  on public.rate_limit_counters (window_expires_at);

alter table public.rate_limit_counters enable row level security;

create or replace function public.rate_limit_hit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns table (allowed boolean, remaining integer, reset_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_row public.rate_limit_counters%rowtype;
begin
  insert into public.rate_limit_counters as r (key, count, window_expires_at)
  values (p_key, 1, v_now + make_interval(secs => p_window_seconds))
  on conflict (key) do update
    set count = case
          when r.window_expires_at <= v_now then 1
          else r.count + 1
        end,
        window_expires_at = case
          when r.window_expires_at <= v_now
            then v_now + make_interval(secs => p_window_seconds)
          else r.window_expires_at
        end
  returning r.* into v_row;

  -- Nettoyage opportuniste (~1 appel sur 100) des fenetres expirees depuis
  -- plus d'un jour, pour eviter que la table ne grossisse indefiniment.
  if random() < 0.01 then
    delete from public.rate_limit_counters
    where window_expires_at < v_now - interval '1 day';
  end if;

  return query select
    v_row.count <= p_limit,
    greatest(p_limit - v_row.count, 0),
    v_row.window_expires_at;
end;
$$;

revoke all on function public.rate_limit_hit(text, integer, integer) from public;
revoke all on function public.rate_limit_hit(text, integer, integer) from anon;
revoke all on function public.rate_limit_hit(text, integer, integer) from authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;
