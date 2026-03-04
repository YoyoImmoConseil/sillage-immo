alter table public.tool_versions
  add column if not exists lifecycle_status text;

alter table public.tool_versions
  add column if not exists activated_at timestamptz;

alter table public.tool_versions
  add column if not exists deprecated_at timestamptz;

update public.tool_versions
set lifecycle_status = 'active'
where lifecycle_status is null;

alter table public.tool_versions
  alter column lifecycle_status set default 'active';

alter table public.tool_versions
  alter column lifecycle_status set not null;

update public.tool_versions
set activated_at = created_at
where lifecycle_status = 'active'
  and activated_at is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_tool_versions_lifecycle_status_values'
  ) then
    alter table public.tool_versions
      add constraint chk_tool_versions_lifecycle_status_values
      check (lifecycle_status in ('draft', 'active', 'deprecated'));
  end if;
end
$$;

create index if not exists idx_tool_versions_lifecycle_status
on public.tool_versions (lifecycle_status);
