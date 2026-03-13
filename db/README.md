# Base de données Sillage Immo

Ce dossier centralise le schéma, les migrations et les politiques RLS.

- `schema.sql` : référence du schéma global
- `install.sql` : installation complète (schéma + RLS)
- `migrations/` : migrations versionnées (ex: `20260303_001_add_audit_log_indexes.sql`, `20260303_002_harden_tool_versions_constraints.sql`, `20260303_003_add_tool_versions_lifecycle.sql`, `20260303_004_create_zone_catalog.sql`, `20260304_005_create_seller_leads.sql`, `20260305_006_create_seller_scoring_events.sql`, `20260305_007_create_seller_email_verifications.sql`, `20260309_008_create_domain_events.sql`, `20260310_009_create_api_idempotency_keys.sql`, `20260311_010_enable_rls_seller_email_verifications.sql`, `20260312_011_create_sweepbright_listings_domain.sql`, `20260312_012_add_listing_advanced_filters.sql`, `20260312_013_create_admin_rbac_and_buyer_domain.sql`, `20260313_014_enable_admin_sso_authorizations.sql`)
- `policies/` : politiques RLS documentées
