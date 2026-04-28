# Analytics – Sillage Immo

Ce module centralise tout le tracking front-end de Sillage Immo. Les
évènements sont poussés dans `window.dataLayer` puis consommés par
**Google Tag Manager** (`GTM-WCCJQJN2`), qui les redistribue vers GA4
et, plus tard, vers d'autres outils (Ads, Meta, etc.).

## Architecture

```
                              +---------------------+
                              |  GA4 (Google Tag    |
                              |  Manager handles    |
                              |  the consent gate)  |
                              +----------^----------+
                                         |
+-----------------+      +---------------+----------------+
|  product code   | ---> |   window.dataLayer (GTM)        |
+--------+--------+      +---------------------------------+
         |                              ^
         | track(...)                   |
         v                              |
+--------+--------+              +------+--------------+
| data-layer.ts   |   <----      |  Consent Mode v2    |
|  (typed events) |              |  (consent.ts)       |
+-----------------+              +---------------------+
```

Tous les imports passent par `@/lib/analytics/data-layer` ou
`@/lib/analytics/consent` — jamais directement par `window.dataLayer`.

## Pourquoi pas GA4 direct ?

GTM offre :

- consent gate centralisé (RGPD/CNIL),
- ajout de tags Ads/Meta/Hotjar sans redéploiement,
- A/B testing de configuration,
- tunnel de debug intégré (Tag Assistant).

## Consentement (RGPD/CNIL)

Implémenté via Consent Mode v2.

1. Avant tout, on push `gtag('consent', 'default', { ... 'denied' })`
   dans `<AnalyticsConsentInit />` avec `strategy="beforeInteractive"`,
   donc avant le script GTM.
2. La bannière (`<AnalyticsConsentBanner />`) propose 3 actions :
   accepter, refuser, personnaliser.
3. Le choix est stocké dans le cookie first-party `sillage_consent`
   (1 an, `SameSite=Lax`).
4. Au prochain chargement, le cookie est replay via `applyConsentState()`,
   donc la bannière reste cachée.

Tant que l'utilisateur n'a pas accepté `analytics_storage`, GTM
*queue* les events GA4 — ils ne partent pas.

## Évènements

Tous les events ont la forme `{ event: string, ...payload }`.

### Navigation

| Event           | Quand                                        | Payload clés                            |
|-----------------|----------------------------------------------|------------------------------------------|
| `spa_page_view` | Changement de route App Router (client)      | `page_path`, `page_search`, `page_title`, `locale` |

### Consentement

| Event             | Quand                                    | Payload                              |
|-------------------|------------------------------------------|--------------------------------------|
| `consent_default` | Au boot, avant GTM                       | —                                    |
| `consent_update`  | Après interaction utilisateur            | `analytics`, `ads`, `functional`     |

### Engagement public (délégation `<AnalyticsClickDelegate />`)

| Event                   | Quand                                       | Attributs DOM (closest)                                                        |
|-------------------------|---------------------------------------------|--------------------------------------------------------------------------------|
| `cta_clicked`           | Clic sur tout élément `[data-track-cta]`   | `data-track-cta`, `data-track-location`                                        |
| `phone_clicked`         | Clic `tel:` ou `[data-track-phone]`         | `data-track-phone`, `data-track-location`                                      |
| `email_clicked`         | Clic `mailto:` ou `[data-track-email]`      | `data-track-email`, `data-track-location` (seul `domain` part en payload)      |
| `whatsapp_clicked`      | Clic `wa.me/api.whatsapp.com` ou attribut   | `data-track-whatsapp`                                                          |
| `lang_switched`         | Changement de langue                        | `from`, `to`                                                                   |
| `property_card_clicked` | Clic sur `[data-track-property-card]`       | `data-track-property-card` (id), `data-track-property-{price,type,city}`       |
| `ai_assistant_message_sent` | Envoi d'un message à l'assistant IA     | `locale`, `message_length`, `history_size`                                     |

### Funnel vendeur (`/estimation`)

| Event                         | Quand                                  | Payload clés                                                |
|-------------------------------|----------------------------------------|-------------------------------------------------------------|
| `seller_estimation_started`   | Mount du formulaire                    | `locale`                                                    |
| `seller_otp_sent`             | OTP email envoyé                       | `locale`                                                    |
| `seller_otp_verified`         | OTP validé                             | `locale`                                                    |
| `seller_media_uploaded`       | Upload photos/vidéo terminé            | `kind` (image/video), `count`, `total_size_mb`              |
| `seller_estimation_computed`  | Estimation calculée (succès)           | `valuation_low/mid/high`, `city`, `zip`, `rooms`, `living_area_m2`, `media_count` |
| `seller_lead_created`         | Lead enregistré côté API               | `create_status`, `has_portal_access`, `locale`              |
| `seller_portal_link_sent`     | Magic link espace client envoyé        | `mode`, `locale`                                            |

### Funnel acquéreur (`/recherche/nouvelle` + `BuyerSearchForm` home)

| Event                       | Quand                                     | Payload clés                                                            |
|-----------------------------|-------------------------------------------|-------------------------------------------------------------------------|
| `buyer_search_started`      | Mount du formulaire                       | `business_type`, `city`, `locale`                                       |
| `buyer_search_zone_drawn`   | Polygone (>=3 points) dessiné             | `vertices`, `city`                                                      |
| `buyer_search_saved`        | Recherche enregistrée (succès API)        | `source`, `email_sent`, `has_phone`, `has_zone`, `business_type`, `city`, `property_type`, `locale` |

### Espace client

| Event                            | Quand                                | Payload clés                                              |
|----------------------------------|--------------------------------------|-----------------------------------------------------------|
| `client_login`                   | Magic link demandé (succès API)      | `method` (`magic_link`), `flow` (`invite`/`self`), `locale` |
| `client_property_viewed`         | Page bien chargée côté client        | `property_id`, `business_type`, `city`                    |
| `client_document_uploaded`       | Document PDF déposé par le client    | `property_id`, `size_kb`, `mime`, `actor`                 |
| `client_advisor_booking_clicked` | Clic sur "Prendre rendez-vous"       | (via `cta_clicked` avec `cta_id` correspondant)           |

### Qualité

| Event       | Quand                                         | Payload clés                                                |
|-------------|-----------------------------------------------|-------------------------------------------------------------|
| `js_error`  | `window.onerror` + `unhandledrejection`       | `message`, `file`, `line`, `column`, `kind?`, `page_path`   |
| `api_error` | `parseApiResponse` reçoit un statut non-OK    | `status`, `path`, `content_type`, `message`                 |

### Web Vitals (Core Web Vitals)

| Event         | Quand                              | Payload clés                                                          |
|---------------|------------------------------------|-----------------------------------------------------------------------|
| `web_vitals`  | LCP, CLS, INP, FCP, TTFB           | `metric_name`, `metric_id`, `metric_value`, `metric_rating`, `metric_navigation_type`, `page_path` |

`metric_value` est arrondi en ms pour LCP/INP/FCP/TTFB et `value × 1000`
pour CLS (afin que GA4 puisse stocker des entiers).

## Configuration GTM (à faire dans l'UI)

Dans le conteneur `GTM-WCCJQJN2` :

1. Variables → User-Defined → DataLayer Variable, créer une variable
   pour chaque champ utilisé dans les payloads (`page_path`,
   `metric_name`, `metric_value`, `cta_id`, `property_id`, etc.).
2. Triggers → Custom Event, un par event name listé ci-dessus.
3. Tags → GA4 Event :
   - `spa_page_view` -> page_view custom (param `page_location` =
     `{{Page URL}}` ou la variable `page_full_path`).
   - `web_vitals` -> event `web_vitals` (param `metric_name`,
     `metric_value`, `metric_rating`).
   - Funnel/engagement events -> event GA4 portant le même nom
     d'event pour faciliter l'analyse.
4. Consent Settings sur tous les tags GA4 / Ads :
   `analytics_storage` requis (et `ad_storage` pour Ads).

## Ajouter un nouvel event

1. Ajouter le nom à `AnalyticsEventName` dans `data-layer.ts`.
2. Appeler `track("...", { ... })` à l'endroit voulu.
3. Mettre à jour ce README.
4. Côté GTM : créer le trigger custom event correspondant + tag GA4.

## Conventions PII

- Jamais d'email, téléphone ou nom complet en clair dans le payload.
- Pour un email, ne push que le `domain` (cf. `email_clicked`).
- Les chaînes sont tronquées à 200 caractères dans `sanitizePayload`.
- Les objets imbriqués sont retirés silencieusement.

Si vous devez identifier un utilisateur côté GA4, utilisez le
`user_id` GA4 standard (à brancher via une variable GTM dédiée), pas
un email en clair.
