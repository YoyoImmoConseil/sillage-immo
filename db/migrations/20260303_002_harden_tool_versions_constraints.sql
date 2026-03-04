do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_tool_versions_tool_name_not_blank'
  ) then
    alter table public.tool_versions
      add constraint chk_tool_versions_tool_name_not_blank
      check (length(btrim(tool_name)) > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_tool_versions_tool_name_format'
  ) then
    alter table public.tool_versions
      add constraint chk_tool_versions_tool_name_format
      check (tool_name ~ '^[a-z][a-z0-9._-]*$');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_tool_versions_tool_version_not_blank'
  ) then
    alter table public.tool_versions
      add constraint chk_tool_versions_tool_version_not_blank
      check (length(btrim(tool_version)) > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_tool_versions_tool_version_semver'
  ) then
    alter table public.tool_versions
      add constraint chk_tool_versions_tool_version_semver
      check (
        tool_version ~ '^[0-9]+[.][0-9]+[.][0-9]+(-[0-9A-Za-z.-]+)?([+][0-9A-Za-z.-]+)?$'
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_tool_versions_changelog_object'
  ) then
    alter table public.tool_versions
      add constraint chk_tool_versions_changelog_object
      check (jsonb_typeof(changelog) = 'object');
  end if;
end
$$;
