import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  buildAdminProfileMetadata,
  countWords,
  parseAdminProfileMetadata,
} from "@/services/admin/admin-profile-metadata";
import { ADMIN_TEAM_TITLES, type AdminProfileSnapshot, type AdminRole, type AdminTeamTitle } from "@/types/domain/admin";

type AdminProfileRow = {
  id: string;
  auth_user_id: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  is_active: boolean;
  metadata: Record<string, unknown> | null;
};

type AdminRoleRow = {
  admin_profile_id: string;
  role: string;
  is_active: boolean;
};

export type AdminUserListItem = {
  id: string;
  authUserId: string | null;
  email: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  isActive: boolean;
  role: AdminRole;
  title: AdminTeamTitle | null;
  phone: string | null;
  bio: string | null;
  avatarUrl: string | null;
};

const buildFullName = (firstName?: string | null, lastName?: string | null) => {
  return [firstName?.trim() ?? "", lastName?.trim() ?? ""].filter(Boolean).join(" ").trim() || null;
};

const countActiveAdministrators = async () => {
  const { data: activeProfiles, error: profilesError } = await supabaseAdmin
    .from("admin_profiles")
    .select("id")
    .eq("is_active", true);

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const profileIds = (activeProfiles ?? []).map((profile) => profile.id);
  if (profileIds.length === 0) {
    return 0;
  }

  const { count, error: rolesError } = await supabaseAdmin
    .from("admin_role_assignments")
    .select("admin_profile_id", { count: "exact", head: true })
    .eq("role", "administrateur")
    .eq("is_active", true)
    .in("admin_profile_id", profileIds);

  if (rolesError) {
    throw new Error(rolesError.message);
  }

  return count ?? 0;
};

const getAdminRoleStatus = async (profileId: string) => {
  const { data, error } = await supabaseAdmin
    .from("admin_role_assignments")
    .select("role, is_active")
    .eq("admin_profile_id", profileId)
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message ?? "Impossible de lire le role admin.");
  }

  return data as { role: string; is_active: boolean };
};

const auditAdminAction = async (
  action: string,
  entityType: string,
  entityId: string | null,
  actorProfileId: string | null,
  data: Record<string, unknown>
) => {
  await supabaseAdmin.from("audit_log").insert({
    actor_type: "admin",
    actor_id: actorProfileId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    data,
  });
};

export const getAdminUserCount = async () => {
  const { count, error } = await supabaseAdmin
    .from("admin_profiles")
    .select("id", { count: "exact", head: true });

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
};

export const listAdminUsers = async (): Promise<AdminUserListItem[]> => {
  const [{ data: profiles, error: profilesError }, { data: roles, error: rolesError }] =
    await Promise.all([
      supabaseAdmin
        .from("admin_profiles")
        .select("id, auth_user_id, email, first_name, last_name, full_name, is_active, metadata")
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("admin_role_assignments")
        .select("admin_profile_id, role, is_active"),
    ]);

  if (profilesError) {
    throw new Error(profilesError.message);
  }
  if (rolesError) {
    throw new Error(rolesError.message);
  }

  const roleByProfileId = new Map(
    ((roles ?? []) as AdminRoleRow[]).map((row) => [row.admin_profile_id, row])
  );

  return ((profiles ?? []) as AdminProfileRow[]).map((profile) => {
    const metadata = parseAdminProfileMetadata(profile.metadata);

    return {
      id: profile.id,
      authUserId: profile.auth_user_id,
      email: profile.email,
      firstName: profile.first_name,
      lastName: profile.last_name,
      fullName: profile.full_name,
      isActive: profile.is_active,
      role: (roleByProfileId.get(profile.id)?.role as AdminRole | undefined) ?? "collaborateur",
      title: metadata.title,
      phone: metadata.phone,
      bio: metadata.bio,
      avatarUrl: metadata.avatarUrl,
    };
  });
};

export const createAdminAuthorization = async (input: {
  email: string;
  firstName?: string;
  lastName?: string;
  role: AdminRole;
  authUserId?: string | null;
  actorProfileId?: string | null;
}) => {
  const email = input.email.trim().toLowerCase();
  const firstName = input.firstName?.trim() || null;
  const lastName = input.lastName?.trim() || null;
  const fullName = buildFullName(firstName, lastName);

  const { data: existingProfile } = await supabaseAdmin
    .from("admin_profiles")
    .select("id, auth_user_id, email, first_name, last_name, full_name, is_active, metadata")
    .eq("email", email)
    .maybeSingle();

  if (existingProfile?.auth_user_id && input.authUserId && existingProfile.auth_user_id !== input.authUserId) {
    throw new Error("Cet email admin est deja rattache a un autre compte Google.");
  }

  const metadata = buildAdminProfileMetadata(existingProfile?.metadata, {});

  const { data: profileData, error: profileError } = await supabaseAdmin
    .from("admin_profiles")
    .upsert(
      {
        id: existingProfile?.id,
        auth_user_id: existingProfile?.auth_user_id ?? input.authUserId ?? null,
        email,
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        is_active: true,
        metadata,
      },
      { onConflict: "email" }
    )
    .select("id, auth_user_id")
    .single();

  if (profileError || !profileData) {
    throw new Error(profileError?.message ?? "Impossible de creer le profil admin.");
  }

  const { error: roleError } = await supabaseAdmin.from("admin_role_assignments").upsert(
    {
      admin_profile_id: profileData.id,
      role: input.role,
      granted_by_profile_id: input.actorProfileId ?? null,
      is_active: true,
    },
    { onConflict: "admin_profile_id" }
  );

  if (roleError) {
    throw new Error(roleError.message);
  }

  await auditAdminAction(
    existingProfile ? "admin_user_updated" : "admin_user_created",
    "admin_profile",
    profileData.id,
    input.actorProfileId ?? null,
    { email, role: input.role, firstName, lastName, authUserId: profileData.auth_user_id }
  );

  return {
    profileId: profileData.id,
    authUserId: profileData.auth_user_id,
  };
};

export const linkAdminProfileToAuthUser = async (input: {
  authUserId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
}): Promise<AdminProfileSnapshot | null> => {
  const email = input.email.trim().toLowerCase();
  const { data: profileData, error: profileError } = await supabaseAdmin
    .from("admin_profiles")
    .select("id, auth_user_id, email, first_name, last_name, full_name, is_active, metadata")
    .eq("email", email)
    .maybeSingle();

  if (profileError || !profileData || !profileData.is_active) {
    return null;
  }

  if (profileData.auth_user_id && profileData.auth_user_id !== input.authUserId) {
    return null;
  }

  const firstName = profileData.first_name ?? input.firstName ?? null;
  const lastName = profileData.last_name ?? input.lastName ?? null;
  const fullName = profileData.full_name ?? input.fullName ?? buildFullName(firstName, lastName);

  const metadata = buildAdminProfileMetadata(profileData.metadata, {});

  const { data: updatedProfile, error: updateError } = await supabaseAdmin
    .from("admin_profiles")
    .update({
      auth_user_id: input.authUserId,
      email,
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      is_active: true,
      metadata,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileData.id)
    .select("id, auth_user_id, email, first_name, last_name, full_name, is_active")
    .single();

  if (updateError || !updatedProfile) {
    throw new Error(updateError?.message ?? "Impossible de rattacher le compte Google.");
  }

  const { data: roleData, error: roleError } = await supabaseAdmin
    .from("admin_role_assignments")
    .select("role, is_active")
    .eq("admin_profile_id", updatedProfile.id)
    .maybeSingle();

  if (roleError || !roleData?.is_active) {
    return null;
  }

  await auditAdminAction(
    "admin_google_account_linked",
    "admin_profile",
    updatedProfile.id,
    updatedProfile.id,
    { email, authUserId: input.authUserId }
  );

  return {
    id: updatedProfile.id,
    authUserId: updatedProfile.auth_user_id,
    email: updatedProfile.email,
    firstName: updatedProfile.first_name,
    lastName: updatedProfile.last_name,
    fullName: updatedProfile.full_name,
    isActive: updatedProfile.is_active,
    role: roleData.role as AdminRole,
    title: null,
    phone: null,
    bio: null,
    avatarUrl: null,
  };
};

export const getAdminUserById = async (profileId: string): Promise<AdminUserListItem | null> => {
  const users = await listAdminUsers();
  return users.find((user) => user.id === profileId) ?? null;
};

export const updateAdminRole = async (input: {
  profileId: string;
  role: AdminRole;
  actorProfileId: string;
}) => {
  const currentRole = await getAdminRoleStatus(input.profileId);

  if (input.actorProfileId && input.actorProfileId === input.profileId && input.role !== "administrateur") {
    throw new Error("Un administrateur ne peut pas se retirer son propre role.");
  }

  if (currentRole.role === "administrateur" && input.role !== "administrateur") {
    const activeAdministrators = await countActiveAdministrators();
    if (activeAdministrators <= 1) {
      throw new Error("Impossible de retrograder le dernier administrateur actif.");
    }
  }

  const { error } = await supabaseAdmin
    .from("admin_role_assignments")
    .update({
      role: input.role,
      updated_at: new Date().toISOString(),
      granted_by_profile_id: input.actorProfileId ?? null,
    })
    .eq("admin_profile_id", input.profileId);

  if (error) {
    throw new Error(error.message);
  }

  await auditAdminAction(
    "admin_role_updated",
    "admin_profile",
    input.profileId,
    input.actorProfileId ?? null,
    { role: input.role }
  );
};

export const updateAdminUserStatus = async (input: {
  profileId: string;
  isActive: boolean;
  actorProfileId: string;
}) => {
  if (input.actorProfileId && input.actorProfileId === input.profileId && !input.isActive) {
    throw new Error("Un administrateur ne peut pas suspendre son propre acces.");
  }

  const currentRole = await getAdminRoleStatus(input.profileId);
  if (currentRole.role === "administrateur" && !input.isActive) {
    const activeAdministrators = await countActiveAdministrators();
    if (activeAdministrators <= 1) {
      throw new Error("Impossible de suspendre le dernier administrateur actif.");
    }
  }

  const { data: profileData, error: profileError } = await supabaseAdmin
    .from("admin_profiles")
    .update({
      is_active: input.isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.profileId)
    .select("auth_user_id")
    .single();

  if (profileError || !profileData) {
    throw new Error(profileError?.message ?? "Impossible de mettre a jour le profil admin.");
  }

  if (profileData.auth_user_id) {
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(profileData.auth_user_id, {
      ban_duration: input.isActive ? "none" : "876000h",
    });

    if (authError) {
      throw new Error(authError.message);
    }
  }

  await auditAdminAction(
    "admin_user_status_updated",
    "admin_profile",
    input.profileId,
    input.actorProfileId ?? null,
    { isActive: input.isActive }
  );
};

export const updateAdminUserProfile = async (input: {
  profileId: string;
  actorProfileId: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  phone?: string;
  bio?: string;
  avatarUrl?: string | null;
}) => {
  const { data: currentProfile, error: currentProfileError } = await supabaseAdmin
    .from("admin_profiles")
    .select("id, first_name, last_name, metadata")
    .eq("id", input.profileId)
    .maybeSingle();

  if (currentProfileError || !currentProfile) {
    throw new Error(currentProfileError?.message ?? "Utilisateur introuvable.");
  }

  const currentMetadata = parseAdminProfileMetadata(currentProfile.metadata);
  const firstName =
    input.firstName === undefined ? currentProfile.first_name : input.firstName?.trim() || null;
  const lastName =
    input.lastName === undefined ? currentProfile.last_name : input.lastName?.trim() || null;
  const rawTitle = input.title === undefined ? currentMetadata.title : input.title?.trim() || null;
  const title =
    rawTitle === null ? null : ADMIN_TEAM_TITLES.includes(rawTitle as AdminTeamTitle) ? (rawTitle as AdminTeamTitle) : null;
  const phone = input.phone === undefined ? currentMetadata.phone : input.phone?.trim() || null;
  const bio = input.bio === undefined ? currentMetadata.bio : input.bio?.trim() || null;
  const fullName = buildFullName(firstName, lastName);

  if (rawTitle !== null && title === null) {
    throw new Error("Le titre selectionne est invalide.");
  }

  if (bio && countWords(bio) > 250) {
    throw new Error("La presentation est limitee a 250 mots.");
  }

  const metadata = buildAdminProfileMetadata(currentProfile.metadata, {
    title,
    phone,
    bio,
    avatarUrl: input.avatarUrl === undefined ? currentMetadata.avatarUrl : input.avatarUrl,
  });

  const { error: updateError } = await supabaseAdmin
    .from("admin_profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      metadata,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.profileId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  await auditAdminAction(
    "admin_user_profile_updated",
    "admin_profile",
    input.profileId,
    input.actorProfileId,
    {
      firstName,
      lastName,
      title,
      phone,
      bio,
      avatarUrl: input.avatarUrl === undefined ? undefined : input.avatarUrl,
    }
  );
};
