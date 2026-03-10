# Sillage Immo - Plateforme Immobiliere Premium

Sillage Immo est une plateforme immobiliere orientee production pour Nice et la Cote d'Azur:

- Site premium de generation de leads (vendeurs + acquereurs)
- Back-office metier pour piloter les leads vendeurs
- Backend IA-ready avec couche MCP (Model Context Protocol)
- Infrastructure orientee scalabilite et observabilite (health/readyz/domain events)

Stack principale:

- Next.js 16 (App Router), TypeScript strict
- Supabase (Postgres, Auth, RLS, policies SQL)
- MCP tools versionnes et audites

## Composantes produit (etat actuel)

- **Marketing premium**
  - Home et parcours de conversion
  - Parcours estimation vendeur (`/estimation`, `/merci-vendeur`)
  - Formulaire acquereur et assistant commercial home
- **CRM vendeur**
  - Dashboard admin leads vendeurs (`/admin/seller-leads`)
  - Fiche lead detaillee avec edition statut/details bien
  - Scoring vendeur + AI insight + synchro valuation
- **Couches IA-ready**
  - Endpoint MCP (`GET/POST /api/mcp`)
  - Registry des tools (`lib/mcp/*`)
  - Catalogue de versions tools (`/api/admin/tool-versions`)
  - Journalisation/audit des executions MCP
- **Resilience et operations**
  - Domain events + processor
  - Idempotency API (`api_idempotency_keys`)
  - Probes internes: `/api/internal/livez`, `/api/internal/health`, `/api/internal/readyz`
  - Runbook readyz: `docs/ops/readyz-runbook.md`

## Structure projet

- `app/` routes UI + API
- `app/api/` endpoints metier et internes
- `services/` logique metier (leads, scoring, events, seller flows)
- `lib/` clients, env, MCP, audit, utilitaires
- `db/` schema SQL, migrations, policies RLS
- `types/` types partages (Supabase DB)
- `docs/` documentation operationnelle

## Installation locale

1. Installer les dependances:

```bash
npm install
```

2. Copier les variables d'environnement:

```bash
cp .env.example .env.local
```

3. Renseigner les cles necessaires dans `.env.local`.

4. Lancer le serveur:

```bash
npm run dev
```

Application locale: [http://localhost:3000](http://localhost:3000)

## Variables d'environnement principales

Obligatoires en production:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_API_KEY`
- `DOMAIN_EVENTS_CRON_SECRET`

Selon les modules actives:

- `OPENAI_API_KEY`
- `LOUPE_API_BASE_URL`, `LOUPE_API_EMAIL`, `LOUPE_API_PASSWORD`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`

Reference complete: `.env.example`

## Base de donnees

- Documentation DB: `db/README.md`
- Installation complete: `db/install.sql`
- Schema de reference: `db/schema.sql`
- Migrations versionnees: `db/migrations/*`
- Policies RLS: `db/policies/*`

## Endpoints internes utiles

- `GET /api/internal/livez`: disponibilite process
- `GET /api/internal/health?scope=core|full`: etat env + Supabase + queue events
- `GET /api/internal/readyz`: prete pour trafic metier
- `POST /api/admin/domain-events/process`: traitement manuel des events en attente

## Vision cible (fusion des chantiers)

Le socle actuel couvre deja les composantes critiques de la phase "plateforme":

- Acquisition leads multi-parcours
- CRM vendeur operationnel
- Couche IA/MCP securisee et versionnee
- Fondations ops (health/readiness/events/idempotency)

La suite naturelle est d'intensifier:

- durcissement des tests (integration API + workflows metier),
- extension du CRM (auth/roles plus fines),
- automatisations IA supplementaires sur les workflows internes.
