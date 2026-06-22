import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";

const DEFAULT_CHAT_MODEL = "gpt-4o-mini";
const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";

// Model tiers (centralized so every "door" picks a coherent model).
// - UTILITY: cheapest, for deterministic utilities (renaming, classification).
// - CLIENT_CHAT: client-facing conversations (Home Assistant, Seller Chat) —
//   more capable than 4o-mini for nuance/voice, still cost-reasonable.
// - The Admin Copilot tier lives in its own orchestrator (premium).
export const UTILITY_CHAT_MODEL = "gpt-4o-mini";
export const CLIENT_CHAT_MODEL = "gpt-4.1-mini";

// Prices in micros per 1000 tokens (1 cent = 1000 micros). Updated 2026-05.
// Cost numbers are accounting-quality estimates; the LLM provider remains
// the source of truth for billing — we just record a rough internal cost
// so the admin console / finance team can spot runaway spend.
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 150, output: 600 },
  "gpt-4o": { input: 2500, output: 10000 },
  "gpt-4.1-mini": { input: 400, output: 1600 },
  "text-embedding-3-small": { input: 20, output: 0 },
  "text-embedding-3-large": { input: 130, output: 0 },
};

const DEFAULT_PRICING = { input: 150, output: 600 };

const computeCostMicros = (
  model: string,
  tokensIn: number,
  tokensOut: number
) => {
  const pricing = MODEL_PRICING[model] ?? DEFAULT_PRICING;
  return (
    Math.round((tokensIn * pricing.input) / 1000) +
    Math.round((tokensOut * pricing.output) / 1000)
  );
};

const requireOpenAiKey = () => {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY manquante. Ajoutez-la dans .env.local.");
  }
  return key;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type OpenAiResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | undefined;

export type OpenAiChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
};

export type CallOpenAiChatInput = {
  model?: string;
  messages: OpenAiChatMessage[];
  responseFormat?: OpenAiResponseFormat;
  temperature?: number;
  maxTokens?: number;
  conversationId?: string;
  toolName?: string;
  toolVersion?: string;
  requestId?: string;
};

export type CallOpenAiChatResult = {
  content: string;
  model: string;
  finishReason: string | null;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  costMicros: number;
  rawPayload: Record<string, unknown>;
};

const isRetryable = (status: number) => status === 429 || status >= 500;

type FetchOptions = Parameters<typeof fetch>[1];

// Hard timeout per attempt. OpenAI occasionally hangs on long
// prompts; without a deadline the whole admin dashboard SSR would
// block until Vercel's function timeout (which is much higher than
// what a human user is willing to wait for).
const DEFAULT_OPENAI_TIMEOUT_MS = 25_000;

const fetchWithRetry = async (
  url: string,
  init: FetchOptions,
  attempts = 2,
  timeoutMs: number = DEFAULT_OPENAI_TIMEOUT_MS
): Promise<Response> => {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);
      if (!response.ok && isRetryable(response.status) && attempt < attempts - 1) {
        await sleep(1000);
        continue;
      }
      return response;
    } catch (error) {
      clearTimeout(timer);
      lastError = error;
      if (attempt < attempts - 1) {
        await sleep(1000);
        continue;
      }
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("OpenAI request failed without a recoverable error.");
};

const persistMessages = async (input: {
  conversationId: string;
  toolName?: string;
  toolVersion?: string;
  requestId?: string;
  userContent: string;
  assistantContent: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costMicros: number;
  finishReason: string | null;
}) => {
  try {
    await supabaseAdmin.from("ai_messages").insert([
      {
        conversation_id: input.conversationId,
        role: "user",
        content: input.userContent,
        model: input.model,
        tool_name: input.toolName ?? null,
        tool_version: input.toolVersion ?? null,
        request_id: input.requestId ?? null,
      },
      {
        conversation_id: input.conversationId,
        role: "assistant",
        content: input.assistantContent,
        model: input.model,
        tokens_in: input.tokensIn,
        tokens_out: input.tokensOut,
        cost_micros: input.costMicros,
        finish_reason: input.finishReason,
        tool_name: input.toolName ?? null,
        tool_version: input.toolVersion ?? null,
        request_id: input.requestId ?? null,
      },
    ]);
  } catch {
    // ai_messages persistence is best-effort: never fail the upstream
    // chat call because of it.
  }
};

export const callOpenAiChat = async (
  input: CallOpenAiChatInput
): Promise<CallOpenAiChatResult> => {
  const key = requireOpenAiKey();
  const model = input.model ?? DEFAULT_CHAT_MODEL;

  const body: Record<string, unknown> = {
    model,
    messages: input.messages,
  };
  if (typeof input.temperature === "number") body.temperature = input.temperature;
  if (typeof input.maxTokens === "number") body.max_tokens = input.maxTokens;
  if (input.responseFormat) body.response_format = input.responseFormat;

  const response = await fetchWithRetry(OPENAI_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const payload = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(
      `OpenAI chat error (${response.status}): ${JSON.stringify(payload)}`
    );
  }

  const choices = payload.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new Error("OpenAI: empty choices array.");
  }
  const firstChoice = choices[0] as Record<string, unknown>;
  const message = (firstChoice.message as Record<string, unknown> | undefined) ?? null;
  const content = message?.content;
  if (typeof content !== "string") {
    throw new Error("OpenAI: missing message content.");
  }

  const usage = (payload.usage as Record<string, unknown> | undefined) ?? {};
  const tokensIn =
    typeof usage.prompt_tokens === "number" ? usage.prompt_tokens : 0;
  const tokensOut =
    typeof usage.completion_tokens === "number" ? usage.completion_tokens : 0;
  const totalTokens =
    typeof usage.total_tokens === "number" ? usage.total_tokens : tokensIn + tokensOut;
  const reportedModel =
    typeof payload.model === "string" && payload.model.trim().length > 0
      ? payload.model
      : model;
  const finishReason =
    typeof firstChoice.finish_reason === "string" ? firstChoice.finish_reason : null;
  const costMicros = computeCostMicros(reportedModel, tokensIn, tokensOut);

  if (input.conversationId) {
    const lastUserMessage = [...input.messages]
      .reverse()
      .find((m) => m.role === "user");
    await persistMessages({
      conversationId: input.conversationId,
      toolName: input.toolName,
      toolVersion: input.toolVersion,
      requestId: input.requestId,
      userContent: lastUserMessage?.content ?? "",
      assistantContent: content,
      model: reportedModel,
      tokensIn,
      tokensOut,
      costMicros,
      finishReason,
    });
  }

  return {
    content,
    model: reportedModel,
    finishReason,
    usage: {
      promptTokens: tokensIn,
      completionTokens: tokensOut,
      totalTokens,
    },
    costMicros,
    rawPayload: payload,
  };
};

export type CallOpenAiEmbeddingInput = {
  input: string | string[];
  model?: string;
};

export type CallOpenAiEmbeddingResult = {
  model: string;
  embedding: number[];
  embeddings: number[][];
  tokens: number;
  costMicros: number;
};

export const callOpenAiEmbedding = async (
  input: CallOpenAiEmbeddingInput
): Promise<CallOpenAiEmbeddingResult> => {
  const key = requireOpenAiKey();
  const model = input.model ?? DEFAULT_EMBEDDING_MODEL;

  const response = await fetchWithRetry(OPENAI_EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      input: input.input,
    }),
    cache: "no-store",
  });

  const payload = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(
      `OpenAI embedding error (${response.status}): ${JSON.stringify(payload)}`
    );
  }

  const rawData = (payload.data as Array<Record<string, unknown>> | undefined) ?? [];
  const embeddings = rawData.map((row) => {
    if (!Array.isArray(row.embedding)) {
      throw new Error("OpenAI embedding: missing embedding vector.");
    }
    return row.embedding as number[];
  });

  const usage = (payload.usage as Record<string, unknown> | undefined) ?? {};
  const tokens =
    typeof usage.prompt_tokens === "number"
      ? usage.prompt_tokens
      : typeof usage.total_tokens === "number"
        ? usage.total_tokens
        : 0;
  const reportedModel =
    typeof payload.model === "string" && payload.model.trim().length > 0
      ? payload.model
      : model;
  const costMicros = computeCostMicros(reportedModel, tokens, 0);

  return {
    model: reportedModel,
    embedding: embeddings[0] ?? [],
    embeddings,
    tokens,
    costMicros,
  };
};
