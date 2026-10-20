-- Fiche vitrine — lot 3 : archivage des affiches générées.
--
-- Chaque clic sur « Imprimer la fiche vitrine » produit un PDF A3 déposé dans
-- un bucket privé `vitrine-posters` et une ligne `vitrine_posters` qui garde
-- la trace : qui, quand, pour quel bien, avec quel contenu (instantané JSON du
-- texte de l'affiche : prix, mentions légales, DPE…). C'est la preuve de ce
-- qui a été affiché en vitrine à une date donnée, utile face à un contrôle
-- DGCCRF ou à une contestation sur un prix.
--
-- RLS activée sans policy : accès `service_role` uniquement, comme les autres
-- tables de service. Les liens de téléchargement sont des URL signées (7 jours
-- dans le mail, 1 heure dans l'admin) générées côté serveur.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vitrine-posters',
  'vitrine-posters',
  false,
  20 * 1024 * 1024,  -- 20 Mo : un A3 avec deux photos plafonnées à 3 500 px pèse 2 à 5 Mo.
  array['application/pdf']::text[]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'vitrine_posters_service_role_rw'
  ) then
    execute $POLICY$
      create policy vitrine_posters_service_role_rw
        on storage.objects
        for all
        to service_role
        using (bucket_id = 'vitrine-posters')
        with check (bucket_id = 'vitrine-posters');
    $POLICY$;
  end if;
end$$;

create table if not exists public.vitrine_posters (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  property_id uuid not null references public.properties(id) on delete cascade,
  storage_bucket text not null default 'vitrine-posters',
  storage_path text not null,
  file_name text not null,
  file_size integer not null,
  -- Instantané du contenu affiché (VitrinePosterContent) : preuve de ce qui a
  -- été imprimé.
  content jsonb not null default '{}'::jsonb,
  warnings text[] not null default '{}'::text[],
  generated_by text,
  email_sent_to text,
  email_error text
);

create index if not exists idx_vitrine_posters_property_created
  on public.vitrine_posters (property_id, created_at desc);

alter table public.vitrine_posters enable row level security;
revoke all on public.vitrine_posters from anon, authenticated;

comment on table public.vitrine_posters is
  'Affiches vitrine A3 générées par le site : fichier dans le bucket vitrine-posters + instantané du contenu.';

commit;
