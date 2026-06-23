# App Zapier privée — Sillage Immo

App Zapier (Zapier Platform) qui pousse des données dans Sillage Immo via l'API
d'intégration REST `/api/integrations/v1/*`. Objectif : alimenter
**transactions**, **observations de marché** et **leads acquéreurs** depuis
SweepBright et MyNotary, ce qui nourrit la base et les analyses du Copilot admin.

## Architecture

```
SweepBright / MyNotary  ──(Zap)──►  App Zapier "Sillage Immo"  ──HTTPS+clé──►  /api/integrations/v1/*  ──►  services Sillage  ──►  Supabase
```

- **Auth** : clé API (`Authorization: Bearer sk_mcp_…`) générée dans le
  back-office. Réutilise le système de clés `mcp_api_keys`.
- **Actions (Creates)** :
  - `transaction` → `POST /api/integrations/v1/transactions` (upsert par `externalId`)
  - `market_observation` → `POST /api/integrations/v1/market-observations`
  - `buyer_lead` → `POST /api/integrations/v1/buyer-leads`
- Pas de triggers sortants en v1.

## 1. Générer une clé API

Dans le back-office Sillage Immo : **/admin/mcp-keys** → bouton
**« Préréglage Zapier »** (coche les 3 capacités d'intégration + l'écriture) →
**Créer la clé**. Copiez la clé `sk_mcp_…` affichée une seule fois.

Capacités (scopes) disponibles, à restreindre au besoin :
- `integrations:transactions`
- `integrations:market`
- `integrations:buyer_leads`

## 2. Déployer l'app (compte Zapier requis)

```bash
cd integrations/zapier
npm install
npx zapier login          # connexion à votre compte Zapier
npx zapier register "Sillage Immo"   # à faire une seule fois (crée l'app)
npx zapier push           # pousse le code vers Zapier
```

L'app reste **privée** par défaut (non listée dans l'annuaire) tant qu'elle
n'est pas soumise à la revue publique.

## 3. Partager en privé

- Soit inviter des utilisateurs : `npx zapier users:add email@exemple.com`
- Soit récupérer le lien d'invitation dans le dashboard Zapier
  (`https://developer.zapier.com` → votre app → *Sharing*) et l'ouvrir pour
  ajouter l'app à votre compte Zapier.

Dans Zapier, créez la connexion : collez la clé `sk_mcp_…`. Le test de
connexion appelle `GET /api/integrations/v1/me` et affiche
« Sillage Immo — <nom de la clé> ».

## 4. Brancher les Zaps

### Exemple — SweepBright deal signé → Transaction
1. **Trigger** : SweepBright (ou Webhooks by Zapier) sur l'événement de deal.
2. **Action** : Sillage Immo → *Créer ou mettre à jour une transaction*.
   - `ID externe` = identifiant du deal SweepBright (idempotence).
   - `Statut` = `acte` (ou `compromis`), `Honoraires (CA HT)`, `Date acte`, etc.

### Exemple — MyNotary contrat signé → Transaction
1. **Trigger** : MyNotary (ou Webhooks by Zapier).
2. **Action** : *Créer ou mettre à jour une transaction*, `ID externe` =
   id du contrat MyNotary.

### Exemple — Nouveau contact acquéreur → Lead acquéreur
1. **Trigger** : votre source (formulaire, CRM, SweepBright contact).
2. **Action** : Sillage Immo → *Créer un lead acquéreur*. `Email` requis,
   `Consentement RGPD` doit être vrai.

## Idempotence & limites

- **Transactions / observations** : renseignez toujours `ID externe` pour que
  les rejeux Zapier mettent à jour au lieu de dupliquer.
- **Leads acquéreurs** : déduplication par email (upsert).
- **Rate limit** : porté par la clé (défaut 60/min ; ajustable à la création).
- **Erreurs** : l'API renvoie `{ ok: false, code, message }` + un code HTTP
  (401 clé invalide, 403 scope/IP, 422 payload, 429 débit) que Zapier affiche.

## Variables

- `baseUrl` (champ de connexion) : `https://sillage-immo.com` par défaut.
  À modifier seulement pour un environnement de test.
