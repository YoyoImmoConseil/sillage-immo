# Base de données Sillage Immo

Ce dossier centralise le schéma, les migrations et les politiques RLS.

- `schema.sql` : référence du schéma global
- `install.sql` : installation complète (schéma + RLS)
- `migrations/` : migrations versionnées (ex: `20260303_001_add_audit_log_indexes.sql`, `20260303_002_harden_tool_versions_constraints.sql`, `20260303_003_add_tool_versions_lifecycle.sql`, `20260303_004_create_zone_catalog.sql`, `20260304_005_create_seller_leads.sql`)
- `policies/` : politiques RLS documentées
