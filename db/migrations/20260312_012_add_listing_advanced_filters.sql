alter table public.properties
  add column if not exists floor int2,
  add column if not exists has_terrace boolean,
  add column if not exists has_elevator boolean;

alter table public.property_listings
  add column if not exists floor int2,
  add column if not exists has_terrace boolean,
  add column if not exists has_elevator boolean;

create index if not exists idx_property_listings_rooms_surface
on public.property_listings (rooms, living_area);

create index if not exists idx_property_listings_floor
on public.property_listings (floor);

create index if not exists idx_property_listings_terrace
on public.property_listings (has_terrace);

create index if not exists idx_property_listings_elevator
on public.property_listings (has_elevator);
