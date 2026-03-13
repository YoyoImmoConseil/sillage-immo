import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Database } from "@/types/db/supabase";
import type { BuyerLeadSnapshot, BuyerSearchProfileSnapshot } from "@/types/domain/buyers";
import type { PropertyBusinessType } from "@/types/domain/properties";

type BuyerLeadRow = Database["public"]["Tables"]["buyer_leads"]["Row"];
type BuyerSearchProfileRow = Database["public"]["Tables"]["buyer_search_profiles"]["Row"];

export type BuyerLeadListItem = BuyerLeadSnapshot & {
  searchProfile: BuyerSearchProfileSnapshot | null;
};

export type BuyerLeadDetail = {
  lead: BuyerLeadSnapshot;
  searchProfile: BuyerSearchProfileSnapshot | null;
};

const normalizeStringArray = (value: string) => {
  return Array.from(
    new Set(
      value
        .split(/[\n,;]+/g)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
};

const mapBuyerLead = (row: BuyerLeadRow): BuyerLeadSnapshot => ({
  id: row.id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  fullName: row.full_name,
  email: row.email,
  phone: row.phone,
  source: row.source,
  status: row.status as BuyerLeadSnapshot["status"],
  timeline: row.timeline,
  financingStatus: row.financing_status,
  preferredContactChannel: row.preferred_contact_channel,
  notes: row.notes,
  assignedAdminProfileId: row.assigned_admin_profile_id,
  metadata: row.metadata,
});

const mapSearchProfile = (row: BuyerSearchProfileRow): BuyerSearchProfileSnapshot => ({
  id: row.id,
  buyerLeadId: row.buyer_lead_id,
  businessType: row.business_type as PropertyBusinessType,
  status: row.status,
  locationText: row.location_text,
  cities: row.cities,
  propertyTypes: row.property_types,
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
  criteria: row.criteria,
});

const inferBusinessType = (searchDetails: string): PropertyBusinessType => {
  const normalized = searchDetails.toLowerCase();
  if (normalized.includes("location") || normalized.includes("louer") || normalized.includes("loyer")) {
    return "rental";
  }
  return "sale";
};

export const createBuyerLeadFromWebsite = async (input: {
  fullName: string;
  email: string;
  phone?: string;
  searchDetails: string;
}) => {
  const { data: leadData, error: leadError } = await supabaseAdmin
    .from("buyer_leads")
    .insert({
      full_name: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone?.trim() || null,
      source: "website_home_buyer_assistant",
      notes: input.searchDetails.trim(),
      metadata: {
        raw_search_details: input.searchDetails.trim(),
      },
    })
    .select("*")
    .single();

  if (leadError || !leadData) {
    throw new Error(leadError?.message ?? "Impossible de creer le lead acquereur.");
  }
  const lead = leadData as BuyerLeadRow;

  const { data: searchProfileData, error: searchProfileError } = await supabaseAdmin
    .from("buyer_search_profiles")
    .insert({
      buyer_lead_id: lead.id,
      business_type: inferBusinessType(input.searchDetails),
      location_text: input.searchDetails.trim(),
      criteria: {
        raw_search_details: input.searchDetails.trim(),
      },
    })
    .select("*")
    .single();

  if (searchProfileError || !searchProfileData) {
    throw new Error(searchProfileError?.message ?? "Impossible de creer le profil de recherche.");
  }

  await supabaseAdmin.from("audit_log").insert({
    actor_type: "anonymous",
    action: "buyer_lead_created",
    entity_type: "buyer_lead",
    entity_id: lead.id,
    data: {
      email: input.email.trim().toLowerCase(),
      source: "website_home_buyer_assistant",
    },
  });

  return {
    lead: mapBuyerLead(lead),
    searchProfile: mapSearchProfile(searchProfileData as BuyerSearchProfileRow),
  };
};

export const listBuyerLeadsForAdmin = async (input: {
  search?: string;
  status?: string;
  businessType?: string;
}) => {
  let query = supabaseAdmin
    .from("buyer_leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(150);

  if (input.search?.trim()) {
    const term = input.search.trim();
    query = query.or(
      `full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%,notes.ilike.%${term}%`
    );
  }
  if (input.status?.trim()) {
    query = query.eq("status", input.status.trim());
  }

  const { data: leadsData, error: leadsError } = await query;
  if (leadsError) {
    throw new Error(leadsError.message);
  }

  const leadRows = (leadsData ?? []) as BuyerLeadRow[];
  const buyerLeadIds = leadRows.map((row) => row.id);

  const { data: profilesData, error: profilesError } = buyerLeadIds.length
    ? await supabaseAdmin
        .from("buyer_search_profiles")
        .select("*")
        .in("buyer_lead_id", buyerLeadIds)
    : { data: [], error: null };

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const profiles = (profilesData ?? []) as BuyerSearchProfileRow[];
  const profileByLeadId = new Map(profiles.map((row) => [row.buyer_lead_id, row]));

  return leadRows
    .map((row) => ({
      ...mapBuyerLead(row),
      searchProfile: profileByLeadId.get(row.id) ? mapSearchProfile(profileByLeadId.get(row.id)!) : null,
    }))
    .filter((item) => {
      if (!input.businessType?.trim()) return true;
      return item.searchProfile?.businessType === input.businessType;
    }) satisfies BuyerLeadListItem[];
};

export const getBuyerLeadDetailForAdmin = async (buyerLeadId: string): Promise<BuyerLeadDetail | null> => {
  const [{ data: leadData, error: leadError }, { data: searchProfileData, error: searchProfileError }] =
    await Promise.all([
      supabaseAdmin.from("buyer_leads").select("*").eq("id", buyerLeadId).maybeSingle(),
      supabaseAdmin
        .from("buyer_search_profiles")
        .select("*")
        .eq("buyer_lead_id", buyerLeadId)
        .maybeSingle(),
    ]);

  if (leadError) {
    throw new Error(leadError.message);
  }
  if (searchProfileError) {
    throw new Error(searchProfileError.message);
  }
  if (!leadData) return null;

  return {
    lead: mapBuyerLead(leadData as BuyerLeadRow),
    searchProfile: searchProfileData ? mapSearchProfile(searchProfileData as BuyerSearchProfileRow) : null,
  };
};

export const updateBuyerLeadForAdmin = async (input: {
  buyerLeadId: string;
  fullName: string;
  email: string;
  phone?: string;
  status: string;
  timeline?: string;
  financingStatus?: string;
  preferredContactChannel?: string;
  notes?: string;
  businessType: PropertyBusinessType;
  locationText?: string;
  cities: string;
  propertyTypes: string;
  budgetMin?: number;
  budgetMax?: number;
  roomsMin?: number;
  roomsMax?: number;
  bedroomsMin?: number;
  livingAreaMin?: number;
  livingAreaMax?: number;
  floorMin?: number;
  floorMax?: number;
  requiresTerrace?: boolean | null;
  requiresElevator?: boolean | null;
}) => {
  const now = new Date().toISOString();
  const cities = normalizeStringArray(input.cities);
  const propertyTypes = normalizeStringArray(input.propertyTypes);

  const { error: leadError } = await supabaseAdmin
    .from("buyer_leads")
    .update({
      updated_at: now,
      full_name: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone?.trim() || null,
      status: input.status,
      timeline: input.timeline?.trim() || null,
      financing_status: input.financingStatus?.trim() || null,
      preferred_contact_channel: input.preferredContactChannel?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .eq("id", input.buyerLeadId);

  if (leadError) {
    throw new Error(leadError.message);
  }

  const { data: existingSearchProfile } = await supabaseAdmin
    .from("buyer_search_profiles")
    .select("id")
    .eq("buyer_lead_id", input.buyerLeadId)
    .maybeSingle();

  const payload: Database["public"]["Tables"]["buyer_search_profiles"]["Insert"] = {
    buyer_lead_id: input.buyerLeadId,
    business_type: input.businessType,
    status: "active",
    location_text: input.locationText?.trim() || null,
    cities,
    property_types: propertyTypes,
    budget_min: input.budgetMin ?? null,
    budget_max: input.budgetMax ?? null,
    rooms_min: input.roomsMin ?? null,
    rooms_max: input.roomsMax ?? null,
    bedrooms_min: input.bedroomsMin ?? null,
    living_area_min: input.livingAreaMin ?? null,
    living_area_max: input.livingAreaMax ?? null,
    floor_min: input.floorMin ?? null,
    floor_max: input.floorMax ?? null,
    requires_terrace: input.requiresTerrace ?? null,
    requires_elevator: input.requiresElevator ?? null,
    criteria: {},
    updated_at: now,
  };

  const { error: profileError } = existingSearchProfile?.id
    ? await supabaseAdmin
        .from("buyer_search_profiles")
        .update(payload)
        .eq("buyer_lead_id", input.buyerLeadId)
    : await supabaseAdmin.from("buyer_search_profiles").insert(payload);

  if (profileError) {
    throw new Error(profileError.message);
  }
};
