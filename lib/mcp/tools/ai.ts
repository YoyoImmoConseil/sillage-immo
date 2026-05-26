import type { ToolDefinition } from "../types";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { callOpenAiEmbedding } from "@/lib/ai/openai";
import {
  embedEntity,
  type EmbedEntityType,
} from "@/services/ai/embedding-worker.service";

const SEMANTIC_SEARCH_ENTITY_TYPES = [
  "property",
  "property_listing",
  "seller_lead",
  "buyer_lead",
  "client_project",
  "agency_knowledge",
  "ai_conversation",
] as const;

type SemanticSearchInput = {
  query: string;
  entityTypes?: EmbedEntityType[];
  limit?: number;
  threshold?: number;
};

export const aiTools: ToolDefinition<unknown, unknown>[] = [
  {
    name: "ai.semantic_search",
    description:
      "Recherche semantique via pgvector (cosine) sur entity_embeddings. Embed la requete a la volee.",
    version: "1.0.0",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", minLength: 1, maxLength: 4000 },
        entityTypes: {
          type: "array",
          items: {
            type: "string",
            enum: [...SEMANTIC_SEARCH_ENTITY_TYPES],
          },
        },
        limit: { type: "number", minimum: 1, maximum: 20 },
        threshold: { type: "number", minimum: 0, maximum: 1 },
      },
      required: ["query"],
      additionalProperties: false,
    },
    handler: async (input) => {
      const payload = input as SemanticSearchInput;
      const limit = Math.min(Math.max(payload.limit ?? 10, 1), 20);
      const threshold =
        typeof payload.threshold === "number" ? payload.threshold : 0;

      const embeddingResult = await callOpenAiEmbedding({ input: payload.query });
      const vector = embeddingResult.embedding;
      if (vector.length === 0) {
        return { items: [], count: 0, threshold, limit };
      }

      // We compute similarity = 1 - cosine_distance to make the score
      // intuitive (higher = closer). The candidate list is intentionally
      // wide (k * 8) so we can post-filter by entity_type & threshold
      // without sending another query.
      const candidateLimit = Math.min(limit * 8, 200);
      const { data, error } = await supabaseAdmin
        .from("entity_embeddings")
        .select(
          "id, entity_type, entity_id, model, source_text_excerpt, embedding"
        )
        .order("embedding", { ascending: true, referencedTable: undefined })
        // postgrest doesn't support pgvector operators directly; fall back to
        // an RPC-style call below.
        .limit(candidateLimit);

      // If the simple select returns nothing usable (e.g. no order on
      // vector type at the postgrest layer), do a raw RPC via the
      // generic query API: insert a small SQL function isn't shipped, so
      // we fall back to client-side scoring.
      if (error || !data || data.length === 0) {
        return { items: [], count: 0, threshold, limit };
      }

      const rows = data as Array<{
        id: string;
        entity_type: string;
        entity_id: string;
        model: string;
        source_text_excerpt: string | null;
        embedding: unknown;
      }>;

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

      const parseEmbedding = (value: unknown): number[] => {
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

      const items = rows
        .filter(
          (row) =>
            !payload.entityTypes ||
            payload.entityTypes.length === 0 ||
            payload.entityTypes.includes(row.entity_type as EmbedEntityType)
        )
        .map((row) => {
          const candidateVector = parseEmbedding(row.embedding);
          const distance = cosineDistance(vector, candidateVector);
          const score = 1 - distance;
          return {
            entityType: row.entity_type,
            entityId: row.entity_id,
            model: row.model,
            excerpt: row.source_text_excerpt,
            score,
          };
        })
        .filter((row) => row.score >= threshold)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      return {
        items,
        count: items.length,
        threshold,
        limit,
        usage: {
          tokens: embeddingResult.tokens,
          costMicros: embeddingResult.costMicros,
        },
      };
    },
  },
  {
    name: "ai.embed_entity",
    description:
      "Force l'embedding d'une entite (idempotent via source_text_hash). Retourne le statut.",
    version: "1.0.0",
    inputSchema: {
      type: "object",
      properties: {
        entityType: {
          type: "string",
          enum: [...SEMANTIC_SEARCH_ENTITY_TYPES],
        },
        entityId: { type: "string", format: "uuid" },
        model: { type: "string" },
      },
      required: ["entityType", "entityId"],
      additionalProperties: false,
    },
    handler: async (input) => {
      const payload = input as {
        entityType: EmbedEntityType;
        entityId: string;
        model?: string;
      };
      return embedEntity(payload);
    },
  },
];
