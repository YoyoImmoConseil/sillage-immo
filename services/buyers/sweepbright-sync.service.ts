import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  sendSweepBrightGeneralLead,
  type SweepBrightGeneralLeadInput,
} from "@/services/properties/sweepbright-leads.service";
import type { BuyerSearchProfileSnapshot } from "@/types/domain/buyers";
import type { Database } from "@/types/db/supabase";
import { splitFullName } from "@/services/contacts/contact-identity.service";
import {
  mapBuyerSearchProfileToSweepBrightPreferences,
  type SweepBrightBuyerPreferences,
} from "./sweepbright-buyer-mapper";

export { mapBuyerSearchProfileToSweepBrightPreferences };
export type { SweepBrightBuyerPreferences };

type BuyerLeadRow = Database["public"]["Tables"]["buyer_leads"]["Row"];
type BuyerSearchProfileRow = Database["public"]["Tables"]["buyer_search_profiles"]["Row"];

const toSearchProfileSnapshot = (row: BuyerSearchProfileRow): BuyerSearchProfileSnapshot => ({
  id: row.id,
  buyerLeadId: row.buyer_lead_id,
  businessType: row.business_type as BuyerSearchProfileSnapshot["businessType"],
  status: row.status,
  locationText: row.location_text,
  cities: row.cities ?? [],
  propertyTypes: row.property_types ?? [],
  budgetMin: row.budget_min,
  budgetMax: row.budget_max,
  roomsMin: row.rooms_min,
  roomsMax: row.rooms_max,
  bedroomsMin: row.bedrooms_min,
  livingAreaMin: row.living_area_min,
  livingAreaMax: row.living_area_max,
  floorMin: row.floor_min,
  floorMax: row.floor_max,
  requiresTerrace: row.requires_terrace,
  requiresElevator: row.requires_elevator,
  criteria: row.criteria ?? {},
});

const buildMessage = (profile: BuyerSearchProfileSnapshot) => {
  const parts: string[] = [];
  parts.push(
    profile.businessType === "rental"
      ? "Demande de location creee via le site Sillage Immo (auto-inscription verifiee par email)."
      : "Demande d'acquisition creee via le site Sillage Immo (auto-inscription verifiee par email)."
  );
  if (profile.locationText) {
    parts.push(`Zone souhaitee : ${profile.locationText}`);
  } else if (profile.cities.length > 0) {
    parts.push(`Villes : ${profile.cities.join(", ")}`);
  }
  if (profile.propertyTypes.length > 0) {
    parts.push(`Types de biens : ${profile.propertyTypes.join(", ")}`);
  }
  if (profile.budgetMin !== null || profile.budgetMax !== null) {
    const fmt = (value: number | null) => (value === null ? "-" : value.toLocaleString("fr-FR"));
    parts.push(`Budget : ${fmt(profile.budgetMin)} - ${fmt(profile.budgetMax)} €`);
  }
  if (profile.roomsMin !== null || profile.roomsMax !== null) {
    parts.push(`Pieces : ${profile.roomsMin ?? "-"} a ${profile.roomsMax ?? "-"}`);
  }
  if (profile.livingAreaMin !== null || profile.livingAreaMax !== null) {
    parts.push(`Surface : ${profile.livingAreaMin ?? "-"} a ${profile.livingAreaMax ?? "-"} m²`);
  }
  return parts.join("\n");
};

const getActiveSearchProfileForLead = async (
  buyerLeadId: string
): Promise<BuyerSearchProfileRow | null> => {
  const { data, error } = await supabaseAdmin
    .from("buyer_search_profiles")
    .select("*")
    .eq("buyer_lead_id", buyerLeadId)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as BuyerSearchProfileRow | null) ?? null;
};

const extractContactIdFromPayload = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const candidates: Array<unknown> = [
    record.id,
    (record.data as Record<string, unknown> | undefined)?.id,
    (record.contact as Record<string, unknown> | undefined)?.id,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) return candidate.trim();
    if (typeof candidate === "number" && Number.isFinite(candidate)) return String(candidate);
  }
  return null;
};

export type SyncBuyerLeadResult =
  | { status: "synced"; contactId: string | null }
  | { status: "skipped_already_synced" }
  | { status: "skipped_no_profile" }
  | { status: "skipped_no_contact"; reason: string }
  | { status: "failed"; error: string };

export const syncBuyerLeadToSweepBright = async (
  buyerLeadId: string,
  options?: { force?: boolean }
): Promise<SyncBuyerLeadResult> => {
  const { data: leadData, error: leadError } = await supabaseAdmin
    .from("buyer_leads")
    .select("*")
    .eq("id", buyerLeadId)
    .maybeSingle();
  if (leadError) throw leadError;
  const lead = leadData as BuyerLeadRow | null;
  if (!lead) {
    return { status: "failed", error: "buyer_lead_not_found" };
  }

  if (!options?.force && lead.sweepbright_contact_id) {
    return { status: "skipped_already_synced" };
  }

  const email = lead.email?.trim().toLowerCase();
  if (!email) {
    return { status: "skipped_no_contact", reason: "missing_email" };
  }

  const profileRow = await getActiveSearchProfileForLead(lead.id);
  if (!profileRow) {
    return { status: "skipped_no_profile" };
  }

  const profile = toSearchProfileSnapshot(profileRow);
  const { preferences, locationPreference } = mapBuyerSearchProfileToSweepBrightPreferences(profile);
  const { firstName, lastName } = splitFullName(lead.full_name);
  const resolvedFirstName = firstName || lead.full_name || email;
  const resolvedLastName = lastName || ".";
  const phone = lead.phone?.trim() || "non renseigne";

  const leadInput: SweepBrightGeneralLeadInput = {
    firstName: resolvedFirstName,
    lastName: resolvedLastName,
    email,
    phone,
    message: buildMessage(profile),
    preferences,
    locationPreference,
  };

  try {
    const result = await sendSweepBrightGeneralLead(leadInput);
    const contactId = extractContactIdFromPayload(result);
    const nowIso = new Date().toISOString();
    await supabaseAdmin
      .from("buyer_leads")
      .update({
        sweepbright_contact_id: contactId,
        sweepbright_synced_at: nowIso,
        sweepbright_last_error: null,
        updated_at: nowIso,
      })
      .eq("id", lead.id);

    await supabaseAdmin.from("audit_log").insert({
      actor_type: "system",
      action: "buyer_lead_sweepbright_synced",
      entity_type: "buyer_lead",
      entity_id: lead.id,
      data: {
        contact_id: contactId,
        buyer_search_profile_id: profile.id,
      },
    });

    return { status: "synced", contactId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "sweepbright_sync_failed";
    await supabaseAdmin
      .from("buyer_leads")
      .update({
        sweepbright_last_error: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", lead.id);

    await supabaseAdmin.from("audit_log").insert({
      actor_type: "system",
      action: "buyer_lead_sweepbright_sync_failed",
      entity_type: "buyer_lead",
      entity_id: lead.id,
      data: {
        error: message,
        buyer_search_profile_id: profile.id,
      },
    });

    return { status: "failed", error: message };
  }
};

export const markBuyerLeadEmailVerified = async (buyerLeadId: string) => {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("buyer_leads")
    .update({
      email_verified_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", buyerLeadId)
    .is("email_verified_at", null)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
};

export const getBuyerLeadIdsForClientProfile = async (
  clientProfileId: string
): Promise<string[]> => {
  const { data, error } = await supabaseAdmin
    .from("client_projects")
    .select("id, buyer_projects:buyer_projects(buyer_lead_id)")
    .eq("client_profile_id", clientProfileId)
    .eq("project_type", "buyer");
  if (error) throw error;

  const rows = (data ?? []) as Array<{
    id: string;
    buyer_projects: Array<{ buyer_lead_id: string | null }> | null;
  }>;

  const ids = new Set<string>();
  for (const row of rows) {
    const projects = row.buyer_projects ?? [];
    for (const bp of projects) {
      if (bp.buyer_lead_id) ids.add(bp.buyer_lead_id);
    }
  }
  return [...ids];
};

export const runBuyerPostVerificationTasks = async (clientProfileId: string) => {
  const buyerLeadIds = await getBuyerLeadIdsForClientProfile(clientProfileId);
  const results: Array<{
    buyerLeadId: string;
    markedVerified: boolean;
    sync: SyncBuyerLeadResult;
  }> = [];

  for (const buyerLeadId of buyerLeadIds) {
    const markedVerified = await markBuyerLeadEmailVerified(buyerLeadId);
    const sync = await syncBuyerLeadToSweepBright(buyerLeadId);
    results.push({ buyerLeadId, markedVerified, sync });
  }

  return results;
};
