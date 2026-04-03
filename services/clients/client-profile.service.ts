import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  ensureContactIdentity,
  normalizeEmail,
  normalizePhone,
} from "@/services/contacts/contact-identity.service";

export type CreateClientProfileInput = {
  email: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
};

export type UpdateClientProfileInput = {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
};

export type ClientProfileListItem = {
  id: string;
  email: string;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  authUserId: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  sellerProjectCount: number;
  hasAcceptedInvitation: boolean;
};

export type ClientProfileDetail = ClientProfileListItem & {
  updatedAt: string;
};

export type ClientProfileLookup = {
  id: string;
  email: string;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  auth_user_id: string | null;
  is_active: boolean;
  contact_identity_id: string | null;
};

export const findClientByEmail = async (email: string): Promise<ClientProfileLookup | null> => {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const { data, error } = await supabaseAdmin
    .from("client_profiles")
    .select("id, email, phone, first_name, last_name, full_name, auth_user_id, is_active, contact_identity_id")
    .eq("email", normalized)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return data as ClientProfileLookup | null;
};

export const findClientByPhone = async (phone: string): Promise<ClientProfileLookup | null> => {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  const { data, error } = await supabaseAdmin
    .from("client_profiles")
    .select("id, email, phone, first_name, last_name, full_name, auth_user_id, is_active, contact_identity_id")
    .eq("phone", normalized)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return data as ClientProfileLookup | null;
};

export const createClientProfile = async (input: CreateClientProfileInput) => {
  const email = normalizeEmail(input.email);
  if (!email) throw new Error("Email client invalide.");
  const existing = await findClientByEmail(email);
  const contactIdentity = await ensureContactIdentity({
    email,
    phone: input.phone ?? null,
    firstName: input.firstName ?? null,
    lastName: input.lastName ?? null,
    fullName: input.fullName ?? null,
    metadata: {
      source: "client_profile",
    },
  });
  if (existing) {
    if (!existing.contact_identity_id && contactIdentity) {
      const { error: linkError } = await supabaseAdmin
        .from("client_profiles")
        .update({
          contact_identity_id: contactIdentity.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (linkError) throw linkError;
    }
    return { status: "exists" as const, clientProfileId: existing.id };
  }

  const fullName =
    input.fullName ??
    ([input.firstName, input.lastName].filter(Boolean).join(" ").trim() || null);
  const { data, error } = await supabaseAdmin
    .from("client_profiles")
    .insert({
      email,
      phone: normalizePhone(input.phone) ?? null,
      first_name: input.firstName?.trim() || null,
      last_name: input.lastName?.trim() || null,
      full_name: fullName,
      contact_identity_id: contactIdentity?.id ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  const row = data as { id: string };
  return { status: "created" as const, clientProfileId: row.id };
};

export type ClientProfileRow = {
  id: string;
  email: string;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  auth_user_id: string | null;
  is_active: boolean;
  contact_identity_id: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

export const getClientById = async (id: string): Promise<ClientProfileRow | null> => {
  const { data, error } = await supabaseAdmin
    .from("client_profiles")
    .select("id, email, phone, first_name, last_name, full_name, auth_user_id, is_active, contact_identity_id, last_login_at, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as ClientProfileRow | null;
};

export const getClientByAuthUserId = async (
  authUserId: string
): Promise<ClientProfileRow | null> => {
  const { data, error } = await supabaseAdmin
    .from("client_profiles")
    .select("id, email, phone, first_name, last_name, full_name, auth_user_id, is_active, contact_identity_id, last_login_at, created_at, updated_at")
    .eq("auth_user_id", authUserId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return data as ClientProfileRow | null;
};

export const linkClientProfileToAuthUser = async (input: {
  clientProfileId: string;
  authUserId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
}) => {
  const email = normalizeEmail(input.email);
  if (!email) return null;
  const current = await getClientById(input.clientProfileId);
  if (!current || !current.is_active) {
    return null;
  }

  if (normalizeEmail(current.email) !== email) {
    return null;
  }

  if (current.auth_user_id && current.auth_user_id !== input.authUserId) {
    return null;
  }

  const existingLinkedProfile = await getClientByAuthUserId(input.authUserId);
  if (existingLinkedProfile && existingLinkedProfile.id !== input.clientProfileId) {
    return null;
  }

  const firstName = current.first_name ?? input.firstName ?? null;
  const lastName = current.last_name ?? input.lastName ?? null;
  const fallbackFullName =
    [firstName, lastName].filter(Boolean).join(" ").trim() || null;
  const fullName =
    current.full_name ?? input.fullName ?? fallbackFullName;
  const contactIdentity = await ensureContactIdentity({
    email,
    phone: current.phone,
    firstName,
    lastName,
    fullName,
    metadata: {
      source: "client_profile_auth_link",
      client_profile_id: current.id,
    },
  });

  const { data, error } = await supabaseAdmin
    .from("client_profiles")
    .update({
      auth_user_id: input.authUserId,
      contact_identity_id: contactIdentity?.id ?? current.contact_identity_id ?? null,
      email,
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      last_login_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", current.id)
    .select("id, email, phone, first_name, last_name, full_name, auth_user_id, is_active, contact_identity_id, last_login_at, created_at, updated_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Impossible de rattacher le compte client.");
  }

  return data as ClientProfileRow;
};

export const touchClientProfileLastLogin = async (clientProfileId: string) => {
  const { error } = await supabaseAdmin
    .from("client_profiles")
    .update({
      last_login_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", clientProfileId);

  if (error) throw error;
};

export const updateClientProfile = async (
  id: string,
  input: UpdateClientProfileInput
) => {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const current = await getClientById(id);
  if (!current) throw new Error("Client introuvable.");
  const nextEmail = input.email !== undefined ? normalizeEmail(input.email) : undefined;
  const nextPhone = input.phone !== undefined ? normalizePhone(input.phone) ?? null : undefined;
  const nextFirstName = input.firstName !== undefined ? input.firstName?.trim() || null : undefined;
  const nextLastName = input.lastName !== undefined ? input.lastName?.trim() || null : undefined;
  const computedFullName =
    input.fullName !== undefined
      ? input.fullName?.trim() || null
      : input.firstName !== undefined || input.lastName !== undefined
        ? [nextFirstName ?? "", nextLastName ?? ""].filter(Boolean).join(" ").trim() || null
        : undefined;
  const contactIdentity = await ensureContactIdentity({
    email: nextEmail ?? current.email,
    phone: nextPhone ?? current.phone,
    firstName: nextFirstName ?? current.first_name,
    lastName: nextLastName ?? current.last_name,
    fullName: computedFullName ?? current.full_name,
    metadata: {
      source: "client_profile_update",
      client_profile_id: id,
    },
  });

  if (nextEmail !== undefined) updates.email = nextEmail;
  if (nextPhone !== undefined) updates.phone = nextPhone;
  if (nextFirstName !== undefined) updates.first_name = nextFirstName;
  if (nextLastName !== undefined) updates.last_name = nextLastName;
  if (computedFullName !== undefined) updates.full_name = computedFullName;
  if (contactIdentity) updates.contact_identity_id = contactIdentity.id;

  const { error } = await supabaseAdmin
    .from("client_profiles")
    .update(updates)
    .eq("id", id);
  if (error) throw error;
};

export const listClients = async (params?: {
  search?: string;
  status?: "all" | "account_active" | "invite_pending" | "prospect";
  assignedAdminId?: string;
  limit?: number;
  offset?: number;
}) => {
  let query = supabaseAdmin
    .from("client_profiles")
    .select(
      "id, email, phone, first_name, last_name, full_name, auth_user_id, is_active, last_login_at, created_at"
    )
    .eq("is_active", true);

  if (params?.search?.trim()) {
    const term = `%${params.search.trim()}%`;
    query = query.or(
      `email.ilike.${term},full_name.ilike.${term},phone.ilike.${term}`
    );
  }

  query = query.order("created_at", { ascending: false });
  const limit = params?.limit ?? 50;
  const offset = params?.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data: profiles, error } = await query;
  if (error) throw error;

  const ids = (profiles ?? []).map((p) => p.id);
  if (ids.length === 0) return { items: [], total: 0 };

  const { data: projectCounts } = await supabaseAdmin
    .from("client_projects")
    .select("client_profile_id")
    .eq("project_type", "seller")
    .in("client_profile_id", ids);

  const countByClient = (projectCounts ?? []).reduce(
    (acc, r) => {
      acc[r.client_profile_id] = (acc[r.client_profile_id] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const { data: invitations } = await supabaseAdmin
    .from("client_project_invitations")
    .select("client_profile_id, accepted_at")
    .in("client_profile_id", ids);

  const hasAcceptedByClient = (invitations ?? []).reduce(
    (acc, r) => {
      if (r.accepted_at) acc[r.client_profile_id] = true;
      return acc;
    },
    {} as Record<string, boolean>
  );

  const items: ClientProfileListItem[] = (profiles ?? []).map((p) => ({
    id: p.id,
    email: p.email,
    phone: p.phone,
    firstName: p.first_name,
    lastName: p.last_name,
    fullName: p.full_name,
    authUserId: p.auth_user_id,
    isActive: p.is_active,
    lastLoginAt: p.last_login_at,
    createdAt: p.created_at,
    sellerProjectCount: countByClient[p.id] ?? 0,
    hasAcceptedInvitation: hasAcceptedByClient[p.id] ?? false,
  }));
  const filteredItems = items.filter((item) => {
    if (params?.status && params.status !== "all") {
      const status =
        item.authUserId || item.hasAcceptedInvitation ? "account_active" : "prospect";
      if (status !== params.status) return false;
    }
    return true;
  });

  return { items: filteredItems, total: filteredItems.length };
};

export const searchClients = async (q: string, limit = 10) => {
  const term = q.trim();
  if (!term) return [];
  const { data, error } = await supabaseAdmin
    .from("client_profiles")
    .select("id, email, phone, first_name, last_name, full_name")
    .eq("is_active", true)
    .or(`email.ilike.%${term}%,full_name.ilike.%${term}%,phone.ilike.%${term}%`)
    .limit(limit);
  if (error) throw error;
  return data ?? [];
};
