import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { emitDomainEvent } from "@/lib/events/domain-events";
import { invokeMcpToolInternal } from "@/lib/mcp/invoke-internal";
import {
  SILLAGE_AGENCY_KNOWLEDGE,
  SILLAGE_AGENCY_KNOWLEDGE_VERSION,
} from "@/lib/ai/knowledge/sillage-agency-knowledge";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  created_at: string;
};

type SellerChatResult = {
  answer: string;
  escalateToHuman: boolean;
};

const OPENAI_BASE_URL = "https://api.openai.com/v1/chat/completions";
const MAX_HISTORY = 12;
const SELLER_CHAT_SYSTEM_PROMPT = `Tu es un conseiller commercial immobilier de Sillage Immo (Nice).
Ton objectif est d'informer, rassurer et aider le vendeur a avancer vers un echange avec un conseiller.

Positionnement a respecter:
- Sillage Immo = boutique immobiliere locale, accompagnement tres individualise, interlocuteur unique.
- Approche premium = qualite de service, transparence, suivi personnalise.
- Mettre en avant nos leviers de valeur: visibilite MLS/portails, visite virtuelle Matterport, photos HD, qualification des acquereurs, signature electronique, suivi de commercialisation pas a pas (extranet client), accompagnement diagnostics et demarches.

Style de reponse:
- Francais, ton clair, concret, rassurant, concis.
- 4 a 7 phrases maximum.
- Privilegier des reponses orientees benefices vendeur (delai, securite, clarte, confort).

Garde-fous:
- Ne pas donner de conseil juridique ferme.
- Ne jamais garantir un prix de vente ou un delai certain.
- Si question sensible (litige, succession, divorce, urgence, contentieux), recommander un rappel humain prioritaire.
- Si une offre commerciale depend d'une periode ("en ce moment"), la presenter prudemment: "selon conditions en vigueur".`;

const asRecord = (value: unknown): Record<string, unknown> | null => {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
};

const isChatMessage = (value: unknown): value is ChatMessage => {
  const row = asRecord(value);
  return Boolean(
    row &&
      (row.role === "user" || row.role === "assistant") &&
      typeof row.text === "string" &&
      typeof row.created_at === "string"
  );
};

const needsHumanEscalation = (text: string) => {
  const normalized = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return [
    "litige",
    "tribunal",
    "avocat",
    "succession",
    "divorce",
    "urgence",
    "offre signee",
    "compromis",
  ].some((keyword) => normalized.includes(keyword));
};

const confidenceFromSignals = (input: {
  userMessage: string;
  answer: string;
  hasMcpContext: boolean;
  escalateToHuman: boolean;
  historySize: number;
}) => {
  let score = 70;

  if (input.escalateToHuman) score -= 30;
  if (!input.hasMcpContext) score -= 15;
  if (input.userMessage.length < 12) score -= 8;
  if (input.answer.length < 60) score -= 5;
  if (input.historySize >= 4) score += 5;

  const clamped = Math.max(0, Math.min(100, score));
  const level: "low" | "medium" | "high" =
    clamped >= 75 ? "high" : clamped >= 50 ? "medium" : "low";

  return { score: clamped, level };
};

export const askSellerChat = async (
  sellerLeadId: string,
  userMessage: string
): Promise<SellerChatResult> => {
  const openAiApiKey = process.env.OPENAI_API_KEY;
  if (!openAiApiKey) {
    throw new Error("OPENAI_API_KEY manquante.");
  }

  const cleanedMessage = userMessage.trim();
  if (!cleanedMessage) {
    throw new Error("Message vide.");
  }

  const { data: lead, error: leadError } = await supabaseAdmin
    .from("seller_leads")
    .select("id, full_name, city, property_type, metadata")
    .eq("id", sellerLeadId)
    .maybeSingle();

  if (leadError || !lead) {
    throw new Error(leadError?.message ?? "Lead vendeur introuvable.");
  }

  const metadata = asRecord(lead.metadata) ?? {};
  const sellerChat = asRecord(metadata.seller_chat) ?? {};
  const previousMessages = Array.isArray(sellerChat.messages)
    ? sellerChat.messages.filter(isChatMessage).slice(-8)
    : [];

  let mcpContext: unknown = null;
  try {
    mcpContext = await invokeMcpToolInternal("seller_leads.get_context", { sellerLeadId });
  } catch {
    mcpContext = null;
  }

  const response = await fetch(OPENAI_BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openAiApiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: SELLER_CHAT_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: JSON.stringify({
            agencyKnowledgeVersion: SILLAGE_AGENCY_KNOWLEDGE_VERSION,
            agencyKnowledge: SILLAGE_AGENCY_KNOWLEDGE,
            leadContext: {
              fullName: lead.full_name,
              city: lead.city,
              propertyType: lead.property_type,
            },
            mcpContext,
            history: previousMessages,
            question: cleanedMessage,
          }),
        },
      ],
    }),
    cache: "no-store",
  });

  const payload = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(`OpenAI error (${response.status}).`);
  }

  const choices = payload.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new Error("Reponse IA vide.");
  }
  const firstChoice = asRecord(choices[0]);
  const message = asRecord(firstChoice?.message);
  const answerRaw = message?.content;
  const answer =
    typeof answerRaw === "string" && answerRaw.trim().length > 0
      ? answerRaw.trim()
      : "Je vous propose de planifier un rappel avec un conseiller Sillage Immo.";

  const now = new Date().toISOString();
  const transcript: ChatMessage[] = [
    ...previousMessages,
    { role: "user" as const, text: cleanedMessage, created_at: now },
    { role: "assistant" as const, text: answer, created_at: now },
  ].slice(-MAX_HISTORY);

  const nextMetadata: Record<string, unknown> = {
    ...metadata,
    seller_chat: {
      ...(sellerChat ?? {}),
      messages: transcript,
      knowledge_version: SILLAGE_AGENCY_KNOWLEDGE_VERSION,
      updated_at: now,
    },
  };

  const escalateToHuman = needsHumanEscalation(cleanedMessage) || needsHumanEscalation(answer);
  const confidence = confidenceFromSignals({
    userMessage: cleanedMessage,
    answer,
    hasMcpContext: Boolean(mcpContext),
    escalateToHuman,
    historySize: previousMessages.length,
  });

  const finalMetadata: Record<string, unknown> = {
    ...nextMetadata,
    seller_chat: {
      ...(asRecord(nextMetadata.seller_chat) ?? {}),
      internal: {
        confidence_score: confidence.score,
        confidence_level: confidence.level,
        mcp_context_used: Boolean(mcpContext),
        updated_at: now,
      },
    },
  };

  try {
    await emitDomainEvent({
      aggregateType: "seller_lead",
      aggregateId: sellerLeadId,
      eventName: "seller_lead.chat_message_logged",
      payload: {
        userMessageLength: cleanedMessage.length,
        escalateToHuman,
        knowledgeVersion: SILLAGE_AGENCY_KNOWLEDGE_VERSION,
        confidenceScore: confidence.score,
        confidenceLevel: confidence.level,
        mcpContextUsed: Boolean(mcpContext),
      },
    });
  } catch {
    // non-blocking
  }

  const { error: updateInternalError } = await supabaseAdmin
    .from("seller_leads")
    .update({ metadata: finalMetadata })
    .eq("id", sellerLeadId);

  if (updateInternalError) {
    throw new Error(updateInternalError.message);
  }

  return { answer, escalateToHuman };
};
