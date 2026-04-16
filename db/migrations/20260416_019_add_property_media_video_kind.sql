do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'chk_property_media_kind_values'
      and conrelid = 'public.property_media'::regclass
  ) then
    alter table public.property_media
      drop constraint chk_property_media_kind_values;
  end if;

  alter table public.property_media
    add constraint chk_property_media_kind_values
    check (kind in ('image', 'plan', 'document', 'video'));
end
$$;
