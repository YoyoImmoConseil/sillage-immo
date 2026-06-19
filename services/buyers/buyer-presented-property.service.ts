import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolveAccessibleClientProjectIds } from "@/services/clients/client-project.service";
import {
  listPresentedDocumentsForAdmin,
  listPresentedDocumentsForClient,
  type PresentedPropertyDocument,
} from "./buyer-presented-document.service";

export type PresentedProperty = {
  id: string;
  clientProjectId: string;
  propertyId: string | null;
  label: string;
  address: string | null;
  city: string | null;
  priceAmount: number | null;
  rooms: number | null;
  livingAreaM2: number | null;
  externalUrl: string | null;
  notes: string | null;
  createdByAdminProfileId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PresentedPropertyWithDocuments = PresentedProperty & {
  documents: PresentedPropertyDocument[];
};

type PresentedPropertyRow = {
  id: string;
  client_project_id: string;
  property_id: string | null;
  label: string;
  address: string | null;
  city: string | null;
  price_amount: number | null;
  rooms: number | null;
  living_area_m2: number | null;
  external_url: string | null;
  notes: string | null;
  created_by_admin_profile_id: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

const PRESENTED_COLUMNS =
  "id, client_project_id, property_id, label, address, city, price_amount, rooms, living_area_m2, external_url, notes, created_by_admin_profile_id, created_at, updated_at, archived_at";

const mapRow = (row: PresentedPropertyRow): PresentedProperty => ({
  id: row.id,
  clientProjectId: row.client_project_id,
  propertyId: row.property_id,
  label: row.label,
  address: row.address,
  city: row.city,
  priceAmount: row.price_amount,
  rooms: row.rooms,
  livingAreaM2: row.living_area_m2,
  externalUrl: row.external_url,
  notes: row.notes,
  createdByAdminProfileId: row.created_by_admin_profile_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const validateExternalUrl = (url: string): string => {
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("L'URL doit utiliser http ou https.");
    }
    return parsed.toString();
  } catch {
    throw new Error("URL invalide.");
  }
};

export type PresentedPropertyInput = {
  label: string;
  address?: string | null;
  city?: string | null;
  priceAmount?: number | null;
  rooms?: number | null;
  livingAreaM2?: number | null;
  externalUrl?: string | null;
  propertyId?: string | null;
  notes?: string | null;
};

const normalizeInput = (input: PresentedPropertyInput) => {
  const label = input.label?.trim();
  if (!label) {
    throw new Error("Le libellé du bien est requis.");
  }
  return {
    label,
    address: input.address?.trim() || null,
    city: input.city?.trim() || null,
    price_amount:
      typeof input.priceAmount === "number" && Number.isFinite(input.priceAmount)
        ? Math.round(input.priceAmount)
        : null,
    rooms:
      typeof input.rooms === "number" && Number.isFinite(input.rooms)
        ? Math.round(input.rooms)
        : null,
    living_area_m2:
      typeof input.livingAreaM2 === "number" && Number.isFinite(input.livingAreaM2)
        ? input.livingAreaM2
        : null,
    external_url: input.externalUrl?.trim() ? validateExternalUrl(input.externalUrl) : null,
    property_id: input.propertyId?.trim() || null,
    notes: input.notes?.trim() || null,
  };
};

export const createPresentedProperty = async (input: {
  clientProjectId: string;
  adminProfileId: string;
  data: PresentedPropertyInput;
}): Promise<PresentedProperty> => {
  const normalized = normalizeInput(input.data);
  const { data, error } = await supabaseAdmin
    .from("buyer_presented_properties")
    .insert({
      client_project_id: input.clientProjectId,
      created_by_admin_profile_id: input.adminProfileId,
      ...normalized,
    })
    .select(PRESENTED_COLUMNS)
    .single();
  if (error || !data) {
    throw error ?? new Error("Impossible de créer le bien présenté.");
  }
  return mapRow(data as PresentedPropertyRow);
};

export const updatePresentedProperty = async (input: {
  presentedPropertyId: string;
  data: PresentedPropertyInput;
}): Promise<PresentedProperty> => {
  const normalized = normalizeInput(input.data);
  const { data, error } = await supabaseAdmin
    .from("buyer_presented_properties")
    .update({ ...normalized, updated_at: new Date().toISOString() })
    .eq("id", input.presentedPropertyId)
    .is("archived_at", null)
    .select(PRESENTED_COLUMNS)
    .single();
  if (error || !data) {
    throw error ?? new Error("Impossible de mettre à jour le bien présenté.");
  }
  return mapRow(data as PresentedPropertyRow);
};

export const archivePresentedProperty = async (
  presentedPropertyId: string
): Promise<void> => {
  const { error } = await supabaseAdmin
    .from("buyer_presented_properties")
    .update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", presentedPropertyId);
  if (error) throw error;
};

export const getPresentedProperty = async (
  presentedPropertyId: string
): Promise<PresentedProperty | null> => {
  const { data, error } = await supabaseAdmin
    .from("buyer_presented_properties")
    .select(PRESENTED_COLUMNS)
    .eq("id", presentedPropertyId)
    .is("archived_at", null)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapRow(data as PresentedPropertyRow);
};

export const listPresentedPropertiesForProject = async (
  clientProjectId: string
): Promise<PresentedPropertyWithDocuments[]> => {
  const { data, error } = await supabaseAdmin
    .from("buyer_presented_properties")
    .select(PRESENTED_COLUMNS)
    .eq("client_project_id", clientProjectId)
    .is("archived_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const groups = (data ?? []).map((row) => mapRow(row as PresentedPropertyRow));
  const withDocs = await Promise.all(
    groups.map(async (group) => ({
      ...group,
      documents: await listPresentedDocumentsForAdmin(group.id),
    }))
  );
  return withDocs;
};

/**
 * Buyer-side listing: groups of the project the client can access, each with
 * the documents visible to that client (shared + own uploads).
 */
export const listPresentedPropertiesForClient = async (
  clientProjectId: string,
  clientProfileId: string
): Promise<PresentedPropertyWithDocuments[]> => {
  const accessibleIds = await resolveAccessibleClientProjectIds(clientProfileId);
  if (!accessibleIds.includes(clientProjectId)) {
    return [];
  }
  const { data, error } = await supabaseAdmin
    .from("buyer_presented_properties")
    .select(PRESENTED_COLUMNS)
    .eq("client_project_id", clientProjectId)
    .is("archived_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const groups = (data ?? []).map((row) => mapRow(row as PresentedPropertyRow));
  const withDocs = await Promise.all(
    groups.map(async (group) => ({
      ...group,
      documents: await listPresentedDocumentsForClient(group.id, clientProfileId),
    }))
  );
  return withDocs;
};

/**
 * Authorize a client (titulaire or co-acquéreur) to act on a presented
 * property: the parent client_project must be in his accessible set.
 */
export const canAccessPresentedProperty = async (
  clientProfileId: string,
  presentedPropertyId: string
): Promise<PresentedProperty | null> => {
  const group = await getPresentedProperty(presentedPropertyId);
  if (!group) return null;
  const accessibleIds = await resolveAccessibleClientProjectIds(clientProfileId);
  if (!accessibleIds.includes(group.clientProjectId)) return null;
  return group;
};
