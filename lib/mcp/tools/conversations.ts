import type { ToolDefinition } from "../types";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { callOpenAiEmbedding } from "@/lib/ai/openai";

// MCP tools that turn the centralized ai_conversations + ai_messages
// log (populated by lib/ai/conversation-logger) into queryable
// surface area for the admin dashboard and the future copilot:
//
//   - `conversations.search` does pgvector cosine similarity over
//     entity_embeddings rows of `entity_type='ai_conversation'`,
//     filtering by date_range / channel / entity_type. The score is
//     intuitive (higher = closer) and capped to `top_k <= 50`.
//
//   - `conversations.trends` aggregates message volume and topics
//     over a period, grouped by `topic` (best-effort keyword
//     extraction from ai_conversations.metadata), `channel`,
//     `entity_type` or `zone` (inferred_zone from home-assistant
//     metadata). Returns a compact JSON so the admin dashboard can
//     render counts + top-N lists without an extra round trip.

const CHANNELS = [
  "seller_chat",
  "seller_ai_insight",
  "home_assistant",
  "mcp_tool",
  "admin_console",
  "rag_query",
] as const;

const ENTITY_TYPES = [
  "seller_lead",
  "buyer_lead",
  "client_project",
  "property",
  "admin",
  "anonymous",
  "system",
] as const;

const TREND_GROUP_BY = ["topic", "channel", "entity_type", "zone"] as const;

type ConversationSearchInput = {
  query: string;
  channels?: string[];
  entityTypes?: string[];
  dateFrom?: string;
  dateTo?: string;
  topK?: number;
};

type ConversationTrendsInput = {
  periodDays?: number;
  groupBy?: (typeof TREND_GROUP_BY)[number];
  channels?: string[];
  entityTypes?: string[];
  topK?: number;
};

const SAFE_PERIOD_DAYS = (raw: unknown): number => {
  const value = typeof raw === "number" && Number.isFinite(raw) ? raw : 7;
  return Math.min(Math.max(Math.trunc(value), 1), 90);
};

const SAFE_TOP_K = (raw: unknown, fallback: number, max: number): number => {
  const value = typeof raw === "number" && Number.isFinite(raw) ? raw : fallback;
  return Math.min(Math.max(Math.trunc(value), 1), max);
};

const STOPWORDS_FR = new Set<string>([
  "le", "la", "les", "un", "une", "des", "de", "du", "en", "au", "aux",
  "et", "ou", "où", "mais", "que", "qui", "quoi", "dont", "ce", "ces",
  "cet", "cette", "mon", "ma", "mes", "ton", "ta", "tes", "son", "sa",
  "ses", "notre", "votre", "leur", "leurs", "je", "tu", "il", "elle",
  "on", "nous", "vous", "ils", "elles", "ne", "pas", "plus", "moins",
  "pour", "par", "avec", "sans", "sur", "sous", "dans", "chez", "très",
  "tres", "bien", "tout", "tous", "toute", "toutes", "y", "a", "à",
  "est", "ai", "as", "ont", "avais", "avait", "fut", "été", "etre",
  "être", "fait", "faire", "faut", "il", "y a", "ya", "donc", "alors",
  "puis", "ensuite", "peut", "peu", "trop", "aussi", "encore", "déjà",
  "deja", "rien", "tout", "tres", "sera", "soit", "seront", "voila",
]);

const extractKeywords = (text: string, limit = 5): string[] => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 4 && !STOPWORDS_FR.has(token))
    .slice(0, limit);
};

const parseEmbeddingValue = (value: unknown): number[] => {
  if (Array.isArray(value)) return value as number[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? (parsed as number[]) : [];
    } catch {
      return [];
    }
  }
  return [];
};

const cosineDistance = (a: number[], b: number[]) => {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  if (denom === 0) return 1;
  return 1 - dot / denom;
};

export const conversationsTools: ToolDefinition<unknown, unknown>[] = [
  {
    name: "conversations.search",
    description:
      "Recherche sémantique pgvector dans ai_conversations (filtrable par channel, entity_type, période).",
    version: "1.0.0",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", minLength: 1, maxLength: 4000 },
        channels: {
          type: "array",
          items: { type: "string", enum: [...CHANNELS] },
          maxItems: CHANNELS.length,
        },
        entityTypes: {
          type: "array",
          items: { type: "string", enum: [...ENTITY_TYPES] },
          maxItems: ENTITY_TYPES.length,
        },
        dateFrom: { type: "string", format: "date-time" },
        dateTo: { type: "string", format: "date-time" },
        topK: { type: "number", minimum: 1, maximum: 50 },
      },
      required: ["query"],
      additionalProperties: false,
    },
    handler: async (input) => {
      const payload = input as ConversationSearchInput;
      const topK = SAFE_TOP_K(payload.topK, 10, 50);

      const embeddingResult = await callOpenAiEmbedding({ input: payload.query });
      const queryVector = embeddingResult.embedding;
      if (queryVector.length === 0) {
        return { items: [], count: 0, topK };
      }

      const candidateLimit = Math.min(topK * 10, 250);
      const { data, error } = await supabaseAdmin
        .from("entity_embeddings")
        .select("id, entity_id, model, source_text_excerpt, embedding, created_at")
        .eq("entity_type", "ai_conversation")
        .order("created_at", { ascending: false })
        .limit(candidateLimit);
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as Array<{
        id: string;
        entity_id: string;
        model: string;
        source_text_excerpt: string | null;
        embedding: unknown;
        created_at: string;
      }>;
      if (rows.length === 0) {
        return { items: [], count: 0, topK };
      }

      const conversationIds = Array.from(new Set(rows.map((row) => row.entity_id)));
      let convQuery = supabaseAdmin
        .from("ai_conversations")
        .select(
          "id, channel, entity_type, locale, status, started_at, ended_at, seller_lead_id, buyer_lead_id, client_project_id, metadata"
        )
        .in("id", conversationIds);
      if (payload.dateFrom) convQuery = convQuery.gte("started_at", payload.dateFrom);
      if (payload.dateTo) convQuery = convQuery.lte("started_at", payload.dateTo);
      if (payload.channels && payload.channels.length > 0) {
        convQuery = convQuery.in("channel", payload.channels);
      }
      if (payload.entityTypes && payload.entityTypes.length > 0) {
        convQuery = convQuery.in("entity_type", payload.entityTypes);
      }
      const { data: convData, error: convError } = await convQuery;
      if (convError) throw new Error(convError.message);

      const convoById = new Map<string, Record<string, unknown>>();
      for (const row of (convData ?? []) as Array<Record<string, unknown>>) {
        convoById.set(row.id as string, row);
      }

      const items = rows
        .map((row) => {
          const convo = convoById.get(row.entity_id);
          if (!convo) return null;
          const candidateVector = parseEmbeddingValue(row.embedding);
          const distance = cosineDistance(queryVector, candidateVector);
          const score = 1 - distance;
          return {
            conversationId: row.entity_id,
            score,
            excerpt: row.source_text_excerpt,
            model: row.model,
            channel: convo.channel,
            entityType: convo.entity_type,
            locale: convo.locale,
            status: convo.status,
            startedAt: convo.started_at,
            endedAt: convo.ended_at,
            sellerLeadId: convo.seller_lead_id,
            buyerLeadId: convo.buyer_lead_id,
            clientProjectId: convo.client_project_id,
            metadata: convo.metadata,
          };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);

      return {
        items,
        count: items.length,
        topK,
        usage: {
          tokens: embeddingResult.tokens,
          costMicros: embeddingResult.costMicros,
        },
      };
    },
  },
  {
    name: "conversations.trends",
    description:
      "Agrège les conversations clients sur une période (volume + groupBy topic|channel|entity_type|zone).",
    version: "1.0.0",
    inputSchema: {
      type: "object",
      properties: {
        periodDays: { type: "number", minimum: 1, maximum: 90 },
        groupBy: { type: "string", enum: [...TREND_GROUP_BY] },
        channels: {
          type: "array",
          items: { type: "string", enum: [...CHANNELS] },
          maxItems: CHANNELS.length,
        },
        entityTypes: {
          type: "array",
          items: { type: "string", enum: [...ENTITY_TYPES] },
          maxItems: ENTITY_TYPES.length,
        },
        topK: { type: "number", minimum: 1, maximum: 30 },
      },
      required: [],
      additionalProperties: false,
    },
    handler: async (input) => {
      const payload = input as ConversationTrendsInput;
      const periodDays = SAFE_PERIOD_DAYS(payload.periodDays);
      const groupBy = payload.groupBy ?? "topic";
      const topK = SAFE_TOP_K(payload.topK, 10, 30);

      const since = new Date(
        Date.now() - periodDays * 24 * 60 * 60 * 1000
      ).toISOString();

      let convQuery = supabaseAdmin
        .from("ai_conversations")
        .select("id, channel, entity_type, locale, started_at, metadata")
        .gte("started_at", since)
        .limit(5000);
      if (payload.channels && payload.channels.length > 0) {
        convQuery = convQuery.in("channel", payload.channels);
      }
      if (payload.entityTypes && payload.entityTypes.length > 0) {
        convQuery = convQuery.in("entity_type", payload.entityTypes);
      }
      const { data: convData, error: convError } = await convQuery;
      if (convError) throw new Error(convError.message);
      const conversations = (convData ?? []) as Array<{
        id: string;
        channel: string;
        entity_type: string;
        locale: string | null;
        started_at: string;
        metadata: Record<string, unknown> | null;
      }>;

      if (conversations.length === 0) {
        return {
          periodDays,
          groupBy,
          totalConversations: 0,
          groups: [],
          generatedAt: new Date().toISOString(),
        };
      }

      const counts = new Map<string, number>();
      const sampleConversationIdByKey = new Map<string, string>();

      for (const conv of conversations) {
        const keys: string[] = [];

        if (groupBy === "channel") {
          keys.push(conv.channel || "unknown");
        } else if (groupBy === "entity_type") {
          keys.push(conv.entity_type || "unknown");
        } else if (groupBy === "zone") {
          const meta = (conv.metadata ?? {}) as Record<string, unknown>;
          const inferred =
            (meta.inferred_zone && typeof meta.inferred_zone === "object"
              ? (meta.inferred_zone as Record<string, unknown>)
              : null) ?? null;
          const slug =
            (inferred?.slug as string | undefined) ??
            (typeof meta.zone_slug === "string" ? meta.zone_slug : null);
          keys.push(slug ?? "unknown");
        } else {
          // topic = first user message keywords (best-effort)
          const meta = (conv.metadata ?? {}) as Record<string, unknown>;
          const explicitTopic = typeof meta.topic === "string" ? meta.topic : null;
          if (explicitTopic) {
            keys.push(explicitTopic.toLowerCase());
          }
          // also load the conversation first user message for keyword
          // extraction (lazy fallback) — done outside the loop below
          if (!explicitTopic) keys.push(`__topic_lookup:${conv.id}`);
        }

        for (const key of keys) {
          counts.set(key, (counts.get(key) ?? 0) + 1);
          if (!sampleConversationIdByKey.has(key)) {
            sampleConversationIdByKey.set(key, conv.id);
          }
        }
      }

      // Topic fallback: for any `__topic_lookup:<id>` key, fetch the
      // first user message of that conversation and extract keywords.
      if (groupBy === "topic") {
        const pendingIds: string[] = [];
        for (const key of counts.keys()) {
          if (key.startsWith("__topic_lookup:")) {
            pendingIds.push(key.slice("__topic_lookup:".length));
          }
        }
        if (pendingIds.length > 0) {
          const { data: msgData } = await supabaseAdmin
            .from("ai_messages")
            .select("conversation_id, role, content, created_at")
            .in("conversation_id", pendingIds)
            .eq("role", "user")
            .order("created_at", { ascending: true })
            .limit(5000);
          const firstUserMessageByConvId = new Map<string, string>();
          for (const m of (msgData ?? []) as Array<{
            conversation_id: string;
            content: string;
          }>) {
            if (!firstUserMessageByConvId.has(m.conversation_id)) {
              firstUserMessageByConvId.set(m.conversation_id, m.content);
            }
          }
          const lookupKeys = Array.from(counts.keys()).filter((k) =>
            k.startsWith("__topic_lookup:")
          );
          for (const key of lookupKeys) {
            const convId = key.slice("__topic_lookup:".length);
            const incrementBy = counts.get(key) ?? 0;
            counts.delete(key);
            const text = firstUserMessageByConvId.get(convId) ?? "";
            const keywords = extractKeywords(text, 3);
            if (keywords.length === 0) {
              const fallback = "unknown";
              counts.set(fallback, (counts.get(fallback) ?? 0) + incrementBy);
            } else {
              for (const kw of keywords) {
                counts.set(kw, (counts.get(kw) ?? 0) + incrementBy);
                if (!sampleConversationIdByKey.has(kw)) {
                  sampleConversationIdByKey.set(kw, convId);
                }
              }
            }
          }
        }
      }

      const groups = Array.from(counts.entries())
        .map(([key, count]) => ({
          key,
          count,
          sampleConversationId: sampleConversationIdByKey.get(key) ?? null,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, topK);

      return {
        periodDays,
        groupBy,
        totalConversations: conversations.length,
        groups,
        generatedAt: new Date().toISOString(),
      };
    },
  },
];
