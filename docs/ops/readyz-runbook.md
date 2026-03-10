# Runbook Readyz (Sillage Immo)

Ce runbook decrit les actions immediates quand `GET /api/internal/readyz` retourne `503`.

## 1) Missing core env

Raison: `missing_core_env`

Actions:

1. Verifier dans Vercel les variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_API_KEY`
   - `DOMAIN_EVENTS_CRON_SECRET`
2. Redepoyer la branche `main`.
3. Retester `GET /api/internal/readyz`.

## 2) Supabase unreachable

Raison: `supabase_unreachable`

Actions:

1. Verifier le statut Supabase.
2. Verifier les cles (`SUPABASE_SERVICE_ROLE_KEY`).
3. Retester:
   - `GET /api/internal/health?scope=core`
   - `GET /api/internal/readyz`

## 3) Domain events queue check failed

Raison: `domain_events_queue_check_failed`

Actions:

1. Verifier que la table `domain_events` existe et que la migration est appliquee.
2. Verifier les logs Vercel des routes:
   - `/api/internal/cron/domain-events`
   - `/api/admin/domain-events/process`
3. Corriger puis relancer le check readyz.

## 4) Domain events failed present

Raison: `domain_events_failed_present`

Actions:

1. Ouvrir la table `domain_events` et filtrer `status = failed`.
2. Lire `last_error`, `attempts`, `event_name`.
3. Corriger la cause metier ou technique.
4. Relancer un batch manuel:
   - `POST /api/admin/domain-events/process`
5. Verifier retour a `status = ready` sur `/api/internal/readyz`.

## Commandes utiles (local)

```bash
curl -i http://localhost:3000/api/internal/livez
curl -i http://localhost:3000/api/internal/readyz
curl -i "http://localhost:3000/api/internal/health?scope=core"
```
