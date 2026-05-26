-- 20260527_036_entity_embeddings_mynotary.sql
--
-- Extend `entity_embeddings.entity_type` to accept
-- 'mynotary_signed_document' so the embedding worker can vectorize
-- signed contracts for the copilot's semantic search.
--
-- Idempotent.

begin;

alter table public.entity_embeddings
  drop constraint if exists chk_entity_embeddings_entity_type;

alter table public.entity_embeddings
  add constraint chk_entity_embeddings_entity_type
  check (
    entity_type = any (
      array[
        'property',
        'property_listing',
        'seller_lead',
        'buyer_lead',
        'client_project',
        'agency_knowledge',
        'ai_conversation',
        'mynotary_signed_document'
      ]
    )
  );

commit;
