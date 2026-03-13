import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getSellerMetadataSections } from "./seller-metadata";
import type { SellerLeadSnapshot } from "@/types/domain/sellers";

export const getSellerLeadContextSnapshot = async (
  sellerLeadId: string
): Promise<SellerLeadSnapshot> => {
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

  const {
    propertyDetails,
    valuation,
    scoring,
    aiInsight,
    sellerChat,
    sellerChatInternal,
    sellerChatMessages,
  } = getSellerMetadataSections(lead.metadata);

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
      score: latestScoreEvent?.score ?? scoring?.score ?? null,
      segment: latestScoreEvent?.segment ?? scoring?.segment ?? null,
      nextBestAction: latestScoreEvent?.next_best_action ?? scoring?.next_best_action ?? null,
      breakdown: latestScoreEvent?.breakdown ?? null,
      reasons: latestScoreEvent?.reasons ?? null,
      updatedAt: latestScoreEvent?.created_at ?? scoring?.updated_at ?? null,
    },
    aiInsight,
    sellerChat: {
      messages: sellerChatMessages.slice(-12),
      messageCount: sellerChatMessages.length,
      knowledgeVersion: typeof sellerChat?.knowledge_version === "string" ? sellerChat.knowledge_version : null,
      updatedAt: typeof sellerChat?.updated_at === "string" ? sellerChat.updated_at : null,
      internal: {
        confidenceScore: typeof sellerChatInternal?.confidence_score === "number" ? sellerChatInternal.confidence_score : null,
        confidenceLevel: typeof sellerChatInternal?.confidence_level === "string" ? sellerChatInternal.confidence_level : null,
        mcpContextUsed: typeof sellerChatInternal?.mcp_context_used === "boolean" ? sellerChatInternal.mcp_context_used : null,
      },
    },
  };
};
