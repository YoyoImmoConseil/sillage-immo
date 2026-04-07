# Runbook Release Main (Client Space)

Ce document prepare le passage du lot `client-space` / `solidify data model` de `staging` vers `main`.

## 1. Perimetre Exact De Release

Source de release attendue : branche `staging`.

Constat git au moment de la preparation :

- `staging` est propre localement.
- `staging` est en avance sur `main`.
- `git diff --stat main...staging` remonte 93 fichiers modifies pour plus de 10k lignes ajoutees.

Commits structurants a embarquer :

- `9e9577a` `feat: add admin seller client space workflows`
- `82024c2` `fix: harden seller client space staging flows`
- `366e48e` `feat: add seller portal access foundation`
- `1abfca6` `feat: harden seller portal and prepare multi-project hub`
- `5e8983b` `fix: backfill seller portal access during login`
- `5e1ca97` `fix: restore seller hub address and valuation summary`
- `6631620` `feat: solidify client identity and project data model`

Surfaces applicatives sensibles incluses dans la release :

- Admin auth Google et synchro session :
  - `/Users/yoannuzzan/sillage-immo-workspace/sillage-immo/app/admin/login/login-form.tsx`
  - `/Users/yoannuzzan/sillage-immo-workspace/sillage-immo/app/auth/callback/page-content.tsx`
  - `/Users/yoannuzzan/sillage-immo-workspace/sillage-immo/app/api/admin/auth/session/route.ts`
  - `/Users/yoannuzzan/sillage-immo-workspace/sillage-immo/lib/admin/auth.ts`
- Portail client vendeur / invitation / magic link :
  - `/Users/yoannuzzan/sillage-immo-workspace/sillage-immo/app/espace-client/_components/seller-magic-link-form.tsx`
  - `/Users/yoannuzzan/sillage-immo-workspace/sillage-immo/app/espace-client/auth/confirm/route.ts`
  - `/Users/yoannuzzan/sillage-immo-workspace/sillage-immo/services/clients/client-portal-login.service.ts`
  - `/Users/yoannuzzan/sillage-immo-workspace/sillage-immo/services/clients/seller-portal.service.ts`
- Data model et backfills :
  - `/Users/yoannuzzan/sillage-immo-workspace/sillage-immo/services/contacts/contact-identity.service.ts`
  - `/Users/yoannuzzan/sillage-immo-workspace/sillage-immo/services/properties/estimation-property.service.ts`
  - `/Users/yoannuzzan/sillage-immo-workspace/sillage-immo/services/valuation/valuation-record.service.ts`
  - `/Users/yoannuzzan/sillage-immo-workspace/sillage-immo/services/clients/buyer-project.service.ts`
- Migrations / schema :
  - `/Users/yoannuzzan/sillage-immo-workspace/sillage-immo/db/migrations/20260318_015_create_client_space_lot1.sql`
  - `/Users/yoannuzzan/sillage-immo-workspace/sillage-immo/db/migrations/20260319_016_harden_client_space_invariants.sql`
  - `/Users/yoannuzzan/sillage-immo-workspace/sillage-immo/db/migrations/20260326_017_secure_client_space_portal_rls.sql`
  - `/Users/yoannuzzan/sillage-immo-workspace/sillage-immo/db/migrations/20260402_018_solidify_data_model.sql`
  - `/Users/yoannuzzan/sillage-immo-workspace/sillage-immo/db/install.sql`

Decision de perimetre avant merge :

1. Faire `git fetch origin`.
2. Refaire `git diff --stat origin/main...origin/staging`.
3. Refaire `git log --oneline origin/main..origin/staging`.
4. Verifier qu'aucun commit de debug ou de staging-only non voulu n'est present.
5. Si besoin, preferer une PR `staging -> main` avec review plutot qu'un merge direct.

## 2. Preflight Production Avant SQL

Verifier que la prod dispose soit d'un acces SQL Editor, soit d'un acces Postgres direct.

Verifier l'etat de production avant application des migrations :

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'client_profiles',
    'client_projects',
    'seller_projects',
    'project_properties',
    'client_project_events',
    'contact_identities',
    'buyer_projects',
    'valuations'
  )
order by table_name;
```

```sql
select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'seller_leads' and column_name = 'contact_identity_id')
    or (table_name = 'buyer_leads' and column_name = 'contact_identity_id')
    or (table_name = 'client_profiles' and column_name = 'contact_identity_id')
    or (table_name = 'buyer_search_profiles' and column_name = 'client_project_id')
  )
order by table_name, column_name;
```

Verifier les collisions potentielles sur les phones normalises avant `018` :

```sql
with all_contacts as (
  select lower(cp.email) as normalized_email,
         nullif(regexp_replace(coalesce(cp.phone, ''), '[^0-9+]', '', 'g'), '') as normalized_phone,
         'client_profiles' as source_name
  from public.client_profiles cp
  where cp.email is not null and length(btrim(cp.email)) > 0
  union all
  select lower(bl.email),
         nullif(regexp_replace(coalesce(bl.phone, ''), '[^0-9+]', '', 'g'), ''),
         'buyer_leads'
  from public.buyer_leads bl
  where bl.email is not null and length(btrim(bl.email)) > 0
  union all
  select lower(sl.email),
         nullif(regexp_replace(coalesce(sl.phone, ''), '[^0-9+]', '', 'g'), ''),
         'seller_leads'
  from public.seller_leads sl
  where sl.email is not null and length(btrim(sl.email)) > 0
)
select normalized_phone, count(*) as row_count
from all_contacts
where normalized_phone is not null
group by normalized_phone
having count(*) > 1
order by row_count desc, normalized_phone asc;
```

Si cette requete remonte des doublons pertinents, corriger avant `018` ou assumer une strategie de nettoyage en amont.

## 3. Ordre D'Application Des Migrations Production

L'ordre doit rester strict :

1. `20260318_015_create_client_space_lot1.sql`
2. `20260319_016_harden_client_space_invariants.sql`
3. `20260326_017_secure_client_space_portal_rls.sql`
4. `20260402_018_solidify_data_model.sql`

Regles d'execution :

1. Stopper a la premiere erreur.
2. Ne pas deployer l'app `main` tant que les 4 migrations ne sont pas passees.
3. Garder `/Users/yoannuzzan/sillage-immo-workspace/sillage-immo/db/install.sql` comme schema cible de reference.
4. Si la prod a deja une partie du lot, reutiliser les scripts tels quels : ils ont ete ecrits de facon idempotente.

## 4. Verifications SQL Juste Apres Migration

Verifier la presence des nouvelles tables :

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('contact_identities', 'buyer_projects', 'valuations')
order by table_name;
```

Verifier la presence des nouvelles colonnes :

```sql
select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'seller_leads' and column_name = 'contact_identity_id')
    or (table_name = 'buyer_leads' and column_name = 'contact_identity_id')
    or (table_name = 'client_profiles' and column_name = 'contact_identity_id')
    or (table_name = 'buyer_search_profiles' and column_name = 'client_project_id')
  )
order by table_name, column_name;
```

Verifier les volumes minimaux attendus :

```sql
select 'contact_identities' as name, count(*)::int as count from public.contact_identities
union all
select 'buyer_projects', count(*)::int from public.buyer_projects
union all
select 'valuations', count(*)::int from public.valuations
union all
select 'seller_leads_with_contact_identity', count(*)::int from public.seller_leads where contact_identity_id is not null
union all
select 'buyer_leads_with_contact_identity', count(*)::int from public.buyer_leads where contact_identity_id is not null
union all
select 'client_profiles_with_contact_identity', count(*)::int from public.client_profiles where contact_identity_id is not null
union all
select 'buyer_search_profiles_with_project', count(*)::int from public.buyer_search_profiles where client_project_id is not null
union all
select 'properties_from_seller_estimation', count(*)::int from public.properties where source = 'seller_estimation'
union all
select 'seller_projects_with_latest_valuation', count(*)::int from public.seller_projects where latest_valuation_id is not null;
```

Verifier qu'aucune erreur RLS evidente n'apparait ensuite sur les parcours portail/admin.

## 5. Configuration Production A Geler

### Vercel

Variables a verifier sur l'environnement de production :

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_API_KEY`
- `RESEND_API_KEY`
- `EMAIL_FROM_EMAIL`
- `EMAIL_FROM_NAME`
- `PUBLIC_SITE_URL`
- `DOMAIN_EVENTS_CRON_SECRET` si utilise

Points de controle :

- `NEXT_PUBLIC_SUPABASE_URL` doit pointer vers le projet Supabase prod, jamais vers `ywmafyhnbcfsscyezoux`.
- `PUBLIC_SITE_URL` doit etre l'URL canonique de production.
- Les secrets mail et admin doivent etre propres a la prod.

### Supabase Auth

Verifier :

- `Site URL` alignee avec l'URL de prod.
- `Redirect URLs` contenant :
  - `https://<prod-domain>/auth/callback`
  - `https://<prod-domain>/espace-client/auth/confirm`
- Provider Google active pour l'admin.
- SMTP / envoi email fonctionnel pour les magic links client.

Le flux admin attend explicitement `window.location.origin + '/auth/callback'` dans :

- `/Users/yoannuzzan/sillage-immo-workspace/sillage-immo/app/admin/login/login-form.tsx`
- `/Users/yoannuzzan/sillage-immo-workspace/sillage-immo/app/api/admin/auth/google/route.ts`

Le flux client attend explicitement `window.location.origin + '/espace-client/auth/confirm'` dans :

- `/Users/yoannuzzan/sillage-immo-workspace/sillage-immo/app/espace-client/_components/seller-magic-link-form.tsx`
- `/Users/yoannuzzan/sillage-immo-workspace/sillage-immo/app/espace-client/auth/confirm/route.ts`

### Cookies / session admin

Le cookie `ADMIN_ACCESS_TOKEN_COOKIE` est pose en `httpOnly`, `secure`, `sameSite=lax` par :

- `/Users/yoannuzzan/sillage-immo-workspace/sillage-immo/app/api/admin/auth/session/route.ts`

Verifier en prod :

- HTTPS actif sur le domaine final.
- Aucun proxy ou redirect ne casse le cookie.
- Le retour Google arrive bien sur le meme host final que l'app admin.

## 6. Smoke Tests Go Live

Executer juste apres migration + deploiement app.

### Admin

1. Ouvrir `/admin/login`.
2. Cliquer `Continuer avec Google`.
3. Verifier le retour sur `/auth/callback`.
4. Verifier la redirection vers `/admin`.
5. Ouvrir une page admin protegee, par exemple `/admin/clients`.

### Seller

1. Lancer une estimation vendeur complete avec un email test neuf.
2. Verifier la creation en base de :
   - `seller_leads`
   - `client_profiles`
   - `client_projects`
   - `seller_projects`
   - `properties`
   - `project_properties`
   - `valuations`
3. Verifier sur le hub client :
   - adresse visible,
   - estimation visible,
   - detail projet avec bien rattache.

### Buyer

1. Soumettre un lead acquereur.
2. Verifier la creation en base de :
   - `buyer_leads`
   - `client_profiles`
   - `client_projects` type `buyer`
   - `buyer_projects`
   - `buyer_search_profiles` relies au projet
3. Verifier que le hub affiche un projet acquereur lisible.

### Invite Et Login

1. `prepare-login` sur un email seller existant sans `auth_user_id` doit renvoyer `mode=invite`.
2. `prepare-login` sur un email buyer existant sans `auth_user_id` doit renvoyer `mode=invite`.
3. `prepare-login` sur un client deja lie doit renvoyer `mode=login`.
4. Cliquer un magic link client et verifier :
   - succes du `verifyOtp`,
   - acceptation de l'invitation si `inviteToken`,
   - redirection finale vers `/espace-client`.

### Emails Et Redirections

Verifier :

- OTP vendeur recu et utilisable.
- Magic link client recu.
- Pas de redirection parasite vers Vercel login.
- Pas de redirection vers un host preview.

## 7. Sequence Operatoire Recommandee

1. Geler les merges sur `staging` et `main`.
2. Faire `git fetch origin`.
3. Revalider le diff `origin/main...origin/staging`.
4. Verifier la configuration prod Vercel + Supabase + Google.
5. Verifier les prechecks SQL production.
6. Appliquer les migrations `015 -> 016 -> 017 -> 018`.
7. Verifier les controles SQL post-migration.
8. Ouvrir la PR `staging -> main` ou merger selon le process retenu.
9. Deployer `main`.
10. Executer la smoke test go live.
11. Garder une surveillance rapprochee des logs Vercel et Supabase pendant la premiere fenetre de trafic.

## 8. Rollback Et Garde-Fous

Cas 1 : migration echoue avant deploiement app.

- Stop.
- Ne pas deployer `main`.
- Corriger la cause de migration.
- Rejouer uniquement apres diagnostic clair.

Cas 2 : migrations OK, app KO.

- Priorite au rollback applicatif Vercel vers le dernier deploy `main` stable.
- Ne pas tenter de rollback SQL destructif dans l'urgence.
- Corriger puis redeployer une app compatible avec le schema deja migre.

Cas 3 : probleme auth / callback / cookie.

- Verifier d'abord la configuration Supabase Auth, Google et Vercel.
- Corriger la config avant toute conclusion sur le code.
- Redeployer seulement si un correctif applicatif est necessaire.

Cas 4 : probleme RLS / portail vide.

- Verifier la presence de `client_profiles.auth_user_id`, des invitations et des liens `client_projects`.
- Verifier les policies renforcees par `017`.
- Prioriser le diagnostic de donnees et de liaisons avant toute modification de policy.
