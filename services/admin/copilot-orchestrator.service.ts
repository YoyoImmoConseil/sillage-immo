import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { MODEL_PRICING } from "@/lib/ai/openai";
import {
  logConversationTurn,
  ensureConversation,
} from "@/lib/ai/conversation-logger";
import { bootstrapMcpRegistry } from "@/lib/mcp/bootstrap";
import { listTools, getTool } from "@/lib/mcp/registry";
import { validateWithSchema } from "@/lib/mcp/validate";
import {
  mapToolToOpenAi,
  toolNameFromOpenAi,
} from "@/lib/mcp/openai-mapper";
import {
  SILLAGE_AGENCY_KNOWLEDGE,
  SILLAGE_AGENCY_KNOWLEDGE_VERSION,
} from "@/lib/ai/knowledge/sillage-agency-knowledge";
import type { AdminRole } from "@/types/domain/admin";

// Server-side orchestrator behind /api/admin/copilot/message.
//
// What it does, per request:
//
//   1. Builds (or reuses) an `ai_conversations` row keyed by the
//      admin_profile_id and conversation_id.
//   2. Loads the MCP tool registry, then filters it by role
//      (administrateur sees everything except admin-mutation tools we
//      consider sensitive; manager additionally cannot publish
//      listings; collaborateur is blocked at the route layer).
//   3. Calls OpenAI Chat Completions with `tools` = mapped MCP tools.
//   4. If the model returned `tool_calls`, validates each input
//      against the source JSON schema, then runs the tool via the MCP
//      registry (same code path as `/api/mcp`). Replies are sent back
//      as `role: 'tool'` messages so the model can synthesize a final
//      answer.
//   5. Up to 5 iterations; hard stop afterwards with a graceful
//      message asking the model to wrap up.
//   6. Persists every turn + atomically bumps
//      `ai_copilot_usage_daily` so the UI can show a soft warning
//      when the daily cost cap (default 5 €) is reached.

export type CopilotRole = Extract<AdminRole, "administrateur" | "manager">;

export type CopilotToolCallEvent = {
  iteration: number;
  toolName: string;
  toolVersion: string | null;
  inputPreview: Record<string, unknown>;
  outputPreview: unknown;
  durationMs: number;
  ok: boolean;
  errorMessage?: string;
};

export type CopilotMessageInput = {
  adminProfileId: string;
  adminEmail: string | null;
  adminRole: CopilotRole;
  conversationId: string | null;
  userMessage: string;
};

export type CopilotMessageResult = {
  conversationId: string;
  finalAnswer: string;
  toolCalls: CopilotToolCallEvent[];
  usage: {
    tokensIn: number;
    tokensOut: number;
    totalTokens: number;
    costMicros: number;
    costEurApprox: number;
  };
  dailyUsage: {
    costMicrosTotal: number;
    costEurTotal: number;
    capEur: number;
    overCap: boolean;
  };
  iterations: number;
  truncated: boolean;
};

const MAX_ITERATIONS = 5;
const MODEL = "gpt-4o-mini";
const COPILOT_DAILY_CAP_EUR_DEFAULT = 5;

const SYSTEM_PROMPT = `Tu es le copilot interne de Sillage Immo (agence immobilière haut de gamme à Nice).
Tu aides le manager / administrateur connecté à exploiter les données de l'agence (leads, projets, mandats, biens, conversations IA client, performance conseillers, marché local) en t'appuyant sur les outils MCP disponibles.

Style :
- Français, ton conseiller pro, concret, neutre. Pas de marketing.
- Réponses concises (3 à 8 phrases sauf demande explicite plus longue).
- Quand tu cites un lead, un projet ou un bien, donne son id en clair (l'UI le rendra cliquable).

Garde-fous Sillage stricts :
- Ne donne JAMAIS de valorisation chiffrée précise (toujours fourchette + redirige vers conseiller humain).
- Pas de conseil juridique ferme.
- Ne nomme aucun client par son nom dans une réponse ; ne mentionne aucun email/téléphone (l'audit_log les masquerait de toute façon).
- Si une question sort du périmètre immobilier Sillage (politique, perso, autre marché), refuse poliment et propose une question recadrée.

Process tools :
- Quand une question demande des données, APPELLE les tools MCP plutôt que d'inventer.
- Pas plus de 5 appels d'outils par tour. Au-delà, synthétise avec ce que tu as.
- Si un outil renvoie une erreur, dis-le et propose une autre approche.

Contexte agence injecté :
- Connaissance Sillage Immo (parcours, valeur ajoutée, zones premium côté Côte d'Azur) — version ${SILLAGE_AGENCY_KNOWLEDGE_VERSION}.`;

const ROLE_TOOL_BLACKLIST: Record<CopilotRole, Set<string>> = {
  administrateur: new Set<string>([]),
  manager: new Set<string>([
    // Mutating tools we keep off the manager copilot for now (manager
    // still has UI access, but we don't let the LLM call them with
    // a free-form prompt to keep human-in-the-loop on these).
    "property_listings.publish",
    "property_listings.unpublish",
    "seller_projects.advance_status",
    "seller_projects.assign_advisor",
  ]),
};

const COPILOT_ALLOWED_BASE = new Set<string>([
  "ai.semantic_search",
  "audit.search",
  "buyer_leads.get_context",
  "buyer_matching.list_for_lead",
  "buyer_matching.list_for_property",
  "buyer_searches.upsert",
  "client_projects.get",
  "client_projects.list",
  "client_projects.timeline",
  "contacts.find_or_merge",
  "conversations.search",
  "conversations.trends",
  "home_assistant.get_context",
  "leads.score",
  "properties.get",
  "properties.list_recent",
  "properties.search",
  "property_documents.list_for_property",
  "property_visits.list_for_property",
  "property_visits.list_for_seller_project",
  "property_listings.publish",
  "property_listings.unpublish",
  "seller_leads.get_context",
  "seller_leads.score",
  "seller_leads.generate_ai_insight",
  "seller_projects.milestones_stats",
  "mynotary.list_signed_documents",
  "mynotary.get_signed_document",
  "mynotary.stats_signed_by_period",
  "seller_projects.advance_status",
  "seller_projects.assign_advisor",
  "valuations.get_latest_for_project",
  "valuations.list_for_project",
]);

const computeAllowedToolNames = (role: CopilotRole): Set<string> => {
  const blacklist = ROLE_TOOL_BLACKLIST[role];
  return new Set(
    Array.from(COPILOT_ALLOWED_BASE).filter((name) => !blacklist.has(name))
  );
};

const PREVIEW_MAX_CHARS = 4000;
const previewValue = (value: unknown): unknown => {
  try {
    const json = JSON.stringify(value);
    if (typeof json !== "string") return null;
    if (json.length <= PREVIEW_MAX_CHARS) return JSON.parse(json);
    return `${json.slice(0, PREVIEW_MAX_CHARS)}…[truncated]`;
  } catch {
    return null;
  }
};

type OpenAiToolMessage = {
  role: "tool";
  tool_call_id: string;
  content: string;
};

type OpenAiAssistantMessage = {
  role: "assistant";
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
};

type OpenAiChatRequestMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | OpenAiAssistantMessage
  | OpenAiToolMessage;

const callOpenAi = async (input: {
  messages: OpenAiChatRequestMessage[];
  tools: ReturnType<typeof mapToolToOpenAi>[];
  toolChoice?: "auto" | "none" | "required";
}): Promise<{
  message: OpenAiAssistantMessage;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  finishReason: string | null;
  costMicros: number;
}> => {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY manquante.");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      messages: input.messages,
      tools: input.tools,
      tool_choice: input.toolChoice ?? "auto",
    }),
    cache: "no-store",
  });
  const payload = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(
      `OpenAI copilot error (${response.status}): ${JSON.stringify(payload)}`
    );
  }
  const choices = payload.choices as Array<Record<string, unknown>> | undefined;
  if (!choices || choices.length === 0) {
    throw new Error("OpenAI: choices vide.");
  }
  const choice = choices[0];
  const usageRaw = (payload.usage as Record<string, unknown> | undefined) ?? {};
  const tokensIn =
    typeof usageRaw.prompt_tokens === "number" ? usageRaw.prompt_tokens : 0;
  const tokensOut =
    typeof usageRaw.completion_tokens === "number"
      ? usageRaw.completion_tokens
      : 0;
  const totalTokens =
    typeof usageRaw.total_tokens === "number"
      ? usageRaw.total_tokens
      : tokensIn + tokensOut;
  const pricing = MODEL_PRICING[MODEL] ?? { input: 150, output: 600 };
  const costMicros =
    Math.round((tokensIn * pricing.input) / 1000) +
    Math.round((tokensOut * pricing.output) / 1000);

  return {
    message: choice.message as OpenAiAssistantMessage,
    usage: {
      promptTokens: tokensIn,
      completionTokens: tokensOut,
      totalTokens,
    },
    finishReason:
      typeof choice.finish_reason === "string" ? choice.finish_reason : null,
    costMicros,
  };
};

const buildToolDefinitions = (
  allowedNames: Set<string>
): ReturnType<typeof mapToolToOpenAi>[] => {
  return listTools()
    .filter((t) => allowedNames.has(t.name))
    .map((t) =>
      mapToolToOpenAi({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      })
    );
};

const executeMcpTool = async (
  mappedName: string,
  argumentsJson: string,
  adminProfileId: string,
  adminEmail: string | null,
  adminRole: CopilotRole
): Promise<{ result: unknown; toolVersion: string | null }> => {
  const toolName = toolNameFromOpenAi(mappedName);
  const tool = getTool(toolName);
  if (!tool) {
    throw new Error(`Tool inconnu: ${toolName}`);
  }
  let parsedInput: unknown;
  try {
    parsedInput = argumentsJson.length === 0 ? {} : JSON.parse(argumentsJson);
  } catch {
    throw new Error(`Arguments JSON invalides pour ${toolName}.`);
  }
  if (!validateWithSchema(tool.inputSchema, parsedInput)) {
    throw new Error(`Arguments invalides pour ${toolName}.`);
  }
  const result = await tool.handler(parsedInput, {
    requestId: crypto.randomUUID(),
    actor: "user",
    actorType: "user",
    actorId: adminProfileId,
    actorRole: adminRole,
    actorEmail: adminEmail,
  });
  return { result, toolVersion: tool.version ?? null };
};

const bumpDailyUsage = async (
  adminProfileId: string,
  usage: {
    tokensIn: number;
    tokensOut: number;
    costMicros: number;
    iterations: number;
    conversations: number;
  }
): Promise<{ costMicrosTotal: number }> => {
  type BumpRow = {
    cost_micros_total: number | string | null;
  };
  const { data, error } = await supabaseAdmin.rpc("bump_ai_copilot_usage", {
    p_admin_profile_id: adminProfileId,
    p_tokens_in: usage.tokensIn,
    p_tokens_out: usage.tokensOut,
    p_cost_micros: usage.costMicros,
    p_iterations: usage.iterations,
    p_conversations: usage.conversations,
  });
  if (error) {
    console.error("[copilot] bump_ai_copilot_usage failed:", error.message);
    return { costMicrosTotal: 0 };
  }
  const row = Array.isArray(data) ? (data[0] as BumpRow | undefined) : null;
  const cost =
    row && row.cost_micros_total != null
      ? Number(row.cost_micros_total)
      : 0;
  return { costMicrosTotal: cost };
};

const formatToolPayloadForModel = (value: unknown): string => {
  try {
    const json = JSON.stringify(value);
    if (typeof json !== "string") return "null";
    if (json.length <= 8000) return json;
    return `${json.slice(0, 8000)}…[truncated]`;
  } catch {
    return JSON.stringify({ error: "non-serializable tool output" });
  }
};

export const runCopilotTurn = async (
  input: CopilotMessageInput
): Promise<CopilotMessageResult> => {
  bootstrapMcpRegistry();

  const allowedNames = computeAllowedToolNames(input.adminRole);
  const tools = buildToolDefinitions(allowedNames);

  const conversation = await ensureConversation({
    conversationId: input.conversationId,
    entityType: "admin",
    channel: "admin_console",
    model: MODEL,
    locale: "fr",
    metadata: {
      copilot: true,
      admin_profile_id: input.adminProfileId,
      admin_role: input.adminRole,
    },
  });

  // Load the running conversation history so multi-turn sessions
  // carry state. We trim to the last 24 messages to keep prompt size
  // bounded.
  const { data: historyRows } = await supabaseAdmin
    .from("ai_messages")
    .select("role, content, created_at")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true })
    .limit(24);
  const history = (historyRows ?? []) as Array<{
    role: string;
    content: string;
  }>;

  const messages: OpenAiChatRequestMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: JSON.stringify({
        agencyKnowledgeVersion: SILLAGE_AGENCY_KNOWLEDGE_VERSION,
        agencyKnowledge: SILLAGE_AGENCY_KNOWLEDGE,
        actor: {
          role: input.adminRole,
          email: input.adminEmail,
        },
        availableTools: tools.map((t) => t.function.name),
      }),
    },
    ...history
      .filter((row) => row.role === "user" || row.role === "assistant")
      .map((row) => ({
        role: row.role as "user" | "assistant",
        content: row.content,
      })),
    { role: "user", content: input.userMessage },
  ];

  const toolCalls: CopilotToolCallEvent[] = [];
  let totalTokensIn = 0;
  let totalTokensOut = 0;
  let totalCostMicros = 0;
  let finalAnswer = "";
  let truncated = false;
  let iteration = 0;

  while (iteration < MAX_ITERATIONS) {
    iteration += 1;
    const completion = await callOpenAi({
      messages,
      tools,
      toolChoice: iteration < MAX_ITERATIONS ? "auto" : "none",
    });
    totalTokensIn += completion.usage.promptTokens;
    totalTokensOut += completion.usage.completionTokens;
    totalCostMicros += completion.costMicros;

    const assistant = completion.message;
    messages.push(assistant);

    const calls = assistant.tool_calls ?? [];
    if (calls.length === 0) {
      finalAnswer = (assistant.content ?? "").trim();
      break;
    }

    if (iteration >= MAX_ITERATIONS) {
      truncated = true;
      // Give the model one last chance with tool_choice=none in the
      // next loop iteration check (which will short-circuit because
      // iteration >= MAX_ITERATIONS); fall through.
    }

    for (const call of calls) {
      const start = Date.now();
      let ok = true;
      let errorMessage: string | undefined;
      let result: unknown = null;
      let toolVersion: string | null = null;
      try {
        const exec = await executeMcpTool(
          call.function.name,
          call.function.arguments,
          input.adminProfileId,
          input.adminEmail,
          input.adminRole
        );
        result = exec.result;
        toolVersion = exec.toolVersion;
      } catch (error) {
        ok = false;
        errorMessage =
          error instanceof Error ? error.message : "Tool execution failed";
        result = { error: errorMessage };
      }
      const durationMs = Date.now() - start;
      toolCalls.push({
        iteration,
        toolName: toolNameFromOpenAi(call.function.name),
        toolVersion,
        inputPreview: ((): Record<string, unknown> => {
          try {
            return JSON.parse(call.function.arguments) as Record<
              string,
              unknown
            >;
          } catch {
            return { raw: call.function.arguments };
          }
        })(),
        outputPreview: previewValue(result),
        durationMs,
        ok,
        errorMessage,
      });
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: formatToolPayloadForModel(result),
      });
    }

    if (truncated) break;
  }

  if (!finalAnswer) {
    // Fall back to a graceful message if we hit the iteration cap
    // without a non-tool-call completion.
    truncated = true;
    finalAnswer =
      "Je n'ai pas pu boucler en 5 appels d'outils. Pouvez-vous reformuler la question ou la limiter à un seul aspect ?";
  }

  try {
    await logConversationTurn({
      conversationId: conversation.id,
      entityType: "admin",
      channel: "admin_console",
      model: MODEL,
      locale: "fr",
      userMessage: input.userMessage,
      assistantMessage: finalAnswer,
      usage: {
        tokensIn: totalTokensIn,
        tokensOut: totalTokensOut,
        costMicros: totalCostMicros,
      },
      finishReason: "stop",
      toolName: "admin_copilot.turn",
      toolVersion: "1.0.0",
      metadata: {
        copilot: true,
        admin_profile_id: input.adminProfileId,
        admin_role: input.adminRole,
        iterations: iteration,
        truncated,
        tool_calls: toolCalls.length,
      },
    });
  } catch {
    // non-blocking
  }

  const daily = await bumpDailyUsage(input.adminProfileId, {
    tokensIn: totalTokensIn,
    tokensOut: totalTokensOut,
    costMicros: totalCostMicros,
    iterations: iteration,
    conversations: conversation.isNew ? 1 : 0,
  });

  const costEurApprox = totalCostMicros / 1_000_000;
  const costEurTotal = daily.costMicrosTotal / 1_000_000;
  const capEur = COPILOT_DAILY_CAP_EUR_DEFAULT;
  const overCap = costEurTotal >= capEur;

  return {
    conversationId: conversation.id,
    finalAnswer,
    toolCalls,
    usage: {
      tokensIn: totalTokensIn,
      tokensOut: totalTokensOut,
      totalTokens: totalTokensIn + totalTokensOut,
      costMicros: totalCostMicros,
      costEurApprox,
    },
    dailyUsage: {
      costMicrosTotal: daily.costMicrosTotal,
      costEurTotal,
      capEur,
      overCap,
    },
    iterations: iteration,
    truncated,
  };
};

export const getCopilotUsageToday = async (adminProfileId: string) => {
  const { data: row } = await supabaseAdmin
    .from("ai_copilot_usage_daily")
    .select("tokens_in_total, tokens_out_total, cost_micros_total, iterations_total, conversations_total")
    .eq("admin_profile_id", adminProfileId)
    .eq("day", new Date().toISOString().slice(0, 10))
    .maybeSingle();
  const costMicros = Number(row?.cost_micros_total ?? 0);
  return {
    tokensIn: Number(row?.tokens_in_total ?? 0),
    tokensOut: Number(row?.tokens_out_total ?? 0),
    costMicrosTotal: costMicros,
    costEurTotal: costMicros / 1_000_000,
    iterations: row?.iterations_total ?? 0,
    conversations: row?.conversations_total ?? 0,
    capEur: COPILOT_DAILY_CAP_EUR_DEFAULT,
    overCap: costMicros / 1_000_000 >= COPILOT_DAILY_CAP_EUR_DEFAULT,
  };
};

export const COPILOT_DAILY_CAP_EUR = COPILOT_DAILY_CAP_EUR_DEFAULT;

export const SUGGESTED_PROMPTS: Array<{
  id: string;
  label: string;
  prompt: string;
  rolesAllowed: CopilotRole[];
}> = [
  {
    id: "cold_seller_leads",
    label: "Quels leads vendeurs froids relancer ?",
    prompt:
      "Donne-moi les 5 leads vendeurs créés ces 60 derniers jours qui sont sans interaction récente. Pour chacun, propose la meilleure action de relance.",
    rolesAllowed: ["manager", "administrateur"],
  },
  {
    id: "match_active_buyers",
    label: "Quelles propriétés matcher avec mes acquéreurs actifs ?",
    prompt:
      "Liste les acquéreurs actifs (recherche profile à jour < 30 j) et propose pour chacun 2 à 3 biens de notre portefeuille qui correspondent. Réponds en tableau condensé : acquéreur → bien id → raison du match.",
    rolesAllowed: ["manager", "administrateur"],
  },
  {
    id: "visitor_questions",
    label: "Qu'est-ce que les visiteurs demandent le plus cette semaine ?",
    prompt:
      "Synthétise les top sujets / mots-clés des conversations IA des visiteurs anonymes (home assistant) des 7 derniers jours. Que faut-il préparer côté contenu ?",
    rolesAllowed: ["manager", "administrateur"],
  },
  {
    id: "advisor_support",
    label: "Quels conseillers ont besoin de support ?",
    prompt:
      "Analyse la performance des conseillers sur 90 jours (mandats signés vs en cours). Qui décroche ? Propose 1 action de soutien pour chacun.",
    rolesAllowed: ["manager", "administrateur"],
  },
  {
    id: "dashboard_summary",
    label: "Donne-moi le résumé du dashboard",
    prompt:
      "Donne-moi en 4 phrases le résumé du dashboard de pilotage : KPI 30 j, funnel, top zones, performance conseillers.",
    rolesAllowed: ["manager", "administrateur"],
  },
  {
    id: "rising_zones",
    label: "Quelles zones montent ?",
    prompt:
      "Quelles zones (cities) montent côté demande vendeur ET acquéreur sur 90 jours par rapport à la période précédente ? Propose 1 action commerciale.",
    rolesAllowed: ["manager", "administrateur"],
  },
];

export const getCopilotPromptsForRole = (role: CopilotRole) =>
  SUGGESTED_PROMPTS.filter((p) => p.rolesAllowed.includes(role));
