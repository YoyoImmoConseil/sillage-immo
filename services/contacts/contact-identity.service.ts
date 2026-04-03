import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

export type ContactIdentityRow = {
  id: string;
  email: string | null;
  normalized_email: string | null;
  phone: string | null;
  normalized_phone: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  metadata: Record<string, unknown>;
};

export const normalizeEmail = (email?: string | null) => {
  const normalized = email?.trim().toLowerCase() ?? "";
  return normalized.length > 0 ? normalized : null;
};

export const normalizePhone = (phone?: string | null) => {
  const digits = (phone ?? "").replace(/[^\d+]/g, "").trim();
  return digits.length > 0 ? digits : null;
};

export const splitFullName = (fullName?: string | null) => {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? null,
    lastName: parts.slice(1).join(" ") || null,
  };
};

const mergeMetadata = (
  current: Record<string, unknown>,
  next?: Record<string, unknown>
) => {
  return {
    ...current,
    ...(next ?? {}),
  };
};

export const ensureContactIdentity = async (input: {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  metadata?: Record<string, unknown>;
}) => {
  const normalizedEmail = normalizeEmail(input.email);
  const normalizedPhone = normalizePhone(input.phone);
  const firstName = input.firstName?.trim() || null;
  const lastName = input.lastName?.trim() || null;
  const fallbackFullName = [firstName, lastName].filter(Boolean).join(" ").trim() || null;
  const fullName = input.fullName?.trim() || fallbackFullName;

  if (!normalizedEmail && !normalizedPhone) {
    return null;
  }

  let existing: ContactIdentityRow | null = null;

  if (normalizedEmail) {
    const { data, error } = await supabaseAdmin
      .from("contact_identities")
      .select(
        "id, email, normalized_email, phone, normalized_phone, first_name, last_name, full_name, metadata"
      )
      .eq("normalized_email", normalizedEmail)
      .maybeSingle();
    if (error) throw error;
    existing = (data as ContactIdentityRow | null) ?? null;
  }

  if (!existing && normalizedPhone) {
    const { data, error } = await supabaseAdmin
      .from("contact_identities")
      .select(
        "id, email, normalized_email, phone, normalized_phone, first_name, last_name, full_name, metadata"
      )
      .eq("normalized_phone", normalizedPhone)
      .maybeSingle();
    if (error) throw error;
    existing = (data as ContactIdentityRow | null) ?? null;
  }

  const payload = {
    email: normalizedEmail,
    normalized_email: normalizedEmail,
    phone: normalizedPhone,
    normalized_phone: normalizedPhone,
    first_name: firstName,
    last_name: lastName,
    full_name: fullName,
  };

  if (!existing) {
    const { data, error } = await supabaseAdmin
      .from("contact_identities")
      .insert({
        ...payload,
        metadata: input.metadata ?? {},
      })
      .select(
        "id, email, normalized_email, phone, normalized_phone, first_name, last_name, full_name, metadata"
      )
      .single();
    if (error) throw error;
    return data as ContactIdentityRow;
  }

  const { data, error } = await supabaseAdmin
    .from("contact_identities")
    .update({
      email: existing.email ?? normalizedEmail,
      normalized_email: existing.normalized_email ?? normalizedEmail,
      phone: existing.phone ?? normalizedPhone,
      normalized_phone: existing.normalized_phone ?? normalizedPhone,
      first_name: existing.first_name ?? firstName,
      last_name: existing.last_name ?? lastName,
      full_name: existing.full_name ?? fullName,
      metadata: mergeMetadata(existing.metadata ?? {}, input.metadata),
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id)
    .select(
      "id, email, normalized_email, phone, normalized_phone, first_name, last_name, full_name, metadata"
    )
    .single();

  if (error) throw error;
  return data as ContactIdentityRow;
};
