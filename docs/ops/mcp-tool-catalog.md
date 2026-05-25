# MCP Tool Catalog

All tools are versioned (`1.0.0`), schema-validated, audited, and
registered in `public.tool_versions`. The list below is grouped by
domain. Each fiche includes the canonical name, what it does, and a
minimal input example.

> Read-only tools are tagged `[RO]`. Mutating tools are tagged `[RW]`
> and emit a corresponding `domain_event`.

---

## Leads (cross-tunnel)

### `leads.create` `[RW]`
Persist a generic incoming lead. Emits `seller_lead.created` via the
seller-lead service when the lead is routed there.

```json
{ "fullName": "Alice Bonnet", "email": "alice@example.com", "phone": "+33611223344", "message": "Studio Promenade" }
```

### `leads.score` `[RO]`
Compute a priority score for a lead.

```json
{ "fullName": "Alice Bonnet", "email": "alice@example.com", "budget": 280000, "zoneTier": "tier_1" }
```

---

## Seller leads

### `seller_leads.create_or_reuse` `[RW]` — emits `seller_lead.created` or `seller_lead.duplicate_detected`
```json
{ "fullName": "Marc Leroy", "email": "marc@leroy.fr", "propertyType": "apartment", "city": "Nice", "estimatedPrice": 450000 }
```

### `seller_leads.score` `[RW]` — emits `seller_lead.scored`
```json
{ "sellerLeadId": "550e8400-e29b-41d4-a716-446655440000" }
```

### `seller_leads.generate_ai_insight` `[RW]` — emits `seller_lead.ai_insight_generated`
```json
{ "sellerLeadId": "550e8400-e29b-41d4-a716-446655440000" }
```

### `seller_leads.get_context` `[RO]`
```json
{ "sellerLeadId": "550e8400-e29b-41d4-a716-446655440000" }
```

### `seller_leads.enrich` `[RW]`
Orchestrates `create_or_reuse` + `score` + `generate_ai_insight`.

---

## Home assistant

### `home_assistant.get_context` `[RO]`
Returns the homepage assistant context snapshot.

```json
{}
```

---

## Properties (SweepBright-mirrored)

### `properties.search` `[RO]`
Multi-criteria filter on `property_listings` joined with `properties`.

```json
{ "city": "Nice", "businessType": "sale", "priceMin": 200000, "priceMax": 600000, "roomsMin": 3, "limit": 20 }
```

### `properties.get` `[RO]` — accepts `{propertyId}` OR `{slug}` (oneOf)
```json
{ "propertyId": "550e8400-e29b-41d4-a716-446655440000" }
```

### `properties.list_recent` `[RO]`
```json
{ "limit": 20 }
```

---

## Property listings

### `property_listings.publish` `[RW]` — emits `property_listing.published`
```json
{ "listingId": "550e8400-e29b-41d4-a716-446655440000" }
```

### `property_listings.unpublish` `[RW]` — emits `property_listing.unpublished`
```json
{ "listingId": "550e8400-e29b-41d4-a716-446655440000", "reason": "withdrawn" }
```

---

## Property visits (Zapier-mirrored)

### `property_visits.list_for_property` `[RO]` — audience-aware
```json
{ "propertyId": "550e8400-e29b-41d4-a716-446655440000", "audience": "client" }
```

### `property_visits.list_for_seller_project` `[RO]`
```json
{ "sellerProjectId": "550e8400-e29b-41d4-a716-446655440000" }
```

---

## Property documents

### `property_documents.list_for_property` `[RO]` — audience-aware
```json
{ "propertyId": "550e8400-e29b-41d4-a716-446655440000", "audience": "admin" }
```

For `audience=client`, also pass `clientProfileId`. See the privacy
matrix in `db/migrations/20260602_022_indivision_and_property_documents.sql`.

---

## Buyer leads + searches

### `buyer_leads.create_or_enrich` `[RW]` — emits `buyer_lead.created`
Creates the lead + search profile, kicks off matching.

```json
{ "fullName": "Camille Roux", "email": "camille@example.com", "searchDetails": "T3 Nice ouest 350k" }
```

### `buyer_leads.get_context` `[RO]`
```json
{ "buyerLeadId": "550e8400-e29b-41d4-a716-446655440000" }
```

### `buyer_searches.upsert` `[RW]`
```json
{ "buyerLeadId": "550e8400-e29b-41d4-a716-446655440000", "businessType": "sale", "cities": ["Nice", "Antibes"], "budgetMin": 300000, "budgetMax": 500000 }
```

---

## Buyer matching

### `buyer_matching.recompute_for_lead` `[RW]`
### `buyer_matching.recompute_for_property` `[RW]`
### `buyer_matching.list_for_lead` `[RO]`
### `buyer_matching.list_for_property` `[RO]`

```json
{ "buyerLeadId": "550e8400-e29b-41d4-a716-446655440000" }
```

---

## Valuations

### `valuations.list_for_project` `[RO]`
### `valuations.get_latest_for_project` `[RO]`

```json
{ "clientProjectId": "550e8400-e29b-41d4-a716-446655440000" }
```

---

## Client projects

### `client_projects.list` `[RO]`
```json
{ "projectType": "seller", "status": "active", "limit": 50 }
```

### `client_projects.get` `[RO]`
```json
{ "clientProjectId": "550e8400-e29b-41d4-a716-446655440000" }
```

### `client_projects.timeline` `[RO]` — audience-aware
```json
{ "clientProjectId": "550e8400-e29b-41d4-a716-446655440000", "audience": "client", "limit": 50 }
```

---

## Seller projects

### `seller_projects.advance_status` `[RW]` — emits `seller_project.status_changed`
Enum: `estimation_realisee | a_contacter | rdv_estimation_planifie |
estimation_physique_realisee | mandat_en_preparation | mandat_signe |
bien_en_commercialisation | bien_sous_offre | bien_vendu | projet_suspendu`.

```json
{ "sellerProjectId": "550e8400-e29b-41d4-a716-446655440000", "nextStatus": "mandat_signe", "reason": "Signature digitale OK." }
```

### `seller_projects.assign_advisor` `[RW]` — emits `seller_project.advisor_assigned`
```json
{ "sellerProjectId": "550e8400-...", "adminProfileId": "550e8400-...", "reason": "Sectorisation" }
```

---

## Contacts

### `contacts.find_or_merge` `[RW]`
Returns (or creates) a unified `contact_identity`.

```json
{ "email": "alice@example.com", "phone": "+33611223344", "fullName": "Alice Bonnet" }
```

---

## AI

### `ai.semantic_search` `[RO]`
Embeds the query (OpenAI) and ranks `entity_embeddings` by cosine.

```json
{ "query": "appartement avec terrasse Nice ouest", "entityTypes": ["property_listing"], "limit": 10, "threshold": 0.6 }
```

### `ai.embed_entity` `[RW]`
Force an embedding refresh. Idempotent via `source_text_hash`.

```json
{ "entityType": "seller_lead", "entityId": "550e8400-e29b-41d4-a716-446655440000" }
```

---

## Audit

### `audit.search` `[RO]`
```json
{ "tool": "buyer_leads.create_or_enrich", "status": "error", "from": "2026-05-01T00:00:00Z", "limit": 50 }
```
