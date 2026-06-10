import "server-only";
import { createHash } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { callOpenAiEmbedding } from "@/lib/ai/openai";
import {
  SILLAGE_AGENCY_KNOWLEDGE,
  SILLAGE_AGENCY_KNOWLEDGE_VERSION,
} from "@/lib/ai/knowledge/sillage-agency-knowledge";
import { computePropertyGoldenRecord } from "@/services/properties/golden-record.service";

export type EmbedEntityType =
  | "property"
  | "property_listing"
  | "seller_lead"
  | "buyer_lead"
  | "client_project"
  | "agency_knowledge"
  | "ai_conversation"
  | "mynotary_signed_document";

export type EmbedEntityInput = {
  entityType: EmbedEntityType;
  entityId: string;
  model?: string;
};

export type EmbedEntityResult = {
  entityType: EmbedEntityType;
  entityId: string;
  model: string;
  status: "embedded" | "skipped_unchanged" | "skipped_no_content";
  embeddingId: string | null;
  sourceTextHash: string;
  tokens: number;
  costMicros: number;
};

const sha256Hex = (value: string) =>
  createHash("sha256").update(value, "utf8").digest("hex");

const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
const SOURCE_EXCERPT_MAX_CHARS = 500;

const truncateExcerpt = (value: string) =>
  value.length > SOURCE_EXCERPT_MAX_CHARS
    ? value.slice(0, SOURCE_EXCERPT_MAX_CHARS)
    : value;

const stringifyArrayOrNull = (value: unknown): string => {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  return "";
};

const buildPropertySourceText = async (propertyId: string): Promise<string> => {
  const [propResult, listingResult] = await Promise.all([
    supabaseAdmin
      .from("properties")
      .select(
        "title, description, property_type, sub_type, city, postal_code, formatted_address, kind"
      )
      .eq("id", propertyId)
      .maybeSingle(),
    supabaseAdmin
      .from("property_listings")
      .select("title, city, postal_code, property_type, has_terrace, has_elevator")
      .eq("property_id", propertyId)
      .limit(1)
      .maybeSingle(),
  ]);
  if (propResult.error) throw new Error(propResult.error.message);
  if (!propResult.data) return "";

  const p = propResult.data as Record<string, unknown>;
  const l = (listingResult.data ?? {}) as Record<string, unknown>;
  const features: string[] = [];
  if (l.has_terrace === true) features.push("terrasse");
  if (l.has_elevator === true) features.push("ascenseur");

  return [
    p.title,
    p.description,
    p.property_type,
    p.sub_type,
    p.city,
    p.postal_code,
    p.formatted_address,
    p.kind,
    features.length ? `Equipements: ${features.join(", ")}` : null,
  ]
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .join("\n");
};

const buildPropertyListingSourceText = async (listingId: string): Promise<string> => {
  const { data, error } = await supabaseAdmin
    .from("property_listings")
    .select(
      "title, property_id, city, postal_code, property_type, rooms, bedrooms, living_area, has_terrace, has_elevator, price_amount, price_currency, business_type"
    )
    .eq("id", listingId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return "";

  const row = data as Record<string, unknown>;
  return [
    row.title,
    row.property_type,
    row.city,
    row.postal_code,
    row.business_type,
    typeof row.price_amount === "number"
      ? `Prix: ${row.price_amount} ${row.price_currency ?? "EUR"}`
      : null,
    typeof row.rooms === "number" ? `Pieces: ${row.rooms}` : null,
    typeof row.bedrooms === "number" ? `Chambres: ${row.bedrooms}` : null,
    typeof row.living_area === "number" ? `Surface: ${row.living_area} m2` : null,
    row.has_terrace === true ? "Terrasse: oui" : null,
    row.has_elevator === true ? "Ascenseur: oui" : null,
  ]
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .join("\n");
};

const buildSellerLeadSourceText = async (sellerLeadId: string): Promise<string> => {
  const { data, error } = await supabaseAdmin
    .from("seller_leads")
    .select("full_name, city, postal_code, property_type, message, metadata")
    .eq("id", sellerLeadId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return "";

  const row = data as Record<string, unknown>;
  const metadata = (row.metadata ?? {}) as Record<string, unknown>;
  const propertyDetails =
    typeof metadata.property_details === "object" && metadata.property_details
      ? JSON.stringify(metadata.property_details)
      : null;

  return [
    row.full_name,
    row.city,
    row.postal_code,
    row.property_type,
    row.message,
    propertyDetails ? `PropertyDetails: ${propertyDetails}` : null,
  ]
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .join("\n");
};

const buildBuyerLeadSourceText = async (buyerLeadId: string): Promise<string> => {
  const [leadResult, profileResult] = await Promise.all([
    supabaseAdmin
      .from("buyer_leads")
      .select("full_name, notes, metadata")
      .eq("id", buyerLeadId)
      .maybeSingle(),
    supabaseAdmin
      .from("buyer_search_profiles")
      .select(
        "business_type, location_text, cities, property_types, budget_min, budget_max, rooms_min, rooms_max, bedrooms_min, living_area_min, living_area_max, requires_terrace, requires_elevator, criteria"
      )
      .eq("buyer_lead_id", buyerLeadId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (leadResult.error) throw new Error(leadResult.error.message);
  if (!leadResult.data) return "";

  const lead = leadResult.data as Record<string, unknown>;
  const profile = (profileResult.data ?? {}) as Record<string, unknown>;
  const criteria =
    profile.criteria && typeof profile.criteria === "object"
      ? JSON.stringify(profile.criteria)
      : null;

  return [
    lead.full_name,
    lead.notes,
    profile.business_type ? `Type: ${profile.business_type}` : null,
    profile.location_text,
    profile.cities ? `Villes: ${stringifyArrayOrNull(profile.cities)}` : null,
    profile.property_types
      ? `Types: ${stringifyArrayOrNull(profile.property_types)}`
      : null,
    typeof profile.budget_min === "number" ? `Budget min: ${profile.budget_min}` : null,
    typeof profile.budget_max === "number" ? `Budget max: ${profile.budget_max}` : null,
    typeof profile.rooms_min === "number" ? `Pieces min: ${profile.rooms_min}` : null,
    typeof profile.rooms_max === "number" ? `Pieces max: ${profile.rooms_max}` : null,
    typeof profile.living_area_min === "number"
      ? `Surface min: ${profile.living_area_min}`
      : null,
    profile.requires_terrace === true ? "Terrasse requise" : null,
    profile.requires_elevator === true ? "Ascenseur requis" : null,
    criteria ? `Criteres: ${criteria}` : null,
  ]
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .join("\n");
};

const buildClientProjectSourceText = async (
  clientProjectId: string
): Promise<string> => {
  const [projectResult, sellerResult, linksResult] = await Promise.all([
    supabaseAdmin
      .from("client_projects")
      .select("title, status, project_type, created_from")
      .eq("id", clientProjectId)
      .maybeSingle(),
    supabaseAdmin
      .from("seller_projects")
      .select("project_status, mandate_status, entry_channel")
      .eq("client_project_id", clientProjectId)
      .maybeSingle(),
    supabaseAdmin
      .from("project_properties")
      .select("property_id")
      .eq("client_project_id", clientProjectId)
      .is("unlinked_at", null),
  ]);
  if (projectResult.error) throw new Error(projectResult.error.message);
  if (!projectResult.data) return "";

  const project = projectResult.data as Record<string, unknown>;
  const sellerProject = (sellerResult.data ?? {}) as Record<string, unknown>;
  const links = (linksResult.data ?? []) as Array<{ property_id: string }>;

  const propertyTexts: string[] = [];
  for (const link of links) {
    const t = await buildPropertySourceText(link.property_id);
    if (t) propertyTexts.push(t);
  }

  // Consolidated multi-source golden record so the copilot reasons on
  // the reconciled property/seller facts (estimateur + SweepBright +
  // MyNotary), not just one source. Best-effort.
  let goldenText: string | null = null;
  try {
    const golden = await computePropertyGoldenRecord(clientProjectId);
    if (golden) {
      const activeSources = [
        golden.sources.sweepbright ? "SweepBright" : null,
        golden.sources.mynotary ? "MyNotary" : null,
        golden.sources.estimator ? "Estimateur" : null,
      ].filter(Boolean);
      const lines = [
        golden.address.value ? `Adresse: ${golden.address.value}` : null,
        typeof golden.price.value === "number" ? `Prix retenu: ${golden.price.value} EUR` : null,
        typeof golden.livingArea.value === "number"
          ? `Surface retenue: ${golden.livingArea.value} m2`
          : null,
        golden.propertyType.value ? `Type: ${golden.propertyType.value}` : null,
        golden.seller.fullName.value ? `Vendeur: ${golden.seller.fullName.value}` : null,
        golden.seller.email.value ? `Email vendeur: ${golden.seller.email.value}` : null,
        golden.seller.phone.value ? `Tel vendeur: ${golden.seller.phone.value}` : null,
        activeSources.length ? `Sources: ${activeSources.join(", ")}` : null,
      ].filter((v): v is string => typeof v === "string" && v.length > 0);
      if (lines.length > 0) {
        goldenText = `Fiche unifiee:\n${lines.join("\n")}`;
      }
    }
  } catch {
    // golden record enrichment is best-effort
  }

  return [
    project.title,
    project.project_type ? `Type: ${project.project_type}` : null,
    project.status ? `Statut: ${project.status}` : null,
    project.created_from ? `Origine: ${project.created_from}` : null,
    sellerProject.project_status
      ? `Etape vendeur: ${sellerProject.project_status}`
      : null,
    sellerProject.mandate_status
      ? `Mandat: ${sellerProject.mandate_status}`
      : null,
    goldenText,
    propertyTexts.length ? `Biens lies:\n${propertyTexts.join("\n---\n")}` : null,
  ]
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .join("\n");
};

const buildAgencyKnowledgeSourceText = (entityId: string): string => {
  // The single agency knowledge document is referenced via a deterministic
  // entityId so it round-trips through entity_embeddings cleanly.
  return [
    `version=${SILLAGE_AGENCY_KNOWLEDGE_VERSION}`,
    `id=${entityId}`,
    SILLAGE_AGENCY_KNOWLEDGE,
  ].join("\n");
};

const AI_CONVERSATION_MAX_MESSAGES = 24;
const AI_CONVERSATION_MAX_CHAR_PER_MESSAGE = 800;

const buildAiConversationSourceText = async (
  conversationId: string
): Promise<string> => {
  // We embed the whole conversation (already PII-masked at write time
  // via lib/ai/conversation-logger) so semantic search can surface the
  // entire exchange when a snippet matches. Capped at the last N
  // messages and N characters per message to keep token usage bounded.
  const [convoResult, messagesResult] = await Promise.all([
    supabaseAdmin
      .from("ai_conversations")
      .select("entity_type, channel, locale, status, metadata")
      .eq("id", conversationId)
      .maybeSingle(),
    supabaseAdmin
      .from("ai_messages")
      .select("role, content, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(AI_CONVERSATION_MAX_MESSAGES),
  ]);
  if (convoResult.error) throw new Error(convoResult.error.message);
  if (!convoResult.data) return "";
  if (messagesResult.error) throw new Error(messagesResult.error.message);

  const convo = convoResult.data as Record<string, unknown>;
  const messages = (messagesResult.data ?? []) as Array<{
    role: string;
    content: string;
  }>;
  if (messages.length === 0) return "";

  const lines: string[] = [
    `channel=${convo.channel ?? ""}`,
    `entity_type=${convo.entity_type ?? ""}`,
    convo.locale ? `locale=${convo.locale}` : null,
  ].filter((v): v is string => typeof v === "string" && v.length > 0);

  for (const msg of messages) {
    if (msg.role === "system" || msg.role === "tool") continue;
    const safeRole = msg.role === "assistant" ? "Assistant" : "Utilisateur";
    const trimmed = msg.content.slice(0, AI_CONVERSATION_MAX_CHAR_PER_MESSAGE);
    lines.push(`${safeRole}: ${trimmed}`);
  }

  return lines.join("\n");
};

const normalizeAddress = (raw: string | null | undefined): string => {
  if (!raw) return "";
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
};

const extractAddressFromPayload = (
  payload: Record<string, unknown> | undefined | null
): string | null => {
  if (!payload || typeof payload !== "object") return null;
  const nested = (payload as Record<string, unknown>).payload as
    | Record<string, unknown>
    | undefined;
  const sources = [
    payload as Record<string, unknown>,
    nested ?? {},
  ];
  const keys = [
    "formattedAddress",
    "propertyAddress",
    "address",
    "operationAddress",
  ];
  for (const src of sources) {
    for (const k of keys) {
      const v = src[k];
      if (typeof v === "string" && v.trim().length > 0) return v.trim();
    }
  }
  return null;
};

const KIND_LABEL: Record<string, string> = {
  mandate: "Mandat de vente",
  purchase_offer: "Offre d'achat",
  preliminary_sale: "Compromis de vente",
};

const buildMyNotaryDocumentSourceText = async (
  documentId: string
): Promise<string> => {
  const { data, error } = await supabaseAdmin
    .from("mynotary_signed_documents")
    .select(
      "contract_kind, contract_type_raw, signed_at, signers, raw_payload"
    )
    .eq("id", documentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return "";

  const kindLabel = KIND_LABEL[data.contract_kind] ?? data.contract_kind;
  // signers is jsonb — narrow to the shape written at ingestion.
  const signers = (data.signers ?? []) as Array<{
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
  }>;
  const signersText =
    signers
      .map((s) => {
        const name = `${s.firstName ?? ""} ${s.lastName ?? ""}`.trim();
        const role = s.role ? ` (${s.role})` : "";
        return name ? `${name}${role}` : s.email ?? "";
      })
      .filter((s) => s.length > 0)
      .join(", ") || "—";
  const address = extractAddressFromPayload(data.raw_payload);
  const normalizedAddress = address ? normalizeAddress(address) : "";

  return [
    `Type: ${kindLabel} (${data.contract_type_raw ?? data.contract_kind})`,
    `Signé le: ${data.signed_at}`,
    `Signataires: ${signersText}`,
    address ? `Adresse: ${address}` : null,
    normalizedAddress ? `AdresseNormalisee: ${normalizedAddress}` : null,
  ]
    .filter((v): v is string => typeof v === "string" && v.length > 0)
    .join("\n");
};

const buildSourceText = async (input: EmbedEntityInput): Promise<string> => {
  switch (input.entityType) {
    case "property":
      return buildPropertySourceText(input.entityId);
    case "property_listing":
      return buildPropertyListingSourceText(input.entityId);
    case "seller_lead":
      return buildSellerLeadSourceText(input.entityId);
    case "buyer_lead":
      return buildBuyerLeadSourceText(input.entityId);
    case "client_project":
      return buildClientProjectSourceText(input.entityId);
    case "agency_knowledge":
      return buildAgencyKnowledgeSourceText(input.entityId);
    case "ai_conversation":
      return buildAiConversationSourceText(input.entityId);
    case "mynotary_signed_document":
      return buildMyNotaryDocumentSourceText(input.entityId);
    default:
      return "";
  }
};

export const embedEntity = async (
  input: EmbedEntityInput
): Promise<EmbedEntityResult> => {
  const model = input.model ?? DEFAULT_EMBEDDING_MODEL;
  const sourceText = (await buildSourceText(input)).trim();
  const sourceTextHash = sha256Hex(sourceText);

  if (sourceText.length === 0) {
    return {
      entityType: input.entityType,
      entityId: input.entityId,
      model,
      status: "skipped_no_content",
      embeddingId: null,
      sourceTextHash,
      tokens: 0,
      costMicros: 0,
    };
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("entity_embeddings")
    .select("id, source_text_hash")
    .eq("entity_type", input.entityType)
    .eq("entity_id", input.entityId)
    .eq("model", model)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);

  if (
    existing &&
    (existing as { source_text_hash: string }).source_text_hash === sourceTextHash
  ) {
    return {
      entityType: input.entityType,
      entityId: input.entityId,
      model,
      status: "skipped_unchanged",
      embeddingId: (existing as { id: string }).id,
      sourceTextHash,
      tokens: 0,
      costMicros: 0,
    };
  }

  const embeddingResult = await callOpenAiEmbedding({ input: sourceText, model });
  const excerpt = truncateExcerpt(sourceText);

  if (existing) {
    const { data, error } = await supabaseAdmin
      .from("entity_embeddings")
      .update({
        source_text_hash: sourceTextHash,
        source_text_excerpt: excerpt,
        embedding: embeddingResult.embedding,
        updated_at: new Date().toISOString(),
      })
      .eq("id", (existing as { id: string }).id)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return {
      entityType: input.entityType,
      entityId: input.entityId,
      model: embeddingResult.model,
      status: "embedded",
      embeddingId: data.id,
      sourceTextHash,
      tokens: embeddingResult.tokens,
      costMicros: embeddingResult.costMicros,
    };
  }

  const { data, error } = await supabaseAdmin
    .from("entity_embeddings")
    .insert({
      entity_type: input.entityType,
      entity_id: input.entityId,
      model: embeddingResult.model,
      source_text_hash: sourceTextHash,
      source_text_excerpt: excerpt,
      embedding: embeddingResult.embedding,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  return {
    entityType: input.entityType,
    entityId: input.entityId,
    model: embeddingResult.model,
    status: "embedded",
    embeddingId: data.id,
    sourceTextHash,
    tokens: embeddingResult.tokens,
    costMicros: embeddingResult.costMicros,
  };
};

const DOMAIN_EVENT_TO_EMBED_INPUT: Record<
  string,
  (event: { aggregateId: string }) => EmbedEntityInput | null
> = {
  "seller_lead.created": (event) => ({
    entityType: "seller_lead",
    entityId: event.aggregateId,
  }),
  "seller_lead.scored": (event) => ({
    entityType: "seller_lead",
    entityId: event.aggregateId,
  }),
  "seller_lead.ai_insight_generated": (event) => ({
    entityType: "seller_lead",
    entityId: event.aggregateId,
  }),
  "buyer_lead.created": (event) => ({
    entityType: "buyer_lead",
    entityId: event.aggregateId,
  }),
  "property_listing.published": (event) => ({
    entityType: "property_listing",
    entityId: event.aggregateId,
  }),
  // ai_conversation.* events come from lib/ai/conversation-logger:
  // turn_appended on every Q/A pair, closed when the conversation is
  // explicitly archived. We embed in both cases — the second run is
  // a no-op when the source_text_hash is unchanged.
  "ai_conversation.turn_appended": (event) => ({
    entityType: "ai_conversation",
    entityId: event.aggregateId,
  }),
  "ai_conversation.closed": (event) => ({
    entityType: "ai_conversation",
    entityId: event.aggregateId,
  }),
  // MyNotary signed documents land in entity_embeddings so the
  // copilot can search "mandat signé rue de la Roquette" via
  // ai.semantic_search → contracts.
  "mynotary.mandate_signed": (event) => ({
    entityType: "mynotary_signed_document",
    entityId: event.aggregateId,
  }),
  "mynotary.offer_signed": (event) => ({
    entityType: "mynotary_signed_document",
    entityId: event.aggregateId,
  }),
  "mynotary.preliminary_sale_signed": (event) => ({
    entityType: "mynotary_signed_document",
    entityId: event.aggregateId,
  }),
};

export const embedFromDomainEvent = async (event: {
  eventName: string;
  aggregateId: string;
}): Promise<EmbedEntityResult | null> => {
  const builder = DOMAIN_EVENT_TO_EMBED_INPUT[event.eventName];
  if (!builder) return null;
  const input = builder(event);
  if (!input) return null;
  try {
    return await embedEntity(input);
  } catch {
    // Embedding is a best-effort enrichment; do not throw to the caller.
    return null;
  }
};

export const __internal_buildSourceText = buildSourceText;
