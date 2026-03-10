import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

type SellerChatMessage = {
  role: "user" | "assistant";
  text: string;
  created_at: string;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
};

const isSellerChatMessage = (value: unknown): value is SellerChatMessage => {
  const row = asRecord(value);
  return Boolean(
    row &&
      (row.role === "user" || row.role === "assistant") &&
      typeof row.text === "string" &&
      typeof row.created_at === "string"
  );
};

export const getSellerLeadContextSnapshot = async (sellerLeadId: string) => {
  const { data: lead, error: leadError } = await supabaseAdmin
    .from("seller_leads")
    .select(
      "id, full_name, email, phone, city, postal_code, property_type, property_address, timeline, status, metadata"
    )
    .eq("id", sellerLeadId)
    .maybeSingle();

  if (leadError || !lead) {
    throw new Error(leadError?.message ?? "Lead vendeur introuvable.");
  }

  const { data: latestScoreEvent, error: scoreError } = await supabaseAdmin
    .from("seller_scoring_events")
    .select("score, segment, next_best_action, breakdown, reasons, created_at")
    .eq("seller_lead_id", sellerLeadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (scoreError) {
    throw new Error(scoreError.message);
  }

  const metadata = asRecord(lead.metadata) ?? {};
  const scoring = asRecord(metadata.scoring) ?? {};
  const aiInsight = asRecord(scoring.ai_insight) ?? null;
  const propertyDetails = asRecord(metadata.property_details) ?? null;
  const valuation = asRecord(metadata.valuation) ?? null;
  const sellerChatMetadata = asRecord(metadata.seller_chat) ?? {};
  const sellerChatInternal = asRecord(sellerChatMetadata.internal) ?? {};
  const sellerChatMessages = Array.isArray(sellerChatMetadata.messages)
    ? sellerChatMetadata.messages.filter(isSellerChatMessage).slice(-12)
    : [];

  return {
    sellerLeadId: lead.id,
    identity: {
      fullName: lead.full_name,
      email: lead.email,
      phone: lead.phone,
    },
    property: {
      city: lead.city,
      postalCode: lead.postal_code,
      propertyType: lead.property_type,
      propertyAddress: lead.property_address,
      timeline: lead.timeline,
      status: lead.status,
      propertyDetails,
      valuation,
    },
    scoring: {
      score: latestScoreEvent?.score ?? scoring.score ?? null,
      segment: latestScoreEvent?.segment ?? scoring.segment ?? null,
      nextBestAction: latestScoreEvent?.next_best_action ?? scoring.next_best_action ?? null,
      breakdown: latestScoreEvent?.breakdown ?? null,
      reasons: latestScoreEvent?.reasons ?? null,
      updatedAt: latestScoreEvent?.created_at ?? scoring.updated_at ?? null,
    },
    aiInsight,
    sellerChat: {
      messages: sellerChatMessages,
      messageCount: sellerChatMessages.length,
      knowledgeVersion:
        typeof sellerChatMetadata.knowledge_version === "string"
          ? sellerChatMetadata.knowledge_version
          : null,
      updatedAt:
        typeof sellerChatMetadata.updated_at === "string" ? sellerChatMetadata.updated_at : null,
      internal: {
        confidenceScore:
          typeof sellerChatInternal.confidence_score === "number"
            ? sellerChatInternal.confidence_score
            : null,
        confidenceLevel:
          typeof sellerChatInternal.confidence_level === "string"
            ? sellerChatInternal.confidence_level
            : null,
        mcpContextUsed:
          typeof sellerChatInternal.mcp_context_used === "boolean"
            ? sellerChatInternal.mcp_context_used
            : null,
      },
    },
  };
};
