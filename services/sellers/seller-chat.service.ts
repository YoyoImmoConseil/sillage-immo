import "server-only";
import type { AppLocale } from "@/lib/i18n/config";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { emitDomainEvent } from "@/lib/events/domain-events";
import { gatherSellerChatContext } from "./seller-chat-context.service";
import { callOpenAiChat, CLIENT_CHAT_MODEL } from "@/lib/ai/openai";
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

Contexte fourni (source de verite, ne rien inventer au-dela):
- clientView: prenom + bien (ville, type, echeance) du vendeur. Tutoiement interdit, vouvoiement systematique.
- projectStatus: si le projet est suivi (converted=true), tu disposes du statut de commercialisation (mandat, offre, compromis, acte) et de la liste des documents deja partages (labels). Tu peux confirmer l'avancement et rappeler quels documents sont disponibles dans l'espace client, SANS inventer de document ni de date absente.
- Si converted=false, ne laisse pas entendre qu'un suivi detaille existe deja: oriente vers la mise en relation avec le conseiller.

Garde-fous:
- Ne pas donner de conseil juridique ferme.
- Ne jamais garantir un prix de vente ou un delai certain.
- Ne jamais communiquer de donnee interne (score, segment, action commerciale, analyse IA): tu ne les vois pas et ils ne te concernent pas.
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

  // Bounded, customer-safe context only: client view (no internal scoring /
  // AI insight / superfluous PII) + commercialization status + shared
  // document labels when the lead is a tracked project.
  let chatContext: Awaited<ReturnType<typeof gatherSellerChatContext>> | null = null;
  try {
    chatContext = await gatherSellerChatContext(sellerLeadId);
  } catch {
    chatContext = null;
  }
  const hasBoundedContext = Boolean(chatContext);

  const conversationIdFromMeta =
    typeof sellerChat?.internal?.conversation_id === "string"
      ? sellerChat.internal.conversation_id
      : null;

  const chatResult = await callOpenAiChat({
    model: CLIENT_CHAT_MODEL,
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
          clientView: chatContext?.clientView ?? {
            identity: { firstName: null },
            property: {
              city: lead.city,
              propertyType: lead.property_type,
              timeline: null,
              status: null,
            },
            conversationId: conversationIdFromMeta,
          },
          projectStatus: chatContext?.projectStatus ?? null,
          history: previousMessages,
          question: cleanedMessage,
        }),
      },
    ],
    toolName: "seller_chat.ask",
    toolVersion: "2.0.0",
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
    hasMcpContext: hasBoundedContext,
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
      toolVersion: "2.0.0",
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
      mcp_context_used: hasBoundedContext,
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
        mcpContextUsed: hasBoundedContext,
        conversationId: loggedConversationId,
      },
    });
  } catch {
    // non-blocking
  }

  // Real escalation: when the exchange warrants a human callback, emit a
  // dedicated domain event. The outbox processor turns it into an email to
  // the assigned advisor (best-effort, never blocks the chat reply).
  if (escalateToHuman) {
    try {
      await emitDomainEvent({
        aggregateType: "seller_lead",
        aggregateId: sellerLeadId,
        eventName: "seller_lead.escalation_requested",
        payload: {
          assignedAdminProfileId: chatContext?.assignedAdminProfileId ?? null,
          conversationId: loggedConversationId,
          lastUserMessage: cleanedMessage.slice(0, 600),
          confidenceLevel: confidence.level,
        },
      });
    } catch {
      // non-blocking
    }
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
