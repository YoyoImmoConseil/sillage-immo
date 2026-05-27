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

We also receive 3 webhook event types:

- `signature_completed` — the only event that actually ingests rows.
  Payload ships `files[].url` with **short-lived signed URLs** for the
  signed PDFs; we download + archive them in our Storage bucket on
  receipt.
- `signature_cancel`    — soft-deletes a previously stored document.
- `operation_deleted`   — soft-deletes any document tied to the operation.

Every payload is appended verbatim to `mynotary_events` (idempotent on
`event_id`). Signed PDFs land in the `mynotary-archives` Supabase
Storage bucket (path: `<mynotary_contract_id>/signed_<name>.pdf` and
`<mynotary_contract_id>/proof_<name>.pdf` when delivered).

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

- **Pré-prod URL**: `https://preprod.sillage-immobilier.com/api/webhooks/mynotary`
- **Production URL**: `https://sillage-immobilier.com/api/webhooks/mynotary`
- **Authentication method**: Custom Header
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

## How the signed PDF is archived

`services/mynotary/archive-signed-document.service.ts` downloads each
file in `signature_completed.files[]` (max 20 MB / file) and pushes
it to the **private** `mynotary-archives` Supabase Storage bucket.

- Files whose name hints at an eIDAS audit trail (`preuve`,
  `proof`, `certificat`, `audit`, `eidas`) are stored as
  `signature_proof_path`.
- Every other file is stored as `signed_document_path`.

The admin UI exposes short-lived (5 min) signed download URLs via
`GET /api/admin/mynotary/<id>/download?kind=signed|proof`. The
underlying objects never leave the bucket — RLS is service-role-only.

If MyNotary later confirms a dedicated endpoint for the eIDAS proof,
the archive service can be extended to fetch it on demand without a
schema change (the column already exists).

## Operations runbook

- Webhook delivery failures: MyNotary retries with backoff. Replays
  hit the `mynotary_events.event_id UNIQUE` constraint and return
  `200 OK` without re-processing.
- A mandate that never makes it to "signed" on the dashboard usually
  means the auto-match scored 0 — open `/admin/mynotary?matched=false`
  and rattach manually, or use the inline "Étapes du projet" form on
  the seller_project page to back-fill the date.
- To purge a wrongly-stored document: soft-delete via
  `update mynotary_signed_documents set deleted_at = now()` — the
  dashboard and MCP tools both filter on `deleted_at is null`.
- Archive failures are non-blocking: the document row still exists
  and the original (short-lived) `files[].url` remains visible in the
  list UI under "Ouvrir (MyNotary)" until it expires.
