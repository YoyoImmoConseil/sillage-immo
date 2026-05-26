import "server-only";
import type { AppLocale } from "@/lib/i18n/config";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { emitDomainEvent } from "@/lib/events/domain-events";
import { invokeMcpToolInternal } from "@/lib/mcp/invoke-internal";
import { callOpenAiChat } from "@/lib/ai/openai";
import {
  SILLAGE_AGENCY_KNOWLEDGE,
  SILLAGE_AGENCY_KNOWLEDGE_VERSION,
} from "@/lib/ai/knowledge/sillage-agency-knowledge";
import { logConversationTurn } from "@/lib/ai/conversation-logger";
import { getSellerMetadataSections, mergeSellerMetadata } from "./seller-metadata";
import type { SellerChatMessage } from "@/types/domain/sellers";

type SellerChatResult = {
  answer: string;
  escalateToHuman: boolean;
};

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
  userMessage: string,
  locale: AppLocale = "fr"
): Promise<SellerChatResult> => {
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

  const { raw: metadata, sellerChat, sellerChatMessages } = getSellerMetadataSections(lead.metadata);
  const previousMessages = sellerChatMessages.slice(-8);

  let mcpContext: unknown = null;
  try {
    mcpContext = await invokeMcpToolInternal("seller_leads.get_context", { sellerLeadId });
  } catch {
    mcpContext = null;
  }

  const conversationIdFromMeta =
    typeof sellerChat?.internal?.conversation_id === "string"
      ? sellerChat.internal.conversation_id
      : null;

  const chatResult = await callOpenAiChat({
    model: "gpt-4o-mini",
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content:
          SELLER_CHAT_SYSTEM_PROMPT +
          " " +
          (locale === "en"
            ? "Respond in English."
            : locale === "es"
              ? "Responde en español."
              : locale === "ru"
                ? "Отвечай по-русски."
                : "Réponds en français."),
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
    toolName: "seller_chat.ask",
    toolVersion: "1.0.0",
  });

  const answerRaw = chatResult.content.trim();
  const answer =
    answerRaw.length > 0
      ? answerRaw
      : "Je vous propose de planifier un rappel avec un conseiller Sillage Immo.";

  const now = new Date().toISOString();
  const transcript: SellerChatMessage[] = [
    ...previousMessages,
    { role: "user" as const, text: cleanedMessage, created_at: now },
    { role: "assistant" as const, text: answer, created_at: now },
  ].slice(-MAX_HISTORY);

  const finalMetadata = mergeSellerMetadata(metadata, {
    seller_chat: {
      ...(sellerChat ?? {}),
      messages: transcript,
      knowledge_version: SILLAGE_AGENCY_KNOWLEDGE_VERSION,
      updated_at: now,
      internal: {
        ...(sellerChat?.internal ?? {}),
      },
    },
  });

  const escalateToHuman = needsHumanEscalation(cleanedMessage) || needsHumanEscalation(answer);
  const confidence = confidenceFromSignals({
    userMessage: cleanedMessage,
    answer,
    hasMcpContext: Boolean(mcpContext),
    escalateToHuman,
    historySize: previousMessages.length,
  });

  // First-class log into ai_conversations + ai_messages so the
  // analytics layer (dashboard + copilot) gets a uniform view across
  // all IA surfaces. Best-effort: a logger failure must NOT abort the
  // chat reply that we already obtained from the model.
  let loggedConversationId: string | null = conversationIdFromMeta;
  try {
    const logResult = await logConversationTurn({
      conversationId: conversationIdFromMeta,
      entityType: "seller_lead",
      channel: "seller_chat",
      entityId: sellerLeadId,
      sellerLeadId,
      locale,
      model: chatResult.model,
      userMessage: cleanedMessage,
      assistantMessage: answer,
      usage: {
        tokensIn: chatResult.usage.promptTokens,
        tokensOut: chatResult.usage.completionTokens,
        costMicros: chatResult.costMicros,
      },
      finishReason: chatResult.finishReason,
      toolName: "seller_chat.ask",
      toolVersion: "1.0.0",
      metadata: {
        knowledge_version: SILLAGE_AGENCY_KNOWLEDGE_VERSION,
        confidence_level: confidence.level,
        confidence_score: confidence.score,
        escalate_to_human: escalateToHuman,
      },
    });
    loggedConversationId = logResult.conversationId;
  } catch {
    // non-blocking
  }

  finalMetadata.seller_chat = {
    ...(finalMetadata.seller_chat ?? {}),
    internal: {
      ...(finalMetadata.seller_chat?.internal ?? {}),
      confidence_score: confidence.score,
      confidence_level: confidence.level,
      mcp_context_used: Boolean(mcpContext),
      updated_at: now,
      ...(loggedConversationId
        ? { conversation_id: loggedConversationId }
        : {}),
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
        conversationId: loggedConversationId,
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
