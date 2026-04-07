import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { parseAdminProfileMetadata } from "@/services/admin/admin-profile-metadata";
import { ADMIN_ROLE_LABELS, type AdminRole, type AdminTeamTitle } from "@/types/domain/admin";

type TeamMemberRow = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  is_active: boolean;
  metadata: Record<string, unknown> | null;
};

type TeamRoleRow = {
  admin_profile_id: string;
  role: string;
  is_active: boolean;
};

export type PublicTeamMember = {
  id: string;
  fullName: string;
  role: AdminRole;
  roleLabel: string;
  title: AdminTeamTitle | null;
  email: string;
  phone: string | null;
  bio: string | null;
  avatarUrl: string | null;
};

const ROLE_ORDER: AdminRole[] = ["administrateur", "manager", "collaborateur"];

const mapPublicTeamMember = (
  row: TeamMemberRow,
  roleByProfileId: Map<string, TeamRoleRow>
): PublicTeamMember => {
  const metadata = parseAdminProfileMetadata(row.metadata);
  const role = (roleByProfileId.get(row.id)?.role as AdminRole | undefined) ?? "collaborateur";
  const fullName =
    row.full_name?.trim() ||
    [row.first_name?.trim() ?? "", row.last_name?.trim() ?? ""].filter(Boolean).join(" ");

  return {
    id: row.id,
    fullName: fullName || row.email,
    role,
    roleLabel: ADMIN_ROLE_LABELS[role],
    title: metadata.title,
    email: row.email,
    phone: metadata.phone,
    bio: metadata.bio,
    avatarUrl: metadata.avatarUrl,
  };
};

export const listPublicTeamMembers = async (): Promise<PublicTeamMember[]> => {
  const [{ data: profiles, error: profilesError }, { data: roles, error: rolesError }] =
    await Promise.all([
      supabaseAdmin
        .from("admin_profiles")
        .select("id, email, first_name, last_name, full_name, is_active, metadata")
        .eq("is_active", true),
      supabaseAdmin
        .from("admin_role_assignments")
        .select("admin_profile_id, role, is_active")
        .eq("is_active", true),
    ]);

  if (profilesError) {
    throw new Error(profilesError.message);
  }
  if (rolesError) {
    throw new Error(rolesError.message);
  }

  const roleByProfileId = new Map(
    ((roles ?? []) as TeamRoleRow[]).map((role) => [role.admin_profile_id, role])
  );

  return ((profiles ?? []) as TeamMemberRow[])
    .filter((row) => roleByProfileId.has(row.id))
    .map((row) => mapPublicTeamMember(row, roleByProfileId))
    .sort((left, right) => ROLE_ORDER.indexOf(left.role) - ROLE_ORDER.indexOf(right.role));
};

export const getPublicTeamMemberByEmail = async (
  email: string
): Promise<PublicTeamMember | null> => {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;

  const [{ data: profile, error: profileError }, { data: role, error: roleError }] = await Promise.all([
    supabaseAdmin
      .from("admin_profiles")
      .select("id, email, first_name, last_name, full_name, is_active, metadata")
      .eq("email", normalizedEmail)
      .eq("is_active", true)
      .maybeSingle(),
    supabaseAdmin
      .from("admin_role_assignments")
      .select("admin_profile_id, role, is_active")
      .eq("is_active", true),
  ]);

  if (profileError) {
    throw new Error(profileError.message);
  }
  if (roleError) {
    throw new Error(roleError.message);
  }
  if (!profile) {
    return null;
  }

  const roleByProfileId = new Map(((role ?? []) as TeamRoleRow[]).map((item) => [item.admin_profile_id, item]));
  if (!roleByProfileId.has(profile.id)) {
    return null;
  }

  return mapPublicTeamMember(profile as TeamMemberRow, roleByProfileId);
};
