import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { parseFloorNumber, getSellerMetadataSections } from "@/services/sellers/seller-metadata";

const buildFormattedAddress = (lead: {
  property_address: string | null;
  postal_code: string | null;
  city: string | null;
}) => {
  return [lead.property_address, [lead.postal_code, lead.city].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
};

export const ensureEstimationProperty = async (input: {
  sellerLeadId: string;
  clientProjectId?: string | null;
  linkedByAdminProfileId?: string | null;
}) => {
  const { data: lead, error: leadError } = await supabaseAdmin
    .from("seller_leads")
    .select("id, contact_identity_id, property_type, property_address, city, postal_code, metadata")
    .eq("id", input.sellerLeadId)
    .single();
  if (leadError || !lead) {
    throw new Error(leadError?.message ?? "Lead vendeur introuvable pour creer le bien.");
  }

  const sections = getSellerMetadataSections(lead.metadata);
  const propertyDetails = sections.propertyDetails;
  const valuationNormalized =
    sections.valuation?.normalized && typeof sections.valuation.normalized === "object"
      ? (sections.valuation.normalized as Record<string, unknown>)
      : null;
  const source = "seller_estimation";
  const sourceRef = lead.id;

  const { data: existingProperty, error: existingPropertyError } = await supabaseAdmin
    .from("properties")
    .select("id")
    .eq("source", source)
    .eq("source_ref", sourceRef)
    .maybeSingle();
  if (existingPropertyError) throw existingPropertyError;

  const payload = {
    source,
    source_ref: sourceRef,
    kind: "sale" as const,
    negotiation: "sale",
    title:
      buildFormattedAddress(lead) ||
      `Bien estimation ${lead.city ?? lead.postal_code ?? lead.id.slice(0, 8)}`,
    property_type: lead.property_type,
    street: lead.property_address,
    postal_code: lead.postal_code,
    city: lead.city,
    country: "France",
    formatted_address: buildFormattedAddress(lead) || null,
    living_area: propertyDetails?.living_area ?? null,
    rooms: propertyDetails?.rooms ?? null,
    bedrooms: propertyDetails?.bedrooms ?? null,
    floor: parseFloorNumber(propertyDetails?.floor) ?? null,
    has_terrace: propertyDetails?.terrace ?? null,
    has_elevator: propertyDetails?.elevator ?? null,
    raw_payload: valuationNormalized ?? {},
    metadata: {
      origin: "seller_estimation",
      seller_lead_id: lead.id,
      contact_identity_id: lead.contact_identity_id ?? null,
      schema_version: 1,
    },
    updated_at: new Date().toISOString(),
    last_synced_at: new Date().toISOString(),
  };

  let propertyId: string | null = null;
  if (existingProperty?.id) {
    const { data, error } = await supabaseAdmin
      .from("properties")
      .update(payload)
      .eq("id", existingProperty.id)
      .select("id")
      .single();
    if (error) throw error;
    propertyId = data?.id ?? existingProperty.id;
  } else {
    const { data, error } = await supabaseAdmin
      .from("properties")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw error;
    propertyId = data?.id ?? null;
  }

  if (!propertyId) {
    throw new Error("Impossible de creer le bien d'estimation.");
  }

  if (input.clientProjectId) {
    const { data: existingLink, error: existingLinkError } = await supabaseAdmin
      .from("project_properties")
      .select("id")
      .eq("client_project_id", input.clientProjectId)
      .eq("property_id", propertyId)
      .is("unlinked_at", null)
      .maybeSingle();
    if (existingLinkError) throw existingLinkError;

    if (!existingLink) {
      const { error: linkError } = await supabaseAdmin.from("project_properties").insert({
        client_project_id: input.clientProjectId,
        property_id: propertyId,
        relationship_type: "seller_subject_property",
        is_primary: true,
        linked_by_admin_profile_id: input.linkedByAdminProfileId ?? null,
        metadata: {
          origin: "seller_estimation",
          seller_lead_id: lead.id,
        },
      });
      if (linkError) throw linkError;
    }
  }

  return {
    propertyId,
  };
};
