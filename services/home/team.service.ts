import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";

import type { AppLocale } from "@/lib/i18n/config";
import { resolveLocalizedText } from "@/lib/i18n/localized-content";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { CACHE_TAG_TEAM_PUBLIC, DEPLOYMENT_CACHE_KEY } from "@/lib/cache/tags";
import { normalizeCardSlug, slugifyFirstName } from "@/lib/team/card";
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
  firstName: string;
  lastName: string;
  role: AdminRole;
  roleLabel: string;
  title: AdminTeamTitle | null;
  email: string;
  phone: string | null;
  bio: string | null;
  avatarUrl: string | null;
  bookingUrl: string | null;
  /** Carte de visite virtuelle : slug choisi dans l'admin, sinon dérivé du prénom. */
  cardSlug: string | null;
  whatsappPhone: string | null;
  cardEnabled: boolean;
};

const ROLE_ORDER: AdminRole[] = ["administrateur", "manager", "collaborateur"];

const sanitizeBookingUrl = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed;
};

const mapPublicTeamMember = (
  row: TeamMemberRow,
  roleByProfileId: Map<string, TeamRoleRow>,
  locale: AppLocale
): PublicTeamMember => {
  const metadata = parseAdminProfileMetadata(row.metadata);
  const role = (roleByProfileId.get(row.id)?.role as AdminRole | undefined) ?? "collaborateur";
  const firstName = row.first_name?.trim() ?? "";
  const lastName = row.last_name?.trim() ?? "";
  const fullName = row.full_name?.trim() || [firstName, lastName].filter(Boolean).join(" ");

  return {
    id: row.id,
    fullName: fullName || row.email,
    firstName,
    lastName,
    role,
    roleLabel: ADMIN_ROLE_LABELS[role],
    title: metadata.title,
    email: row.email,
    phone: metadata.phone,
    bio: resolveLocalizedText({
      locale,
      field: "bio",
      fallback: metadata.bio,
      sources: [row.metadata],
    }),
    avatarUrl: metadata.avatarUrl,
    bookingUrl: sanitizeBookingUrl(metadata.bookingUrl),
    cardSlug: normalizeCardSlug(metadata.cardSlug) ?? slugifyFirstName(firstName),
    whatsappPhone: metadata.whatsappPhone,
    cardEnabled: metadata.cardEnabled,
  };
};

const listPublicTeamMembersUncached = async (
  locale: AppLocale = "fr"
): Promise<PublicTeamMember[]> => {
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("admin_profiles")
      .select("id, email, first_name, last_name, full_name, is_active, metadata")
      .eq("is_active", true);

    if (profilesError) {
      throw new Error(profilesError.message);
    }
    const profileRows = (profiles ?? []) as TeamMemberRow[];
    if (profileRows.length === 0) return [];

    // Fetch role assignments only for the profiles we already hold, instead
    // of the whole admin_role_assignments table.
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from("admin_role_assignments")
      .select("admin_profile_id, role, is_active")
      .eq("is_active", true)
      .in(
        "admin_profile_id",
        profileRows.map((row) => row.id)
      );

    if (rolesError) {
      throw new Error(rolesError.message);
    }

    const roleByProfileId = new Map(
      ((roles ?? []) as TeamRoleRow[]).map((role) => [role.admin_profile_id, role])
    );

    return profileRows
      .filter(
        (row) =>
          roleByProfileId.has(row.id) &&
          parseAdminProfileMetadata(row.metadata).showOnSite
      )
      .map((row) => mapPublicTeamMember(row, roleByProfileId, locale))
      .sort((left, right) => ROLE_ORDER.indexOf(left.role) - ROLE_ORDER.indexOf(right.role));
};

export const listPublicTeamMembers = unstable_cache(
  listPublicTeamMembersUncached,
  ["listPublicTeamMembers", DEPLOYMENT_CACHE_KEY],
  {
    tags: [CACHE_TAG_TEAM_PUBLIC],
    revalidate: 600,
  }
);

const getPublicTeamMemberByEmailUncached = async (
  email: string,
  locale: AppLocale = "fr"
): Promise<PublicTeamMember | null> => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return null;

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("admin_profiles")
      .select("id, email, first_name, last_name, full_name, is_active, metadata")
      .eq("email", normalizedEmail)
      .eq("is_active", true)
      .maybeSingle();

    if (profileError) {
      throw new Error(profileError.message);
    }
    if (!profile) {
      return null;
    }

    // Previously loaded the entire admin_role_assignments table on every
    // listing page. Now scoped to the specific profile we just resolved.
    const { data: role, error: roleError } = await supabaseAdmin
      .from("admin_role_assignments")
      .select("admin_profile_id, role, is_active")
      .eq("is_active", true)
      .eq("admin_profile_id", profile.id)
      .maybeSingle();

    if (roleError) {
      throw new Error(roleError.message);
    }
    if (!role) {
      return null;
    }
    if (!parseAdminProfileMetadata((profile as TeamMemberRow).metadata).showOnSite) {
      return null;
    }

  const roleByProfileId = new Map<string, TeamRoleRow>();
  roleByProfileId.set((role as TeamRoleRow).admin_profile_id, role as TeamRoleRow);
  return mapPublicTeamMember(profile as TeamMemberRow, roleByProfileId, locale);
};

export const getPublicTeamMemberByEmail = cache(
  async (email: string, locale: AppLocale = "fr") => {
    const cached = unstable_cache(
      getPublicTeamMemberByEmailUncached,
      ["getPublicTeamMemberByEmail", DEPLOYMENT_CACHE_KEY],
      {
        tags: [CACHE_TAG_TEAM_PUBLIC],
        revalidate: 600,
      }
    );
    return cached(email, locale);
  }
);
