import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getSellerMetadataSections } from "./seller-metadata";
import { splitFullName } from "@/services/contacts/contact-identity.service";

// Porte 2 — bounded, customer-safe context for the seller chat.
//
// This deliberately does NOT expose internal scoring, next_best_action,
// AI insights, or superfluous PII (email/phone). The customer-facing model
// only ever sees a sanitized "client view" plus, when the lead has been
// converted into a tracked project, a short commercialization status and the
// labels of the documents already shared with the client.

export type SellerChatClientView = {
  identity: { firstName: string | null };
  property: {
    city: string | null;
    propertyType: string | null;
    timeline: string | null;
    status: string | null;
  };
  conversationId: string | null;
};

export type SellerChatDocumentSummary = {
  label: string;
  kind: string;
};

export type SellerChatProjectStatus = {
  converted: boolean;
  clientProjectId: string | null;
  projectStatus: string | null;
  mandateStatus: string | null;
  milestones: {
    mandateSignedAt: string | null;
    offerReceivedAt: string | null;
    preliminarySaleSignedAt: string | null;
    deedSignedAt: string | null;
  } | null;
  documents: SellerChatDocumentSummary[];
};

export type SellerChatContext = {
  clientView: SellerChatClientView;
  projectStatus: SellerChatProjectStatus;
  assignedAdminProfileId: string | null;
};

const EMPTY_STATUS: SellerChatProjectStatus = {
  converted: false,
  clientProjectId: null,
  projectStatus: null,
  mandateStatus: null,
  milestones: null,
  documents: [],
};

const listSharedDocumentLabels = async (
  clientProjectId: string
): Promise<SellerChatDocumentSummary[]> => {
  // Subject properties of the project.
  const { data: links } = await supabaseAdmin
    .from("project_properties")
    .select("property_id")
    .eq("client_project_id", clientProjectId)
    .is("unlinked_at", null);
  const propertyIds = (links ?? [])
    .map((row) => (row as { property_id: string | null }).property_id)
    .filter((id): id is string => Boolean(id));
  if (propertyIds.length === 0) return [];

  // Only documents explicitly shared with the client (admin_and_client).
  // We expose labels + kind only — never storage paths or signed URLs.
  const { data: docs } = await supabaseAdmin
    .from("property_documents")
    .select("label, kind, visibility, deleted_at, property_id")
    .in("property_id", propertyIds)
    .eq("visibility", "admin_and_client")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(20);

  return (docs ?? [])
    .map((row) => {
      const r = row as { label: string | null; kind: string | null };
      return { label: r.label ?? "Document", kind: r.kind ?? "file" };
    })
    .slice(0, 20);
};

// Conversation continuity: when a seller lead converts into a tracked client
// project, the anonymous "merci-vendeur" chat history must follow the seller
// into their authenticated client space. We re-attach the existing
// ai_conversations row to the new client_project_id (best-effort).
export const reattachSellerConversationToProject = async (
  sellerLeadId: string,
  clientProjectId: string
): Promise<{ reattached: boolean; conversationId: string | null }> => {
  const { data: lead } = await supabaseAdmin
    .from("seller_leads")
    .select("metadata")
    .eq("id", sellerLeadId)
    .maybeSingle();
  if (!lead) return { reattached: false, conversationId: null };

  const { sellerChat } = getSellerMetadataSections(lead.metadata);
  const conversationId =
    typeof sellerChat?.internal?.conversation_id === "string"
      ? sellerChat.internal.conversation_id
      : null;
  if (!conversationId) return { reattached: false, conversationId: null };

  const { error } = await supabaseAdmin
    .from("ai_conversations")
    .update({
      client_project_id: clientProjectId,
      entity_type: "seller_project",
    })
    .eq("id", conversationId);
  if (error) return { reattached: false, conversationId };
  return { reattached: true, conversationId };
};

export const gatherSellerChatContext = async (
  sellerLeadId: string
): Promise<SellerChatContext> => {
  const { data: lead, error } = await supabaseAdmin
    .from("seller_leads")
    .select(
      "id, full_name, city, property_type, timeline, status, metadata, assigned_admin_profile_id"
    )
    .eq("id", sellerLeadId)
    .maybeSingle();

  if (error || !lead) {
    throw new Error(error?.message ?? "Lead vendeur introuvable.");
  }

  const { sellerChat } = getSellerMetadataSections(lead.metadata);
  const { firstName } = splitFullName(lead.full_name);
  const conversationId =
    typeof sellerChat?.internal?.conversation_id === "string"
      ? sellerChat.internal.conversation_id
      : null;

  const clientView: SellerChatClientView = {
    identity: { firstName: firstName ?? null },
    property: {
      city: lead.city,
      propertyType: lead.property_type,
      timeline: lead.timeline,
      status: lead.status,
    },
    conversationId,
  };

  // Resolve the tracked project (if the lead has converted) for a bounded
  // "status + documents" read.
  const { data: sellerProject } = await supabaseAdmin
    .from("seller_projects")
    .select(
      "id, client_project_id, project_status, mandate_status, mandate_signed_at, offer_received_at, preliminary_sale_signed_at, deed_signed_at"
    )
    .eq("seller_lead_id", sellerLeadId)
    .maybeSingle();

  let projectStatus: SellerChatProjectStatus = EMPTY_STATUS;
  if (sellerProject && sellerProject.client_project_id) {
    const sp = sellerProject as {
      client_project_id: string;
      project_status: string | null;
      mandate_status: string | null;
      mandate_signed_at: string | null;
      offer_received_at: string | null;
      preliminary_sale_signed_at: string | null;
      deed_signed_at: string | null;
    };
    const documents = await listSharedDocumentLabels(sp.client_project_id);
    projectStatus = {
      converted: true,
      clientProjectId: sp.client_project_id,
      projectStatus: sp.project_status,
      mandateStatus: sp.mandate_status,
      milestones: {
        mandateSignedAt: sp.mandate_signed_at,
        offerReceivedAt: sp.offer_received_at,
        preliminarySaleSignedAt: sp.preliminary_sale_signed_at,
        deedSignedAt: sp.deed_signed_at,
      },
      documents,
    };
  }

  return {
    clientView,
    projectStatus,
    assignedAdminProfileId: lead.assigned_admin_profile_id ?? null,
  };
};
