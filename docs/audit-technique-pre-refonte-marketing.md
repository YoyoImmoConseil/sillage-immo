# Audit technique — état des lieux avant refonte marketing

**Date** : 31 juillet 2026
**Périmètre** : `sillage-immo` — Next.js 16.1.6 (App Router), React 19.2.3, Supabase, Tailwind 4
**Nature** : audit en lecture seule. Aucun fichier applicatif modifié, aucune correction appliquée.
**Objet** : inventaire factuel préalable à une refonte marketing additive, sous contrainte de zéro régression fonctionnelle.

Chaque élément est qualifié **existe** / **partiel** / **absent**, avec le chemin de fichier correspondant.

---

## Sommaire

1. [Routing](#1-routing)
2. [I18n](#2-i18n)
3. [Auth espace client (magic link)](#3-auth-espace-client-magic-link)
4. [Supabase](#4-supabase)
5. [Ingestion SweepBright](#5-ingestion-sweepbright)
6. [Home](#6-home)
7. [Tunnel d'estimation](#7-tunnel-destimation)
8. [Recherche dessinée](#8-recherche-dessinée)
9. [Feature flags](#9-feature-flags)
10. [SEO](#10-seo)
11. [Signalements](#signalements)

---

## 1. ROUTING

**Mécanisme de locale : existe** — `proxy.ts` (racine, pas de `middleware.ts`). Locales non-défaut préfixées (`/en`, `/es`, `/ru`) et **rewrite interne** vers le chemin nu ; `fr` sans préfixe. En-tête `x-sillage-locale` + cookie `sillage-locale` posés à chaque requête. Si une URL préfixée pointe vers un chemin exclu → `redirect`. Helpers : `lib/i18n/routing.ts`.

**Matcher : existe** — `["/((?!_next/static|_next/image).*)"]`. Préfixes exclus : `/api`, `/_next`, `/admin`, plus `/favicon.ico`, `/icon.png` et tout chemin avec extension.

**`next.config.ts`** — `redirects` : **absent**. `rewrites` : **absent**. Seul `images.remotePatterns`.

**Mode de rendu global** — `generateStaticParams` : **absent** (projet entier). `fetchCache` / `force-static` : **absent**. En pratique **toutes les routes sont dynamiques** (`ƒ` en sortie de build) car `app/layout.tsx` appelle `getRequestLocale()` (→ `cookies()` + `headers()`) et `getRequestPlatform()` (→ `headers()`).

### Pages publiques (10)

| Fichier | URL | Rendu déclaré | Locale |
|---|---|---|---|
| `app/page.tsx` | `/` | aucun | `getRequestLocale()` |
| `app/estimation/page.tsx` | `/estimation` | aucun | oui |
| `app/vente/page.tsx` | `/vente` | aucun | oui |
| `app/location/page.tsx` | `/location` | aucun | oui |
| `app/recherche/nouvelle/page.tsx` | `/recherche/nouvelle` | aucun | oui |
| `app/merci-vendeur/page.tsx` | `/merci-vendeur` | aucun | oui |
| `app/biens/[slug]/page.tsx` | `/biens/[slug]` | `revalidate = 600` | oui |
| `app/[postalCode]/[propertyId]/page.tsx` | `/[postalCode]/[propertyId]` | `revalidate = 600` | oui |
| `app/confidentialite/conversations/page.tsx` | `/confidentialite/conversations` | `force-dynamic` | non |
| `app/auth/callback/page.tsx` | `/auth/callback` | aucun | non |

### Espace client (6)

`app/espace-client/page.tsx` → `/espace-client` · `login/page.tsx` · `invitation/page.tsx` · `projets/[projectId]/page.tsx` · `recherches/[projectId]/page.tsx` · `biens/[propertyId]/page.tsx`. Aucun export de rendu ; toutes appellent `getRequestLocale()`.

### Admin (27, sans préfixe de locale)

`/admin`, `/admin/login`, `/admin/bootstrap`, `/admin/forbidden`, `/admin/leads`, `/admin/copilot`, `/admin/mcp-keys`, `/admin/mynotary`, `/admin/reconciliation`, `/admin/sweepbright-sync`, `/admin/buyer-leads` (+`/[id]`), `/admin/seller-leads` (+`/[id]`), `/admin/clients` (+`/new`, `/[id]`, `/[id]/projects/new`, `/[id]/projects/[projectId]`), `/admin/properties` (+`/new`, `/[id]`), `/admin/transactions` (+`/new`, `/[id]`), `/admin/users` (+`/[id]`).

Presque toutes en `dynamic = "force-dynamic"` (exceptions : `login`, `bootstrap`, `forbidden`). Seule `admin/buyer-leads/page.tsx` appelle `getRequestLocale()`.

### Layouts et fichiers spéciaux

`app/layout.tsx` : **existe**. `app/espace-client/layout.tsx` : **existe**. `app/admin/layout.tsx` : **absent**. `loading.tsx` : **existe** ×9. `error.tsx` : **existe** ×2 (racine, espace client). `not-found.tsx` : **absent** (alors que 5 pages appellent `notFound()`). `template.tsx`, `default.tsx` : **absent**.

### Routes API (116 fichiers)

**`/api/admin/*` (72)** : advisors, auth (bootstrap/google/logout/session), buyer-leads (+search, `[id]`, `[id]/match`, `[id]/sweepbright-sync`), clients (+`[id]`, projects, assign-advisor, attach-lead, attach-property, detach-property, direct-access, invite, invite/`[inviteId]`/revoke, members, presented-properties + documents/upload-url/`[docId]`/signed-url/visibility), copilot (conversations, `[id]`, message), domain-events/process, mcp-keys (+`[id]`), mynotary (dossier-search, match, sync, `[id]`/create-project, `[id]`/download, `[id]`/match-context), persons/search, properties (+`[id]`, attachments, documents + upload-url/`[documentId]`/signed-url/visibility, match, status), reconciliation/`[id]`, seller-leads/`[id]` (ai-insight, create-client-project, property-details, status, valuation-sync), seller-projects/`[id]` (golden-override, milestones), sweepbright/deliveries/process, tool-versions, transactions (+`[id]`), users (+`[id]`, avatar, avatar/upload-url), zone-catalog.

**`/api/espace-client/*` (13)** : buyer-searches/`[projectId]` (+pause, matches/mark-read), prepare-login, presented-properties/`[presentedId]`/documents (+upload-url, `[docId]`, `[docId]`/signed-url), projets/`[projectId]`/seller-chat, properties/`[propertyId]`/documents (+upload-url, `[documentId]`, `[documentId]`/signed-url), send-magic-link.

**`/api/seller/*`** : chat, email/send-otp, email/verify-otp, estimate-and-create, property-media/upload, property-media/upload-url. **`/api/seller-leads`** (+`/[id]/score`). **`/api/buyer-leads`**. **`/api/buyer-searches`** (+`/unsubscribe`).

**`/api/integrations/v1/*` (5)** : buyer-leads, market-observations, me, seller-leads, transactions. **`/api/webhooks/*` (3)** : mynotary, sweepbright, sweepbright-zapier. **`/api/internal/*` (7)** : cron/domain-events, cron/mynotary-sync, cron/sweepbright-sync, cron/webhook-deliveries, health, livez, readyz. **`/api/mcp`** (+`/manifest`). **`/api/public/property-listings`**. **`/api/home-assistant`**. **`/api/user/conversations`** (+`/request-deletion`).

Route hors `/api` : `app/espace-client/auth/confirm/route.ts` (GET).

---

## 2. I18N

**Mécanisme : existe, maison.** Aucune dépendance `next-intl` / `i18next`. Module `lib/i18n/` (6 fichiers, 574 lignes) : `config.ts` (26), `domain.ts` (362), `format.ts` (39), `localized-content.ts` (89), `request.ts` (14), `routing.ts` (44).

**Locales : existe** — `SUPPORTED_LOCALES = ["fr","en","es","ru"]`, `DEFAULT_LOCALE = "fr"` (`lib/i18n/config.ts`).

**Emplacement des traductions : existe, dispersé.** Aucun dossier `messages/` ni `locales/`, aucun JSON. Deux formes :

- **Modules dédiés** : `app/_home/copy.ts` (1363 l.), `app/estimation/_copy/form-copy.ts` (381), `_copy/flow-copy.ts` (255), `_copy/page-copy.ts` (223), `app/recherche/nouvelle/_components/buyer-signup-copy.ts` (362), `new-search-page-copy.ts` (241), `app/components/site-header-copy.ts` (55), `app/espace-client/projets/[projectId]/seller-project-copy.ts` (183), `buyer-project-copy.ts` (109), `seller-event-copy.ts` (114), `lib/i18n/domain.ts`, `lib/email/buyer-alert.ts` (241), `lib/properties/property-visit-ui.ts` (104).
- **Maps inline** dans ~36 composants : `assistant-chat.tsx`, `analytics-consent-banner.tsx`, `public-listing-detail-page.tsx`, `public-listings-search.tsx`, `property-gallery.tsx`, `property-card.tsx`, pages espace client, etc.

**Structure des clés : existe** — objets imbriqués typés TypeScript, pas de clés plates textuelles. Patterns : `Record<AppLocale, T>`, `satisfies Record<AppLocale, …>`, `export type X = typeof fr`.

**Clé manquante : partiel — trois comportements coexistent.**

1. Exhaustivité **compile-time** : **existe** pour les exports `Record<AppLocale, T>` (`HOME_COPY`, `SITE_HEADER_COPY`, `SELLER_PROJECT_FORM_COPY`, `buyerSignupCopy`, `ESTIMATION_PAGE_COPY`, `SELLER_FLOW_COPY`…). Une locale absente casse `tsc`.
2. Fallback **runtime vers `fr`** : **existe** — `lib/i18n/domain.ts` `translateFromMap` (`map[k]?.[locale] ?? map[k]?.fr ?? toTitleCase()`), `lib/i18n/localized-content.ts` `resolveLocalizedText` (exact → `fr` → `fallback`).
3. **Aucune garantie** : **existe** pour les champs DB `Partial<Record<AppLocale, …>>` (`titleTranslations` dans `app/api/admin/properties/route.ts`, `services/properties/manual-property.service.ts`) et pour les textes français en dur.

**Résolution : existe.** Serveur : `getRequestLocale()` = cookie `sillage-locale` → header `x-sillage-locale` → `fr`. Client : `getPathLocale(usePathname())`. `app/api/public/property-listings/route.ts` lit `x-sillage-locale` directement.

**Localisation des liens : existe** — `localizePath`, `localizePathWithSearch`, `stripLocalePrefix`, `getPathLocale`.

**Textes non traduits : existe.** Metadata racine `app/layout.tsx` (FR figé) ; tout `/admin/*` ; `UPLOAD_MODAL_COPY` dans `app/admin/clients/[id]/projects/[projectId]/presented-properties-admin.tsx` et `app/admin/properties/[id]/property-documents-admin-panel.tsx` ; `app/components/valuation-widget.tsx` (l. 53-64) ; `app/components/language-switcher.tsx` (l. 28, 43 : « Language », « Select language » en anglais figé) ; `app/espace-client/projets/[projectId]/seller-event-copy.ts` (l. 43-48, 68-76 : FR quelle que soit la locale).

---

## 3. AUTH ESPACE CLIENT (magic link)

Chaîne complète, **existe** :

1. **Demande** — `app/espace-client/_components/seller-magic-link-form.tsx` (l. 61) → `POST /api/espace-client/send-magic-link`. Autres points d'entrée : `app/espace-client/login/login-page-content.tsx`, `app/espace-client/invitation/page.tsx`, `app/estimation/seller-api-first-flow.tsx` (l. 203).
2. **Route** — `app/api/espace-client/send-magic-link/route.ts` (POST) + `checkPersistentRateLimit`.
3. **Génération** — `services/clients/client-portal-magic-link.service.ts` : `sendClientPortalMagicLink` (l. 211) → `resolveClientPortalAccessLink` (l. 98) → `generatePortalLink` (l. 55) → **`supabaseAdmin.auth.admin.generateLink`** (l. 86), `type: "signup"` (invitation) ou `"magiclink"` (reconnexion). `signInWithOtp` : **absent**. `inviteUserByEmail` : **absent**.
4. **URL encodée** — `{baseUrl}/espace-client/auth/confirm?next=…[&inviteToken=…]&token_hash=…&type=…`, `baseUrl` = `PUBLIC_SITE_URL` ou origine de la requête.
5. **Envoi** — `lib/email/smtp.ts` : `sendClientPortalAccessEmail` (l. 266) + `buildPortalAccessEmailPayload` (l. 103), gabarit `lib/email/layout.ts`. **Resend prioritaire**, repli **Nodemailer SMTP**. Supabase Auth n'envoie **pas** l'email.
6. **Callback** — `app/espace-client/auth/confirm/route.ts` (GET, l. 40) : `createSupabaseRouteHandlerClient` → **`supabase.auth.verifyOtp({ token_hash, type })`** (l. 73) → `getUser()` → `acceptInvitation` ou `getSellerPortalClientByAuthUserId` → redirect `next`. `exchangeCodeForSession` : **absent** du dépôt.
7. **Session** — cookies Supabase SSR (`@supabase/ssr`, clé anon), propagés par `copyResponseCookies` (`lib/supabase/server.ts`). Post-vérification : `touchClientProfileLastLogin`, `runBuyerPostVerificationTasks`.

**Protection des routes : partiel — aucune garde globale.** `proxy.ts` **ne fait aucune vérification d'auth**. `app/espace-client/layout.tsx` appelle `getClientSpacePageContext()` pour l'affichage seulement et **ne redirige pas**. Garde par page via `requireClientSpacePageContext` (`lib/client-space/auth.ts`) :

| Page | Protection |
|---|---|
| `espace-client/page.tsx` | `requireClientSpacePageContext` |
| `projets/[projectId]`, `biens/[propertyId]`, `recherches/[projectId]` | `requireClientSpacePageContext` |
| `login/page.tsx` | publique (redirige si déjà connecté) |
| `invitation/page.tsx` | **publique**, lit l'invitation via service role |
| `loading.tsx` ×2, `error.tsx` | aucune vérification |

APIs `/api/espace-client/*` : `getClientSpacePageContext()` → 401, sauf `send-magic-link` et `prepare-login` (**publiques**).

**Invitation : existe** — `app/espace-client/invitation/page.tsx` (`?token=`), création `app/api/admin/clients/[id]/projects/[projectId]/invite/route.ts` → table `client_project_invitations`, acceptation `acceptInvitation` (`services/clients/client-project-invitation.service.ts`). Auto-invitation : `prepareClientPortalLogin` crée une invitation si le profil existe sans `auth_user_id`.

**OTP email distinct : existe, non redondant** — `app/api/seller/email/send-otp|verify-otp` → `services/sellers/seller-email-verification.service.ts` → table `seller_email_verifications` (code 6 chiffres, TTL 10 min, 5 tentatives). N'utilise **ni** Supabase Auth **ni** de session : sert à vérifier l'email dans le tunnel d'estimation.

**Admin : existe, mécanisme totalement distinct** — Google OAuth (`app/admin/login/login-form.tsx` → `createAdminOAuthBrowserClient`), callback `app/auth/callback/page-content.tsx`, cookie applicatif dédié `sillage-admin-access-token` (8 h, `lib/admin/session.ts`), header secret `x-admin-key` = `ADMIN_API_KEY`, tables `admin_profiles` + `admin_role_assignments`, permissions `ADMIN_ROLE_PERMISSIONS` (`types/domain/admin.ts`). Pas de `app/admin/layout.tsx` : garde page par page (`requireAdminPagePermission`).

**Rôles** — client : aucun rôle applicatif, lookup `client_profiles.auth_user_id`. Admin : `collaborateur` / `manager` / `administrateur`. Table `admin_users` : **absent**. Claims JWT personnalisés : **absent** (autorisation par lookup DB).

---

## 4. SUPABASE

**Migrations : existe** — `db/migrations/` (51 fichiers `YYYYMMDD_NNN_*.sql`), application **manuelle** (`db/README.md`). Dossier `supabase/` et Supabase CLI : **absent**. `db/install.sql` (28 tables) et `db/schema.sql` (~20 tables) sont **incomplets** vs migrations. `db/policies/` : 3 fichiers (`leads.sql`, `seller_leads.sql`, `audit_log.sql`). Deux fichiers partagent le numéro `024` (`20260505_024`, `20260610_024`).

**Types : `database.types.ts` absent.** `types/db/supabase.ts` **existe** (2878 lignes, écrit à la main, non généré).

**Clients** — `lib/supabase/server.ts` (anon + cookies), `browser.ts` (anon), `admin-oauth-browser.ts` (anon PKCE), `admin.ts` (**service_role**).

### Tables (48)

`leads`, `audit_log`, `tool_versions`, `zone_catalog`, `seller_leads`, `seller_scoring_events`, `seller_email_verifications`, `contact_identities`, `domain_events`, `api_idempotency_keys`, `crm_webhook_deliveries`, `properties`, `property_listings`, `property_media`, `admin_profiles`, `admin_role_assignments`, `buyer_leads`, `buyer_search_profiles`, `buyer_property_matches`, `client_profiles`, `client_projects`, `seller_projects`, `project_properties`, `client_project_invitations`, `seller_project_advisor_history`, `client_project_events`, `buyer_projects`, `valuations`, `client_project_clients`, `property_documents`, `buyer_presented_properties`, `buyer_presented_property_documents`, `ai_conversations`, `ai_messages`, `entity_embeddings`, `ai_copilot_usage_daily`, `app_settings`, `mynotary_signed_documents`, `mynotary_events`, `reconciliation_suggestions`, `property_visits`, `rate_limit_counters`, `transactions`, `transaction_sellers`, `transaction_buyers`, `honoraires_history`, `market_observations`, `mcp_api_keys`.

Le détail des colonnes, clés et contraintes figure dans les migrations citées ci-dessus.

**Vues : existe** (6, aucune matérialisée) — `property_visits_public_v` (`db/migrations/20260610_023_property_visits.sql`), `analytics_transactions`, `analytics_revenue_realized_monthly`, `analytics_revenue_pipeline`, `analytics_advisor_performance`, `analytics_market_trends` (`db/migrations/20260622_048_analytics_layer.sql`).

**Fonctions : existe** (15) — `rate_limit_hit`, `bump_ai_copilot_usage`, `run_retention_cleanup`, `compute_contact_initials`, `analytics_run_select`, `mynotary_match_address`, `mynotary_match_seller_project_by_address`, `mynotary_match_seller_project_by_names`, + 7 fonctions `set_*_updated_at`.

**Triggers : existe** (7) — sur `reconciliation_suggestions`, `mynotary_signed_documents`, `app_settings`, `ai_copilot_usage_daily`, `ai_conversations`, `entity_embeddings`, `property_visits`.

**ENUM PostgreSQL : absent** (aucun `CREATE TYPE`). Énumérations via contraintes `CHECK` textuelles : **existe**.

### RLS

**Vérifié par comptage indépendant : 48 tables créées, 48 avec `ENABLE ROW LEVEL SECURITY`. Aucune table sans RLS.**

**19 tables ont au moins une policy** : `leads` (INSERT public), `seller_leads` (INSERT public), `audit_log` (INSERT authenticated), `seller_scoring_events` (INSERT authenticated), `client_profiles`, `client_projects`, `seller_projects`, `project_properties`, `seller_project_advisor_history`, `client_project_events`, `buyer_projects`, `buyer_search_profiles`, `buyer_property_matches`, `buyer_leads`, `client_project_clients`, `property_documents`, `buyer_presented_properties`, `buyer_presented_property_documents` (SELECT `authenticated` avec conditions d'indivision), `property_visits` (`ALL … USING(false)`). Policy storage : `mynotary_archives_service_role_rw` sur `storage.objects`.

**29 tables ont RLS activé sans aucune policy** : `tool_versions`, `zone_catalog`, `seller_email_verifications`, `contact_identities`, `domain_events`, `api_idempotency_keys`, `crm_webhook_deliveries`, `properties`, `property_listings`, `property_media`, `admin_profiles`, `admin_role_assignments`, `client_project_invitations`, `valuations`, `ai_conversations`, `ai_messages`, `entity_embeddings`, `ai_copilot_usage_daily`, `app_settings`, `mynotary_signed_documents`, `mynotary_events`, `reconciliation_suggestions`, `rate_limit_counters`, `transactions`, `transaction_sellers`, `transaction_buyers`, `honoraires_history`, `market_observations`, `mcp_api_keys`.

Conséquence : inaccessibles à `anon` / `authenticated`, accessibles uniquement via `service_role`.

### Qui écrit, depuis où

**Une seule écriture hors `service_role`** : `leads` INSERT via `createSupabaseServerClient()` dans `services/leads/lead.service.ts`.

**Toutes les autres passent par `supabaseAdmin` (service_role)**, depuis `services/` (`sellers/`, `buyers/`, `clients/`, `properties/`, `transactions/`, `market/`, `mcp/`, `reconciliation/`, `mynotary/`, `ai/`, `admin/`, `events/`, `contacts/`, `documents/`, `valuation/`), `lib/` (`ai/conversation-logger.ts`, `events/domain-events.ts`, `idempotency/*`, `ingestion/delivery-queue.ts`, `mcp/*`, `rate-limit/persistent.ts`) et quelques routes API admin (`tool-versions`, `zone-catalog`, `seller-leads/[id]/status`, `seller-leads/[id]/property-details`, `mynotary/match`).

Écritures par RPC : `rate_limit_counters` (`rate_limit_hit`), `ai_copilot_usage_daily` (`bump_ai_copilot_usage`). `run_retention_cleanup` : **aucun appelant TypeScript** dans le dépôt.

---

## 5. INGESTION SWEEPBRIGHT

**Webhooks : existe** (2).

| Route | Fichier | Auth |
|---|---|---|
| `POST /api/webhooks/sweepbright` | `app/api/webhooks/sweepbright/route.ts` | **HMAC SHA-1**, header `x-hook-signature`, secret `SWEEPBRIGHT_CLIENT_SECRET` (`services/properties/sweepbright-webhook.service.ts`) |
| `POST /api/webhooks/sweepbright-zapier` | `app/api/webhooks/sweepbright-zapier/route.ts` | **Secret partagé**, header `x-zapier-secret`, `timingSafeEqual` (`services/ingestion/sources/sweepbright-zapier.source.ts`) |

Rail commun : `lib/ingestion/webhook-handler.ts`.

### Événements et tables cibles

- **Webhook direct** (mode `async`) : `estate-added`, `estate-updated`, `estate-deleted`. Le payload n'est qu'une notification (`event`, `estate_id`, `company_id`, `happened_at`) ; l'estate est ensuite **récupéré par API REST**. Tables : `crm_webhook_deliveries`, `properties` (upsert `source,source_ref`), `property_listings` (upsert `property_id,business_type`), `property_media` (delete + insert), `contact_identities` (vendors), `reconciliation_suggestions`, `buyer_property_matches`. Sur `estate-deleted` : `property_listings.publication_status='deleted'` + `properties.availability_status='deleted'`.
- **Webhook Zapier visites** (mode `sync`) : `visit.scheduled|updated|cancelled|completed`. Tables : `crm_webhook_deliveries`, `property_visits` (upsert `external_visit_id`), `client_project_events`. Schéma Zod : `lib/sweepbright/zapier-payload-schema.ts`.
- **Canal REST Zapier** `/api/integrations/v1/*` (auth clé API `sk_mcp_…`, `lib/integrations/auth.ts`) : `transactions` + `honoraires_history`, `market_observations`, `buyer_leads`, `seller_leads`. App Zapier : `integrations/zapier/`.

**Mapping** : `services/properties/sweepbright-sync.service.ts` (`mapEstateToPropertyInsert`, `mapEstateToMediaInserts`, `computePriceAmount`, `upsertPropertyProjection`), types `types/api/sweepbright.ts`. Fichiers `parse.ts` / `payload-schema.ts` dédiés au webhook direct : **absents** (parse inline).

### Bien vendu — disponibilité des champs

| Champ | Statut | Localisation |
|---|---|---|
| Prix de mise en marché initial | **ABSENT** | Seul le prix **courant** existe : `property_listings.price_amount` ← `computePriceAmount(estate)`, **écrasé à chaque synchronisation**. Aucune colonne de prix initial. |
| Prix signé / final | **ABSENT** du webhook direct ; **existe** via Zapier REST | `transactions.agreed_price_amount`, `transactions.deed_price_amount` ← `app/api/integrations/v1/transactions/route.ts` |
| Date de mandat | **ABSENT** du webhook ; **existe** via Zapier | `transactions.mandate_signed_at` (aussi `seller_projects.mandate_signed_at`) |
| Date de compromis | **ABSENT** du webhook ; **existe** via Zapier | `transactions.preliminary_sale_signed_at` |
| Date d'acte | **ABSENT** du webhook ; **existe** via Zapier | `transactions.deed_signed_at` |
| Type de mandat (exclusif / simple) | **ABSENT** en colonne ; **existe** en JSONB via Zapier | `transactions.metadata.mandateType`. `properties.negotiation` est le type de transaction (`sale`/`let`), **pas** le type de mandat. |
| Quartier | **ABSENT** | Aucune colonne `neighborhood` sur `properties` ni `property_listings`. Existe uniquement sur `market_observations.neighborhood` (canal Zapier market). Donnée éventuellement présente non extraite dans `properties.raw_payload`. |
| Typologie | **existe** | `properties.property_type`, `sub_type`, `rooms` (= `bedrooms + living_rooms`), `bedrooms`, `bathrooms`, `living_area` ; miroir sur `property_listings`. |
| Identifiant Matterport | **ABSENT** | Pas de colonne dédiée. Seule l'URL générique `properties.virtual_tour_url` ← `estate.virtual_tour_url`. |

**Historique de prix : ABSENT.** `property_listings.price_amount` est écrasé ; `properties.raw_payload` est écrasé à chaque sync (non versionné) ; `honoraires_history` ne concerne que les honoraires ; `market_observations` est append-only mais alimenté par Zapier, pas par le webhook direct.

> **Conséquence pour la refonte** : le prix de mise en marché initial d'un bien vendu n'est pas reconstituable depuis les données ingérées. Toute preuve du type « vendu à X % du prix affiché » suppose de capturer cette donnée au préalable.

**Cron : existe** — `app/api/internal/cron/sweepbright-sync/route.ts` (GET, `processPendingSweepBrightDeliveries`), planifié `*/10 * * * *` dans `vercel.json` ; `app/api/internal/cron/webhook-deliveries/route.ts` (rejoue `sweepbright-zapier` et `mynotary`, **pas** `sweepbright`) ; rejeu manuel `app/api/admin/sweepbright/deliveries/process/route.ts`.

**Idempotence : existe** — `lib/ingestion/delivery-queue.ts`, table `crm_webhook_deliveries`, `UNIQUE(provider, event_key)`, statuts `received → processing → processed|failed|ignored`, `WEBHOOK_DELIVERY_MAX_ATTEMPTS = 5`. Côté REST : `transactions.external_id` et `market_observations.external_id` uniques (`db/migrations/20260623_050_zapier_ingestion.sql`).

**Projection visites : existe** — `services/properties/property-visit.projection.ts` : `toClientView`, `toAdminView`, `splitVisitsByTime`. Ne touche pas Supabase. La vue client expose `contactInitials` et **uniquement** `feedback_comment_public` ; la vue admin expose les PII et `commentInternal`, `offerAmount`, `rawPayload`.

---

## 6. HOME

**Arborescence ordonnée (`app/page.tsx`, composant serveur async) : existe** — 15 composants, **tous serveur** :

`HeroSection` → `SocialProofSection` → `AssistantSection` → `PositioningSection` → `SellerSection` → `BuyerSection` → `ClientSpaceSection` → `MethodSection` → `ComparisonSection` → `CatalogSection` → `NeighborhoodsSection` → `InternationalSection` → `HomeTeamSection` → `FinalCtaSection` → `HomeMobileCtaBar`.

Tous dans `app/_home/sections/`, sauf `HomeTeamSection` (`app/components/home-team-section.tsx`).

**Réutilisables** : `app/_home/shared/mobile-carousel.tsx` (`HCarousel`, module **client**) — 6 sections ; `app/_home/shared/carousel-item.ts` (`CAROUSEL_ITEM`, module serveur) — mêmes 6 ; `app/_home/shared/cta-button.tsx` (icônes) — 9 sections ; `app/components/sillage-logo.tsx` — hero + `app/estimation/page.tsx` ; `app/components/assistant-chat.tsx` (client) — via `home-commercial-assistant.tsx` ; `app/components/skeletons.tsx`.

**One-shot** : les 14 sections de `_home/sections/`, `home-team-section.tsx`, et `DrawnZoneMap` (fonction locale SVG dans `buyer-section.tsx`, sans Leaflet).

**Exports non utilisés : existe** — `CtaButton` et `SectionContainer` (`app/_home/shared/`) n'ont **aucun import** dans le dépôt.

**Textes** : `app/_home/copy.ts` (1363 l.), `HOME_COPY: Record<AppLocale, HomeCopy>`, 14 blocs + `ctaGlobal`, plus `PHONE_ARIA_LABEL`, `SILLAGE_PHONE_RAW/DISPLAY`. Textes du chat séparés dans `ASSISTANT_COPY` (`app/components/assistant-chat.tsx`).

**Accès données** : `HomeTeamSection` → `services/home/team.service.ts` (`supabaseAdmin`, tables `admin_profiles`, `admin_role_assignments`) ; `AssistantChat` → `fetch("/api/home-assistant")`. Les 13 autres sections ne font **aucun** appel.

---

## 7. TUNNEL D'ESTIMATION

`app/api/estimation/` : **absent** (les routes vivent sous `app/api/seller/`).

**Étapes : existe** — `app/estimation/page.tsx` → `SellerApiFirstFlow` (`app/estimation/seller-api-first-flow.tsx`), `step` ∈ `"form"` → `"verify"` → `"result"`. Sous-étapes mobile `mobileStep` 1|2|3 (`useState` local dans `seller-project-form-section.tsx` l. 55).

**State : existe, entièrement local.** `useState` / `useRef` dans `seller-api-first-flow.tsx` : `step` (l. 39), `form` (40), `uploadedMedia` (41), `otp` (44), `verificationToken` (45), `previewCode` (46), `thankYouAccessToken` (47), `valuation` (48), `portalAccess` (49), `portalAccessStatus` (50-52), `loading` / `isEstimating` / `estimateProgress` / `error` (54-57), `idempotencyKeysRef` (32), `uploadSessionIdRef` (33-37). Contexte React : **absent**. `localStorage` : **absent**. Synchronisation URL : **absent**.

### Persistance et abandon

| Moment | Persisté |
|---|---|
| Formulaire rempli, sans clic | **rien** (state React) |
| Après `send-otp` | `seller_email_verifications` (ligne OTP) |
| Après `verify-otp` | `seller_email_verifications.verified_at` |
| Après upload média | Objets dans le bucket Storage, **aucune ligne `property_media`** |
| Avant `estimate-and-create` | **rien** dans `seller_leads`, `properties`, `valuations` |

**`POST /api/seller/estimate-and-create`** enchaîne : `consumeSellerEmailVerificationToken` → `computeLoupeValuation` → `createSellerLead` (`seller_leads`, `contact_identities`, `audit_log`, événement domaine) → `hydrateSellerLeadFromCapture` → `ensureSellerPortalAccessFromLead` (`client_profiles`, `client_projects`, `seller_projects`, invitation) → `ensureEstimationProperty` (`properties`) → `attachEstimationPropertyMedia` (`property_media`) → `createValuationRecord` (`valuations`) → `emitClientProjectEvent`.

**OTP : existe** (étape `verify`) — 6 chiffres, TTL 10 min, 5 tentatives (`services/sellers/seller-email-verification.service.ts`). Idempotence par header `idempotency-key` → `api_idempotency_keys` sur les trois routes du tunnel.

**Upload : existe** — UI `app/estimation/seller-property-media-upload.tsx`, logique `app/estimation/seller-flow-media.ts`, bucket Storage **`seller-estimation-property-media`** (`services/properties/estimation-property-media.service.ts` l. 7), chemin `{uploadSessionId}/{kind}/{uploadId}-{fileName}`, limites 20 images / 5 vidéos, 15 Mo / 200 Mo.

**Calcul : existe** — `services/valuation/loupe-valuation.service.ts` (`computeLoupeValuation`), client `services/valuation/loupe-client.ts`, provider `"loupe"`. Entrées : adresse, ville, code postal, type, surface, pièces, étage, terrasse / balcon + surfaces, exposition, temporalité, message.

**Fichiers orphelins : existe** — `app/estimation/seller-estimation-form.tsx` présent mais **non importé**.

---

## 8. RECHERCHE DESSINÉE

**Stockage des zones : existe, sans géométrie native.** Table `public.buyer_search_profiles`, colonne **`criteria` (JSONB)**, clé **`zonePolygon`**, format **tableau de tuples `[latitude, longitude]`** (`Array<[number, number]>`). Écriture : `services/buyers/buyer-signup.service.ts` (l. 301-306), uniquement si ≥ 3 points. Validation : `lib/buyers/buyer-search-payload.ts` (`zonePolygonSchema`, min 3 / max 200 points). SQL : `db/migrations/20260312_013_create_admin_rbac_and_buyer_domain.sql`, `db/schema.sql` l. 273-295.

**PostGIS : absent.** Extensions présentes : `pgcrypto`, `vector`, `pg_trgm` (`db/migrations/20260525_025_enable_pgvector_pg_trgm.sql`). Aucune mention de `postgis`, `geometry` ou `geography` dans `db/`.

**Critères : existe** (colonnes typées de `buyer_search_profiles`) — budget : **`budget_min`**, **`budget_max`** (`integer`) ; typologie : **`property_types`** (`text[]`), `business_type` (`text`), `rooms_min` / `rooms_max` (`int2`), `bedrooms_min` (`int2`), `living_area_min` / `living_area_max` (`double precision`), `floor_min` / `floor_max` (`int2`) ; `requires_terrace`, `requires_elevator` (`boolean`) ; `cities` (`text[]`), `location_text` (`text`) ; `criteria` (JSONB, dont `zonePolygon`). Filtres d'URL initiaux : `buyer_leads.metadata.initialFilters`.

**Matching : partiel — la zone dessinée n'est pas utilisée.** `services/buyers/buyer-matching.service.ts` (`buildMatchScore`) compare uniquement les critères tabulaires et écrit `buyer_property_matches` (`score`, `blockers`, `matched_criteria`). Aucune requête spatiale, aucune référence à `zonePolygon`, bien que `properties.latitude` / `longitude` existent. Conversion GeoJSON présente uniquement en sortie d'intégration (`services/buyers/sweepbright-buyer-mapper.ts`).

**Carte : existe** — `app/components/buyer-search-zone-map.tsx` (`"use client"`), **`leaflet`** + **`leaflet-draw`** en import dynamique (l. 98-108), tuiles Carto Voyager, `L.Draw.Polygon` (l. 246), chargée via `dynamic(..., { ssr: false })` dans `buyer-signup-criteria-step.tsx` (l. 9-19).

**Persistance** : uniquement au `POST /api/buyer-searches` (fin de l'étape 2) → `buyer_leads`, `contact_identities`, `client_profiles`, `client_projects`, `buyer_search_profiles`, `buyer_projects`, `client_project_invitations`, `buyer_property_matches`, `audit_log`. Abandon avant soumission : **rien en base**. `localStorage` : **absent**.

---

## 9. FEATURE FLAGS

**Mécanisme centralisé : absent.** Aucun module de flags, aucun `isEnabled` générique, aucun kill switch, aucune convention `FEATURE_*` / `ENABLE_*`.

**Toggles ponctuels : partiel** (2) :

- `MCP_WRITE_ENABLED === "true"` autorise les mutations MCP HTTP (`app/api/mcp/route.ts` l. 80-81).
- `isClientPortalDirectAccessEnabled` (`lib/client-space/direct-access.ts`) activé **par le nom d'hôte** contenant `feature-client-space-v1-sillage-immo`, consommé par `app/admin/clients/[id]/projects/[projectId]/page.tsx`, `.../direct-access/route.ts`, `app/api/buyer-searches/route.ts`, `app/api/espace-client/send-magic-link/route.ts`.

**Variables d'environnement : existe** — 52 noms distincts lus via `process.env`, dont 27 déclarées dans `.env.example` (39 lignes).

Publiques (5) : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_WLV_WIDGET_KEY`, `NEXT_PUBLIC_WLV_CONTAINER_ID`, `NEXT_PUBLIC_GTM_ID`.

Serveur : `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_API_KEY`, `PUBLIC_SITE_URL`, `SILLAGE_AI_SESSION_SECRET`, `OPENAI_API_KEY`, `RESEND_API_KEY`, `SMTP_*` (6), `EMAIL_FROM_*` (2), `LOUPE_*` (6), `MYNOTARY_*` (8), `SWEEPBRIGHT_*` (6), `MCP_*` (4), `ADMIN_COPILOT_*` (3), `BUYER_ALERT_HMAC_SECRET`, `DOMAIN_EVENTS_CRON_SECRET`, `MERCI_VENDEUR_ACCESS_SECRET`, `SELLER_ESCALATION_INBOX`, `VERCEL_URL`, `VERCEL_BRANCH_URL`, `NODE_ENV`.

**Non déclarées dans `.env.example` mais lues par le code** : `ADMIN_COPILOT_DAILY_CAP_EUR`, `ADMIN_COPILOT_MAX_ITERATIONS`, `ADMIN_COPILOT_MODEL`, `LOUPE_DATA_API_BASE_URL`, `LOUPE_DATA_API_TOKEN_SALT`, `LOUPE_DATA_API_USER`, `MCP_RATE_LIMIT_PER_MINUTE`, `MCP_SERVER_ADMIN_KEY`, `MCP_SERVER_BASE_URL`, `MCP_WRITE_ENABLED`, `MYNOTARY_*` (7 des 8), `SWEEPBRIGHT_API_BASE_URL`, `SWEEPBRIGHT_API_VERSION`, `SWEEPBRIGHT_CLIENT_ID`, `SWEEPBRIGHT_CLIENT_SECRET`, `SELLER_ESCALATION_INBOX`.

**Validation : partiel** — `lib/env/public.ts` (`requirePublicEnv`, 2 clés) et `lib/env/server.ts` (`requireServerEnv`, 2 clés, autres avec `?? ""`) lèvent une erreur ; `app/api/internal/health|readyz` vérifient un sous-ensemble à l'exécution. Validation par schéma Zod des variables d'environnement : **absente**.

---

## 10. SEO

| Élément | Statut | Détail |
|---|---|---|
| Metadata racine | **existe** | `app/layout.tsx` : `title`, `description`, `icons` — **en français figé**, non localisée |
| `generateMetadata` | **partiel** | 6 fichiers sur 43 pages : `vente/page.tsx`, `location/page.tsx`, `recherche/nouvelle/page.tsx`, `biens/[slug]/page.tsx`, `[postalCode]/[propertyId]/page.tsx` (les deux derniers via `buildPublicListingMetadata` dans `app/components/public-listing-detail-page.tsx`), + `confidentialite/conversations/page.tsx`. **36 pages n'ont que le metadata racine.** |
| `sitemap` | **absent** | ni `app/sitemap.ts`, ni `public/sitemap*` |
| `robots` | **absent** | ni `app/robots.ts`, ni `public/robots.txt`. Seule directive : `robots: { index: false, follow: false }` sur `confidentialite/conversations` |
| `hreflang` / `alternates.languages` | **absent** | aucune occurrence dans le dépôt |
| `canonical` / `metadataBase` | **absent** | (`canonicalPath` en base est un champ métier de listing, pas un canonical HTML) |
| JSON-LD | **absent** | aucun `application/ld+json`, aucun `schema.org` |
| `openGraph` | **absent** | |
| `twitter` | **absent** | |
| `<html lang>` | **existe** | `app/layout.tsx` l. 89, `lang={locale}` + `data-platform={platform}` |

---

# SIGNALEMENTS

## A. Routes dont le renommage casserait un lien externe ou un email déjà envoyé

| Route | Origine du lien | Fichier qui l'émet |
|---|---|---|
| **`/espace-client/auth/confirm`** | **Tous les magic links déjà envoyés** (et `redirectTo` transmis à Supabase) | `services/clients/client-portal-magic-link.service.ts` l. 62 |
| **`/espace-client/invitation?token=`** | Emails et liens d'invitation admin déjà envoyés | `app/api/admin/clients/[id]/projects/[projectId]/invite/route.ts` |
| **`/api/buyer-searches/unsubscribe`** | Lien de désabonnement présent dans **chaque alerte acquéreur déjà envoyée** | `services/buyers/buyer-alert.service.ts` l. 51 |
| **`/espace-client/recherches/{clientProjectId}`** | Corps des emails d'alerte acquéreur | `services/buyers/buyer-alert.service.ts` l. 56 |
| **`/espace-client/biens/{propertyId}`** | Emails de notification de documents | `services/properties/property-document-notification.service.ts` l. 372, 554 |
| **`/merci-vendeur?access=`** | Lien de résultat d'estimation (token signé) | `app/estimation/seller-estimation-result-section.tsx`, `app/api/seller/estimate-and-create/route.ts` |
| **`/api/webhooks/sweepbright`**, **`/api/webhooks/sweepbright-zapier`**, **`/api/webhooks/mynotary`** | URLs enregistrées côté SweepBright, Zapier et MyNotary | routes correspondantes |
| **`/api/integrations/v1/{transactions,market-observations,buyer-leads,seller-leads,me}`** | App Zapier publiée | `integrations/zapier/index.js` |
| **`/api/internal/cron/{domain-events,sweepbright-sync,webhook-deliveries,mynotary-sync}`** | Planificateur Vercel | `vercel.json` |
| **`/api/mcp`**, `/api/mcp/manifest` | Clients MCP externes (clés `sk_mcp_…`) | `app/api/mcp/route.ts` |
| **`/biens/[slug]`**, **`/[postalCode]/[propertyId]`** | Indexation moteurs + `canonical_path` stocké en base (`property_listings.canonical_path`, UNIQUE) | `services/properties/sweepbright-sync.service.ts` |

**Point d'attention particulier** : `/[postalCode]/[propertyId]` est une route **catch-all de premier niveau**. Toute nouvelle page racine (par exemple `/honoraires`) entre en concurrence avec ce segment dynamique.

## B. Divergences entre deux implémentations d'une même fonction

1. **Ingestion SweepBright** — deux chemins qui ne partagent ni les champs ni les tables : webhook direct (catalogue de biens, prix courant seul, aucune date de jalon) vs API REST Zapier (`transactions`, dates de mandat / compromis / acte, type de mandat). Les jalons de vente **n'existent que** par le second.
2. **Prix d'un bien** — `property_listings.price_amount` (annonce, écrasé) vs `transactions.mandate_price_amount` / `agreed_price_amount` / `deed_price_amount` (transaction). Aucune réconciliation entre les deux.
3. **Vérification d'email** — OTP maison (`seller_email_verifications`, code 6 chiffres) vs magic link Supabase (`verifyOtp`). Deux systèmes de preuve d'email coexistants.
4. **Envoi d'email** — Resend prioritaire, repli Nodemailer SMTP dans le même fichier (`lib/email/smtp.ts`), avec deux jeux de variables d'expéditeur (`EMAIL_FROM_*` et `SMTP_FROM_*`).
5. **Clients Supabase** — 4 fabriques : `createSupabaseServerClient`, `createSupabaseRouteHandlerClient`, `createSupabaseBrowserClient`, `createAdminOAuthBrowserClient` (`@supabase/supabase-js` + PKCE, hors `@supabase/ssr`).
6. **OAuth admin** — `signInWithOAuth` côté navigateur (utilisé par `login-form.tsx`) vs route serveur `GET /api/admin/auth/google` (**existe, non consommée**).
7. **Préparation d'accès portail** — appel interne `prepareClientPortalLogin` vs route HTTP `POST /api/espace-client/prepare-login` (**existe, aucun appelant UI**).
8. **Lookup du profil client** — `getClientPortalContextByAuthUserId` et `getSellerPortalClientByAuthUserId`, deux entrées vers le même `getClientByAuthUserId`.
9. **Session admin** — cookie applicatif `sillage-admin-access-token` **et** cookies Supabase SSR en parallèle.
10. **Garde d'authentification** — par page (`requireClientSpacePageContext`, `requireAdminPagePermission`), sans layout de garde ; `app/espace-client/layout.tsx` lit le contexte **sans** rediriger.
11. **Référence orpheline** — `proxy.ts` l. 24 déclare le préfixe `/api/estimation` dans `ANONYMOUS_SESSION_TRIGGER_PREFIXES` alors qu'**aucun `app/api/estimation/**` n'existe**.
12. **Schéma SQL** — trois sources concurrentes : `db/migrations/` (référence, 51 fichiers), `db/install.sql` (28 tables) et `db/schema.sql` (~20 tables), les deux dernières **en retard**. Numéro `024` dupliqué.
13. **Code mort** — `CtaButton`, `SectionContainer` (`app/_home/shared/`) et `app/estimation/seller-estimation-form.tsx` : présents, jamais importés.

## C. Tables sans RLS

**Aucune.** Vérifié par comptage indépendant : 48 tables `public.*` créées, 48 avec `ENABLE ROW LEVEL SECURITY`.

Le risque réel est ailleurs, et il est double :

- **29 tables ont RLS activé sans aucune policy** (liste au point 4), dont `properties`, `property_listings`, `property_media`, `transactions`, `valuations`, `market_observations`, `admin_profiles`, `mcp_api_keys`. Elles sont **totalement inaccessibles** hors `service_role` : toute lecture depuis un client anon ou authentifié renverra vide, sans erreur.
- **La protection effective ne repose pas sur RLS** : une seule écriture applicative n'utilise pas `service_role` (`leads`). Tout le reste passe par `supabaseAdmin`, qui **contourne RLS**.

## D. Endroits où une nouvelle page créée en FR seulement casserait la navigation multilingue

Le routage lui-même ne casse pas : comme `/en/x` est un **rewrite** vers `/x`, une nouvelle page est immédiatement servie sur les 4 locales. Les ruptures sont ailleurs.

1. **Typage exhaustif — rupture au build, pas en production.** Tout objet exporté en `Record<AppLocale, T>` (`HOME_COPY`, `SITE_HEADER_COPY`, `SELLER_PROJECT_FORM_COPY`, `ESTIMATION_PAGE_COPY`, `SELLER_FLOW_COPY`, `buyerSignupCopy`, `newSearchPageCopy`) **fait échouer `tsc`** si une locale manque. Garde-fou, mais impose les 4 langues, `ru` incluse.
2. **`app/components/site-header-copy.ts`** — `SiteHeaderCopy` est un type fermé (`home`, `sale`, `rental`, `valuation`, `buy`, `clientSpace`, `openMenu`, `closeMenu`). Ajouter une entrée de navigation exige **8 traductions** et casse le build sinon. Libellés consommés par `app/components/site-header-client.tsx`, qui construit les `href` via `localizePath`.
3. **Copy inline sans exhaustivité — rupture silencieuse.** Les composants à ternaires `locale === "en" ? … : "fr"` (ex. `seller-event-copy.ts` l. 43-48, 68-76) affichent du **français aux visiteurs `en` / `es` / `ru`** sans erreur.
4. **Metadata — dégradation SEO systématique.** `app/layout.tsx` porte un `title` / `description` **en français figé**. Une nouvelle page sans `generateMetadata` localisé sera indexée en français sur les 4 locales : déjà le cas pour **36 pages sur 43**.
5. **Absence de `hreflang`, `canonical` et `sitemap`.** Les 4 variantes d'URL existent sans relation déclarée aux moteurs. Toute nouvelle page multiplie le contenu dupliqué non qualifié.
6. **`app/components/language-switcher.tsx`** — navigue via `localizePathWithSearch` en conservant le chemin, donc fonctionnera ; mais ses propres libellés (l. 28, 43) sont **en anglais figé**.
7. **`/admin/*` est hors i18n par conception** — exclu du proxy, redirigé si préfixé, interface en français.
8. **Conflit de segment racine** — toute nouvelle page de premier niveau doit être vérifiée contre `/[postalCode]/[propertyId]` (point A).
