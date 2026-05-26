import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { emitDomainEvent } from "@/lib/events/domain-events";
import { maskPiiWithMeta, type PiiMaskMeta } from "./pii-mask";

// Single entry point used by every IA surface (seller chat, home
// assistant, future buyer chat, admin copilot…) to persist a turn
// into `ai_conversations` + `ai_messages` and emit the domain event
// that the embedding worker listens to.
//
// Why a wrapper around the existing `callOpenAiChat({conversationId})`
// auto-persist path?
//
//   - We need an upsert step ("ensure the conversation exists") that
//     the chat helper does not own.
//   - We need to mask PII *before* the row hits the database so the
//     audit_log + embeddings pipeline never sees raw emails or phone
//     numbers (basic-v1 masking is documented in lib/ai/pii-mask.ts).
//   - We want a *single* place that emits `conversation_turn_appended`
//     so the embedding worker has one trigger and no race between
//     the seller chat metadata write and the audit hook.

const VALID_ENTITY_TYPES = [
  "seller_lead",
  "buyer_lead",
  "client_project",
  "property",
  "admin",
  "anonymous",
  "system",
] as const;

const VALID_CHANNELS = [
  "seller_chat",
  "seller_ai_insight",
  "home_assistant",
  "mcp_tool",
  "admin_console",
  "rag_query",
] as const;

export type ConversationEntityType = (typeof VALID_ENTITY_TYPES)[number];
export type ConversationChannel = (typeof VALID_CHANNELS)[number];

export type EnsureConversationInput = {
  conversationId?: string | null;
  entityType: ConversationEntityType;
  channel: ConversationChannel;
  entityId?: string | null;
  sellerLeadId?: string | null;
  buyerLeadId?: string | null;
  clientProjectId?: string | null;
  anonymousSessionId?: string | null;
  locale?: string | null;
  model?: string | null;
  metadata?: Record<string, unknown>;
};

export type ConversationHandle = {
  id: string;
  isNew: boolean;
};

export type LogConversationTurnInput = EnsureConversationInput & {
  userMessage: string;
  assistantMessage: string;
  usage?: {
    tokensIn?: number;
    tokensOut?: number;
    costMicros?: number;
  };
  finishReason?: string | null;
  toolName?: string | null;
  toolVersion?: string | null;
  requestId?: string | null;
  closeAfter?: boolean;
};

export type LogConversationTurnResult = {
  conversationId: string;
  userMessageId: string | null;
  assistantMessageId: string | null;
  piiMaskingMeta: {
    user: PiiMaskMeta;
    assistant: PiiMaskMeta;
  };
};

const looksLikeAnonymousSessionUuid = (
  value: string | null | undefined
): value is string => {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
};

const buildConversationMetadata = (
  input: EnsureConversationInput
): Record<string, unknown> => {
  const base: Record<string, unknown> = { ...(input.metadata ?? {}) };
  if (
    looksLikeAnonymousSessionUuid(input.anonymousSessionId) &&
    !base.anonymous_session_id
  ) {
    base.anonymous_session_id = input.anonymousSessionId;
  }
  base.pii_masking_version = "basic-v1";
  return base;
};

export const ensureConversation = async (
  input: EnsureConversationInput
): Promise<ConversationHandle> => {
  if (!VALID_ENTITY_TYPES.includes(input.entityType)) {
    throw new Error(`Invalid conversation entityType: ${input.entityType}`);
  }
  if (!VALID_CHANNELS.includes(input.channel)) {
    throw new Error(`Invalid conversation channel: ${input.channel}`);
  }

  // Pre-existing conversation: just bump updated_at (the table has a
  // trigger) and reuse it. We intentionally do NOT overwrite the
  // metadata here — the conversation owner is the authoritative source
  // for that.
  if (input.conversationId) {
    const { data, error } = await supabaseAdmin
      .from("ai_conversations")
      .select("id")
      .eq("id", input.conversationId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data?.id) return { id: data.id, isNew: false };
  }

  // Anonymous flows: try to reuse the latest open conversation tied to
  // this anonymous_session_id so multiple turns from the same browser
  // attach to the same row instead of creating one per turn.
  if (
    !input.conversationId &&
    input.entityType === "anonymous" &&
    looksLikeAnonymousSessionUuid(input.anonymousSessionId)
  ) {
    const { data, error } = await supabaseAdmin
      .from("ai_conversations")
      .select("id")
      .eq("entity_type", "anonymous")
      .eq("channel", input.channel)
      .eq("status", "open")
      .filter("metadata->>anonymous_session_id", "eq", input.anonymousSessionId!)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data?.id) return { id: data.id, isNew: false };
  }

  const { data, error } = await supabaseAdmin
    .from("ai_conversations")
    .insert({
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      channel: input.channel,
      model: input.model ?? null,
      locale: input.locale ?? null,
      seller_lead_id: input.sellerLeadId ?? null,
      buyer_lead_id: input.buyerLeadId ?? null,
      client_project_id: input.clientProjectId ?? null,
      metadata: buildConversationMetadata(input),
      status: "open",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id, isNew: true };
};

const insertMessage = async (input: {
  conversationId: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  model: string | null;
  tokensIn?: number;
  tokensOut?: number;
  costMicros?: number;
  finishReason?: string | null;
  toolName?: string | null;
  toolVersion?: string | null;
  requestId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<string | null> => {
  const { data, error } = await supabaseAdmin
    .from("ai_messages")
    .insert({
      conversation_id: input.conversationId,
      role: input.role,
      content: input.content,
      model: input.model,
      tokens_in: typeof input.tokensIn === "number" ? input.tokensIn : null,
      tokens_out: typeof input.tokensOut === "number" ? input.tokensOut : null,
      cost_micros:
        typeof input.costMicros === "number" ? input.costMicros : null,
      finish_reason: input.finishReason ?? null,
      tool_name: input.toolName ?? null,
      tool_version: input.toolVersion ?? null,
      request_id: input.requestId ?? null,
      metadata: input.metadata ?? {},
    })
    .select("id")
    .single();
  if (error) {
    // Best-effort: do not break the upstream LLM call if the message
    // persistence trips on a transient RLS / connection issue.
    return null;
  }
  return data.id;
};

export const logConversationTurn = async (
  input: LogConversationTurnInput
): Promise<LogConversationTurnResult> => {
  const conversation = await ensureConversation(input);

  const userMasked = maskPiiWithMeta(input.userMessage ?? "");
  const assistantMasked = maskPiiWithMeta(input.assistantMessage ?? "");

  const userMessageId = await insertMessage({
    conversationId: conversation.id,
    role: "user",
    content: userMasked.text,
    model: input.model ?? null,
    toolName: input.toolName ?? null,
    toolVersion: input.toolVersion ?? null,
    requestId: input.requestId ?? null,
    metadata: { pii_masking: userMasked.meta },
  });

  const assistantMessageId = await insertMessage({
    conversationId: conversation.id,
    role: "assistant",
    content: assistantMasked.text,
    model: input.model ?? null,
    tokensIn: input.usage?.tokensIn,
    tokensOut: input.usage?.tokensOut,
    costMicros: input.usage?.costMicros,
    finishReason: input.finishReason ?? null,
    toolName: input.toolName ?? null,
    toolVersion: input.toolVersion ?? null,
    requestId: input.requestId ?? null,
    metadata: { pii_masking: assistantMasked.meta },
  });

  if (input.closeAfter) {
    await supabaseAdmin
      .from("ai_conversations")
      .update({ status: "closed", ended_at: new Date().toISOString() })
      .eq("id", conversation.id);
  }

  try {
    await emitDomainEvent({
      aggregateType: "ai_conversation",
      aggregateId: conversation.id,
      eventName: input.closeAfter
        ? "ai_conversation.closed"
        : "ai_conversation.turn_appended",
      payload: {
        channel: input.channel,
        entityType: input.entityType,
        anonymousSessionId: input.anonymousSessionId ?? null,
        userMessageLength: input.userMessage?.length ?? 0,
        assistantMessageLength: input.assistantMessage?.length ?? 0,
        piiMasked:
          userMasked.meta.email_masked ||
          userMasked.meta.phone_masked ||
          assistantMasked.meta.email_masked ||
          assistantMasked.meta.phone_masked,
      },
    });
  } catch {
    // emitDomainEvent failures are non-blocking: the conversation row
    // and the messages are already persisted; the embedding worker
    // will simply not run for this turn.
  }

  return {
    conversationId: conversation.id,
    userMessageId,
    assistantMessageId,
    piiMaskingMeta: {
      user: userMasked.meta,
      assistant: assistantMasked.meta,
    },
  };
};

export const closeConversation = async (conversationId: string) => {
  const { error } = await supabaseAdmin
    .from("ai_conversations")
    .update({ status: "closed", ended_at: new Date().toISOString() })
    .eq("id", conversationId);
  if (error) throw new Error(error.message);

  try {
    await emitDomainEvent({
      aggregateType: "ai_conversation",
      aggregateId: conversationId,
      eventName: "ai_conversation.closed",
      payload: {},
    });
  } catch {
    // non-blocking
  }
};
