import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { splitFullName } from "@/services/contacts/contact-identity.service";
import { createClientProject, emitClientProjectEvent } from "./client-project.service";
import { createClientProfile } from "./client-profile.service";

export const ensureBuyerProjectFromLead = async (input: {
  buyerLeadId: string;
  adminProfileId?: string | null;
}) => {
  const { data: existingBuyerProject, error: existingBuyerProjectError } = await supabaseAdmin
    .from("buyer_projects")
    .select("id, client_project_id, buyer_lead_id")
    .eq("buyer_lead_id", input.buyerLeadId)
    .maybeSingle();
  if (existingBuyerProjectError) throw existingBuyerProjectError;
  if (existingBuyerProject?.client_project_id) {
    return {
      buyerProjectId: existingBuyerProject.id,
      clientProjectId: existingBuyerProject.client_project_id,
    };
  }

  const [{ data: buyerLead, error: buyerLeadError }, { data: searchProfile, error: searchProfileError }] =
    await Promise.all([
      supabaseAdmin
        .from("buyer_leads")
        .select("id, full_name, email, phone, source, assigned_admin_profile_id")
        .eq("id", input.buyerLeadId)
        .single(),
      supabaseAdmin
        .from("buyer_search_profiles")
        .select("id")
        .eq("buyer_lead_id", input.buyerLeadId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
  if (buyerLeadError || !buyerLead) throw new Error(buyerLeadError?.message ?? "Lead acquereur introuvable.");
  if (searchProfileError) throw searchProfileError;

  const fullName = buyerLead.full_name?.trim() || null;
  const { firstName, lastName } = splitFullName(fullName);
  const clientProfile = await createClientProfile({
    email: buyerLead.email,
    phone: buyerLead.phone ?? undefined,
    firstName: firstName ?? undefined,
    lastName: lastName ?? undefined,
    fullName: fullName ?? undefined,
  });

  const clientProjectId = await createClientProject({
    clientProfileId: clientProfile.clientProfileId,
    projectType: "buyer",
    title: `Achat - ${buyerLead.full_name ?? buyerLead.email}`,
    createdFrom: "buyer_lead",
    primaryAdminProfileId:
      input.adminProfileId ?? buyerLead.assigned_admin_profile_id ?? undefined,
    source: buyerLead.source ?? undefined,
  });

  const { data: insertedBuyerProject, error: insertedBuyerProjectError } = await supabaseAdmin
    .from("buyer_projects")
    .insert({
      client_project_id: clientProjectId,
      buyer_lead_id: buyerLead.id,
      active_search_profile_id: searchProfile?.id ?? null,
      metadata: {
        source: buyerLead.source ?? null,
      },
    })
    .select("id")
    .single();
  if (insertedBuyerProjectError || !insertedBuyerProject) {
    throw new Error(insertedBuyerProjectError?.message ?? "Impossible de creer le projet acquereur.");
  }

  if (searchProfile?.id) {
    const { error: searchUpdateError } = await supabaseAdmin
      .from("buyer_search_profiles")
      .update({
        client_project_id: clientProjectId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", searchProfile.id);
    if (searchUpdateError) throw searchUpdateError;
  }

  await emitClientProjectEvent({
    clientProjectId,
    eventName: "buyer_project.created_from_lead",
    eventCategory: "project",
    actorType: "system",
    payload: {
      buyer_lead_id: buyerLead.id,
      search_profile_id: searchProfile?.id ?? null,
    },
  });

  return {
    buyerProjectId: insertedBuyerProject.id,
    clientProjectId,
  };
};

export const getLatestBuyerLeadIdByEmail = async (email: string) => {
  const { data, error } = await supabaseAdmin
    .from("buyer_leads")
    .select("id")
    .eq("email", email.trim().toLowerCase())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
};
