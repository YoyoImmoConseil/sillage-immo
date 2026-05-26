# MyNotary integration — phase 1 (inbound)

Sillage ingests signed contracts from MyNotary (https://dev.mynotary.fr/external)
to fuel:

- the `/admin` dashboard KPI cards (Mandats / Offres / Compromis signés)
- the `/admin/mynotary` rattachement console
- the MCP tools `mynotary.list_signed_documents`,
  `mynotary.get_signed_document`, `mynotary.stats_signed_by_period`
- the admin copilot (so a manager can ask "Combien de mandats signés
  cette semaine ?" in natural language)

Phase 1 is **inbound only**: Sillage does not create operations or
records inside MyNotary. The integration consumes signature events.

## Endpoints we use

| Method | Path                       | Purpose                                       |
| ------ | -------------------------- | --------------------------------------------- |
| POST   | `/clients`                 | One-time agency linking → returns `organizationId` |
| GET    | `/operations/{id}`         | Fetch records (property + contacts) for matching   |
| GET    | `/records/{id}`            | Fallback fetch when an operation only ships IDs    |
| GET    | `/register-entries`        | Backfill + daily cron                              |

We also receive 3 webhook event types:

- `signature_completed` — the only event that actually ingests rows
- `signature_cancel`    — invalidates a previously stored document
- `operation_deleted`   — soft-deletes any document tied to the operation

Every payload is appended verbatim to `mynotary_events` (idempotent on
`event_id`).

## Setup checklist

### 1. Get credentials from MyNotary support

Email `dev@mynotary.fr` and ask for:

- An **application `x-api-key`** for Sillage Immo (one per integration).
- The **one-time organization token** for the Sillage Immo agency
  (it is shown to the agency owner inside the MyNotary UI).

### 2. Add `MYNOTARY_API_KEY` to Vercel

In Vercel project settings → Environment Variables, add:

| Name             | Value                       | Environments         |
| ---------------- | --------------------------- | -------------------- |
| `MYNOTARY_API_KEY` | the application x-api-key | Production + Preview |

Redeploy.

### 3. Exchange the organization token for an organizationId

Locally, with the `MYNOTARY_API_KEY` exported in your shell:

```bash
MYNOTARY_API_KEY=<your-app-key> \
npm run mynotary:link-organization -- --org-token=<one-time-token>
```

Output:

```
Calling POST /clients on MyNotary…
Success. organizationId = 12345
```

### 4. Add the remaining env vars to Vercel

| Name                          | Value                                                | Notes                                                      |
| ----------------------------- | ---------------------------------------------------- | ---------------------------------------------------------- |
| `MYNOTARY_ORGANIZATION_ID`    | `12345` (from step 3)                                | Production + Preview                                        |
| `MYNOTARY_WEBHOOK_AUTH_HEADER`| `x-mynotary-secret` (or any custom header name)      | Production + Preview                                        |
| `MYNOTARY_WEBHOOK_AUTH_VALUE` | a 48-char random string (e.g. `openssl rand -hex 32`)| Production + Preview — share this value with MyNotary support |

Redeploy.

### 5. Ask MyNotary to configure the webhook

Email `dev@mynotary.fr` with:

- **Webhook URL**: `https://sillage-immobilier.com/api/webhooks/mynotary`
- **Authentication method**: Custom Header
- **Header name**: the value of `MYNOTARY_WEBHOOK_AUTH_HEADER`
- **Header value**: the value of `MYNOTARY_WEBHOOK_AUTH_VALUE`
- **Events**: `signature_completed`, `signature_cancel`, `operation_deleted`

### 6. Backfill historical mandates

Once steps 1–5 are green:

```bash
MYNOTARY_API_KEY=<your-app-key> \
MYNOTARY_ORGANIZATION_ID=<id-from-step-3> \
npm run mynotary:backfill
```

The script is idempotent (`mynotary_contract_id` is `UNIQUE`), so it
is safe to re-run. After the first run, a daily cron
(`/api/cron/mynotary-sync`) keeps the register in sync incrementally.

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

## Operations runbook

- Webhook delivery failures: MyNotary retries with backoff. Replays
  hit the `mynotary_events.event_id UNIQUE` constraint and return
  `200 OK` without re-processing.
- A mandate that never makes it to "signed" on the dashboard usually
  means the auto-match scored 0 — open `/admin/mynotary?matched=false`
  and rattach manually.
- To purge a wrongly-stored document: soft-delete via
  `update mynotary_signed_documents set deleted_at = now()` — the
  dashboard and MCP tools both filter on `deleted_at is null`.
