# MyNotary integration — phase 1 (inbound)

Sillage ingests signed contracts from MyNotary (https://dev.mynotary.fr/external)
to fuel:

- the `/admin` dashboard KPI cards (Mandats / Offres / Compromis / Actes signés)
- the `/admin/mynotary` rattachement console (with one-click download of the
  archived signed PDF + eIDAS proof when available)
- the MCP tools `mynotary.list_signed_documents`,
  `mynotary.get_signed_document`, `mynotary.stats_signed_by_period` and
  `seller_projects.milestones_stats`
- the admin copilot (so a manager can ask "Combien de mandats signés
  cette semaine ?" in natural language)

Phase 1 is **inbound only**: Sillage does not create operations or
records inside MyNotary. The integration consumes signature events and
archives the signed PDFs.

## Endpoints we use

Spec : `https://dev.mynotary.fr/external` (cf.
`specs/external-filtered.yaml`).

Base URLs:
- Production : `https://api.mynotary.fr/api/v1`
- Pré-prod   : `https://api-preprod.mynotary.fr/api/v1`

| Method | Path                       | Purpose                                            |
| ------ | -------------------------- | -------------------------------------------------- |
| POST   | `/clients`                 | One-time agency linking → returns `OrganizationDto.id` |
| GET    | `/operations/{id}`         | Fetch records (property + contacts) for matching   |
| GET    | `/records/{id}`            | Fallback fetch when an operation only ships IDs    |
| GET    | `/register-entries`        | Backfill + daily cron (paginated by `page`/`pageSize`, `type=MANAGEMENT|TRANSACTION`) |
| GET    | `/signatures/{id}`         | (Reserved for future use — not yet called)         |

Headers used on every call:
- `x-api-key`         : application token (per environment)
- `x-api-date-version`: `2` (ISO timestamps in responses)

### Register entry filtering rules

`/register-entries` returns **every** entry that ever got a register
number, including those that are still mid-signature or were
abandoned. Only `status = "VALIDATED"` entries are actually signed.
Our backfill engine filters on `isEntrySigned()`:

- `VALIDATED`                                                   → ingest as signed
- `RESERVED` (signature launched, not yet completed)            → skip + soft-delete any stale row we may have stored
- `CLOSED`   (abandoned)                                        → skip + soft-delete

The `observations` field is a free-form French text — we additionally
parse it to recover the actual signature date (`Date de signature du
mandat : DD/MM/YYYY`), because the entry's `creationTime` is the day
the register number was reserved, not the signature day.

The TRANSACTION register at Sillage currently only holds exclusive
sale mandates (`Mandat de vente Exclusif`) reserving a future
transaction slot; actual offers, compromis, and actes will appear in
this register once a contract is launched against the operation.

## Boîte de réception des webhooks (octobre 2026)

Le webhook `POST /api/webhooks/mynotary` est une **boîte de réception**,
rien d'autre (`services/mynotary/event-inbox.service.ts`) :

1. authentification par l'en-tête dédié configuré chez MyNotary
   (`MYNOTARY_WEBHOOK_AUTH_HEADER` / `MYNOTARY_WEBHOOK_AUTH_VALUE`, type
   `APIKEY` côté MyNotary — l'endpoint n'est jamais public) ;
2. lecture des deux en-têtes MyNotary : `x-mynotary-event-id` (identifiant
   unique → `mynotary_events.event_id`, UNIQUE : **la base déduplique**, un
   doublon renvoie 2xx sans retraitement) et
   `x-mynotary-event-creation-time` (→ `event_created_at`, qui fixe l'ordre
   de traitement : les événements n'arrivent pas dans l'ordre) ;
3. insertion du payload brut, réponse `202` en quelques dizaines de ms
   (MyNotary exige un 2xx en moins de 60 s et abandonne après 12 échecs).

Le format réel du corps est **à plat** : `eventId` y contient le *type*
d'événement (`signature_completed`, …), jamais un identifiant
(`lib/mynotary/webhook-envelope.ts`). L'ancien handler attendait
`{ event, data }` et répondait 400 à tout webhook réel — aucun événement
n'avait été enregistré en production entre mai et octobre 2026.

Le traitement métier (classification, enrichissement par l'API,
rattachement, archivage) tourne **hors requête** : `after()` juste après la
réponse, puis le cron `/api/internal/cron/mynotary-events` toutes les
5 minutes. Il réserve un lot via la fonction SQL `claim_mynotary_events`
(FOR UPDATE SKIP LOCKED, ordre `event_created_at`), applique la projection
vers `mynotary_signed_documents` et marque chaque ligne
`processed` / `ignored` (type non projeté, raison dans `error`) / `error`
(repris jusqu'à 5 tentatives, puis visible pour la vue « Aujourd'hui »).

Événements projetés aujourd'hui : `signature_completed` (ingestion),
`signature_cancel` et `operation_deleted` (soft-delete). Tous les autres
types sont conservés en base et marqués `ignored` — l'étape 3 (modèle
« dossier ») changera la cible de `handleMyNotaryEvent`, pas la réception.

## Fichiers signés : identifiants, jamais d'URL

- `files[].signedFileId` est le seul identifiant persisté (`files` jsonb de
  `mynotary_signed_documents` = `[{ name, signedFileId }]`). L'URL signée
  livrée dans le webhook est un secret à durée limitée ; elle n'est jamais
  stockée et disparaît des payloads le 1er décembre 2026. En repli
  (anciens payloads), le dernier segment de l'URL donne l'identifiant.
- Un lien de téléchargement frais s'obtient à la demande par
  `GET /files/{fileId}` (`getFileDownloadUrl`), valable 7 jours.
- Le client envoie `x-api-documents-version: 2` sur tous les appels (format
  par défaut au 1er décembre 2026). L'upload se fait par `POST /files` en
  multipart (`uploadFile`) ; le flux `fileName` + `PUT uploadUrl` n'est pas
  utilisé.
- La route « liste des types d'opérations » (retirée le 1er novembre 2026)
  n'était pas appelée ; `listOrganizationOperationTypes` utilise
  `GET /organizations/operations`.

## Archivage et procédure de sortie

Chaque fichier a une ligne dans `mynotary_files` (`file_id` UNIQUE,
`kind` signed / proof, `signed_at`, `archive_due_at` = `signed_at`
+ 9 ans 6 mois, `archived_at`, `storage_path`, `last_error`).

- **Copie immédiate** : à réception, le PDF est copié dans le bucket privé
  `mynotary-archives` (`<contractId>/signed_<nom>.pdf`, `proof_<nom>.pdf`).
  Décision Yoann du 09/10/2026 : coût négligeable, sécurité en cas de
  résiliation. Un échec laisse la ligne sans `archived_at`.
- **Tâche mensuelle** `/api/internal/cron/mynotary-archive` (le 1er du mois) :
  copie ce qui arrive à échéance (horizon 31 jours) sans copie locale. Un
  échec reste en attente (`last_error`, `archive_attempts`) et remonte via
  `listOverdueMyNotaryFiles` (vue « Aujourd'hui »). Première échéance
  réelle : 2035.
- **Procédure de sortie** (à lancer avant toute résiliation) :

  ```bash
  MYNOTARY_API_KEY=<clé prod> npm run mynotary:export-files -- --out ~/Desktop/mynotary-export
  ```

  `scripts/mynotary-export-files.mjs` télécharge tous les `file_id`
  connus (table `mynotary_files` + `files[]` des documents) dans le dossier
  indiqué et écrit un `manifest.json` (chemin, taille, SHA-256, erreurs).
  Idempotent, reprenable (`--force` pour retélécharger).

### Questions ouvertes à poser à MyNotary (dev@mynotary.fr)

1. Point de départ exact des 10 ans de conservation : date de signature,
   date de validation, ou fin du dossier ? (Notre échéance d'archivage est
   calée sur `signatureTime` + 9 ans 6 mois ; à ajuster selon la réponse.)
2. L'accès à l'API et aux fichiers (`GET /files/{fileId}`) survit-il à une
   résiliation de l'abonnement, et pendant combien de temps ?

## Setup checklist

### 1. Receive credentials from MyNotary support

For each environment (pré-prod + production), MyNotary will send:

- An **application `x-api-key`** (issued by `support@mynotary.fr`).
- A **one-time organization token** (visible inside the MyNotary UI
  for the agency owner, or transmitted by the support team).

### 2. Add the keys to Vercel

Project Settings → Environment Variables :

| Name                     | Value                                       | Environments |
| ------------------------ | ------------------------------------------- | ------------ |
| `MYNOTARY_API_KEY`       | `<pré-prod app key>`                        | Preview      |
| `MYNOTARY_API_KEY`       | `<prod app key>`                            | Production   |
| `MYNOTARY_API_BASE_URL`  | `https://api-preprod.mynotary.fr/api/v1`    | Preview      |
| `MYNOTARY_API_BASE_URL`  | `https://api.mynotary.fr/api/v1`            | Production   |
| `MYNOTARY_ARCHIVE_BUCKET`| `mynotary-archives` (defaults to this)      | All          |

Redeploy after adding the variables.

### 3. Exchange the organization token for an organizationId

Locally, with the matching `MYNOTARY_API_KEY` and
`MYNOTARY_API_BASE_URL` exported in your shell:

```bash
MYNOTARY_API_KEY=<env-app-key> \
MYNOTARY_API_BASE_URL=<env-base-url> \
npm run mynotary:link-organization -- --org-token=<one-time-token>
```

Output:

```
Calling POST /clients on MyNotary…
Success. organizationId = 12345
  name    : Sillage Immo
  address : 1 rue de la Mer, 06000 Nice
```

### 4. Add the remaining env vars to Vercel

| Name                          | Value                                                | Notes                                                      |
| ----------------------------- | ---------------------------------------------------- | ---------------------------------------------------------- |
| `MYNOTARY_ORGANIZATION_ID`    | `<id-from-step-3>` (per environment)                 | Preview + Production                                       |
| `MYNOTARY_WEBHOOK_AUTH_HEADER`| `x-mynotary-secret` (or any custom header name)      | All                                                        |
| `MYNOTARY_WEBHOOK_AUTH_VALUE` | a 48-char random string (`openssl rand -hex 32`)     | Per environment — share each value with MyNotary support   |

Redeploy.

### 5. Ask MyNotary to configure the webhooks

Email `dev@mynotary.fr` with:

- **Production URL**: `https://sillage-immo.com/api/webhooks/mynotary`
  (déclarée : webhook id 19, type APIKEY — gérable par `GET/PUT /webhooks`)
- **Authentication method**: Custom Header (`APIKEY`)
- **Header name**: the value of `MYNOTARY_WEBHOOK_AUTH_HEADER`
- **Header value**: the matching `MYNOTARY_WEBHOOK_AUTH_VALUE` (one
  secret per environment, transmitted out-of-band)
- **Events**: `signature_completed`, `signature_cancel`, `operation_deleted`

### 6. Backfill historical mandates

Once steps 1–5 are green:

```bash
MYNOTARY_API_KEY=<env-app-key> \
MYNOTARY_API_BASE_URL=<env-base-url> \
MYNOTARY_ORGANIZATION_ID=<id-from-step-3> \
npm run mynotary:backfill
```

The script loops over BOTH registers:
- `MANAGEMENT` (mandats)
- `TRANSACTION` (promesses / compromis / actes)

and is idempotent (`mynotary_contract_id` is `UNIQUE`). After the
first run, a daily cron (`/api/internal/cron/mynotary-sync`) keeps the
registers in sync incrementally, walking both registers per run and
skipping entries older than `app_settings.mynotary.last_synced_at`.

## How a signed contract is matched to a Sillage project

The webhook handler runs a best-effort match against `seller_projects`
and `properties` after the row is stored. The matching score lives in
`mynotary_signed_documents.match_confidence`:

| Confidence | Method                                              |
| ---------- | --------------------------------------------------- |
| `1.00`     | One of the signers' emails matches `seller_leads.email` exactly (case-insensitive) |
| `0.70`     | Normalized property address matches `properties.formatted_address` exactly |
| `0.40`     | Address matches via `pg_trgm` similarity ≥ 0.6      |
| `0.00`     | No automatic match — the doc lands in `/admin/mynotary` "À rattacher" |

A manager can manually attach an unmatched document via
`POST /api/admin/mynotary/match`.

## Download endpoint

`GET /api/admin/mynotary/<id>/download?kind=signed|proof` : si une copie
existe dans le bucket, lien signé Supabase de 5 min (302) ; sinon lien
frais MyNotary via `GET /files/{fileId}` et flux proxifié côté serveur.
Aucune URL signée n'est jamais exposée au navigateur ni stockée.

## Operations runbook

- Webhook : un doublon (même `x-mynotary-event-id`) renvoie 202 sans
  retraitement. Un événement en `error` est repris par le cron toutes les
  5 minutes jusqu'à 5 tentatives ; au-delà il reste visible en base
  (`status = 'error'`) et doit être corrigé puis remis en `pending`.
- Vérifier la configuration : `GET /webhooks` avec la clé d'API (le secret
  n'est jamais renvoyé ; s'il est perdu, `PUT /webhooks/19` avec un nouveau
  `apikeyValue` ET la même valeur dans `MYNOTARY_WEBHOOK_AUTH_VALUE`).
- A mandate that never makes it to "signed" on the dashboard usually
  means the auto-match scored 0 — open `/admin/mynotary?matched=false`
  and rattach manually, or use the inline "Étapes du projet" form on
  the seller_project page to back-fill the date.
- To purge a wrongly-stored document: soft-delete via
  `update mynotary_signed_documents set deleted_at = now()` — the
  dashboard and MCP tools both filter on `deleted_at is null`.
- Archive failures are non-blocking: the document row still exists,
  the `mynotary_files` row keeps `last_error`, and the download endpoint
  falls back to a fresh MyNotary link from the file id.
