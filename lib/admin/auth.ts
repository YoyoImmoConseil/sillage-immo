import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { ADMIN_ACCESS_TOKEN_COOKIE } from "@/lib/admin/session";
import { serverEnv } from "@/lib/env/server";
import { parseAdminProfileMetadata } from "@/services/admin/admin-profile-metadata";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { linkAdminProfileToAuthUser } from "@/services/admin/admin-user.service";
import type { AdminPermission, AdminProfileSnapshot, AdminRole } from "@/types/domain/admin";
import { ADMIN_ROLE_PERMISSIONS } from "@/types/domain/admin";

const hasExpectedValue = (value: string | null, expected: string) => {
  return Boolean(value && expected && value === expected);
};

const parseBearer = (authHeader: string | null) => {
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(" ");
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") return null;
  return token.trim();
};

export const isAdminHeaders = (input: Pick<Headers, "get">) => {
  return hasExpectedValue(input.get("x-admin-key"), serverEnv.ADMIN_API_KEY);
};

type AdminContext = {
  mode: "secret" | "session";
  role: AdminRole;
  profile: AdminProfileSnapshot | null;
  permissions: AdminPermission[];
};

const buildContext = (
  mode: AdminContext["mode"],
  role: AdminRole,
  profile: AdminProfileSnapshot | null
): AdminContext => ({
  mode,
  role,
  profile,
  permissions: ADMIN_ROLE_PERMISSIONS[role],
});

const getAdminContextByUser = async (user: User): Promise<AdminContext | null> => {
  const { data: profileData, error: profileError } = await supabaseAdmin
    .from("admin_profiles")
    .select("id, auth_user_id, email, first_name, last_name, full_name, is_active, metadata")
    .eq("email", user.email?.trim().toLowerCase() ?? "")
    .maybeSingle();

  if (profileError || !profileData || !profileData.is_active || !user.email) {
    return null;
  }

  if (profileData.auth_user_id && profileData.auth_user_id !== user.id) {
    return null;
  }

  const metadata = parseAdminProfileMetadata(profileData.metadata);

  const linkedProfile =
    profileData.auth_user_id === user.id
      ? {
          id: profileData.id,
          authUserId: profileData.auth_user_id,
          email: profileData.email,
          firstName: profileData.first_name,
          lastName: profileData.last_name,
          fullName: profileData.full_name,
          isActive: profileData.is_active,
          title: metadata.title,
          phone: metadata.phone,
          bio: metadata.bio,
          avatarUrl: metadata.avatarUrl,
          bookingUrl: metadata.bookingUrl,
        }
      : await linkAdminProfileToAuthUser({
          authUserId: user.id,
          email: user.email,
          firstName: typeof user.user_metadata.first_name === "string" ? user.user_metadata.first_name : null,
          lastName: typeof user.user_metadata.last_name === "string" ? user.user_metadata.last_name : null,
          fullName: typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : null,
        });

  if (!linkedProfile?.isActive) {
    return null;
  }

  const { data: roleData, error: roleError } = await supabaseAdmin
    .from("admin_role_assignments")
    .select("role, is_active")
    .eq("admin_profile_id", linkedProfile.id)
    .maybeSingle();

  if (roleError || !roleData?.is_active) {
    return null;
  }

  const role = roleData.role as AdminRole;
  const profile: AdminProfileSnapshot = {
    ...linkedProfile,
    role,
  };

  return buildContext("session", role, profile);
};

export const getAdminRequestContext = async (request: Request): Promise<AdminContext | null> => {
  if (isAdminHeaders(request.headers)) {
    return buildContext("secret", "administrateur", null);
  }

  const accessToken = request.headers.get("cookie")?.match(
    new RegExp(`(?:^|; )${ADMIN_ACCESS_TOKEN_COOKIE}=([^;]+)`)
  )?.[1];

  if (accessToken) {
    const {
      data: { user },
    } = await supabaseAdmin.auth.getUser(decodeURIComponent(accessToken));

    if (user) {
      return getAdminContextByUser(user);
    }
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;
  return getAdminContextByUser(user);
};

export const getAdminPageContext = async (): Promise<AdminContext | null> => {
  const requestHeaders = await headers();
  if (isAdminHeaders(requestHeaders)) {
    return buildContext("secret", "administrateur", null);
  }

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;

  if (accessToken) {
    const {
      data: { user },
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (user) {
      return getAdminContextByUser(user);
    }
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;
  return getAdminContextByUser(user);
};

export const hasAdminPermission = (context: AdminContext, permission: AdminPermission) => {
  return context.permissions.includes(permission);
};

export const isAdminRequest = async (request: Request) => {
  return (await getAdminRequestContext(request)) !== null;
};

export const isAdminPageRequest = async () => {
  return (await getAdminPageContext()) !== null;
};

export const requireAdminPagePermission = async (permission?: AdminPermission) => {
  const context = await getAdminPageContext();
  if (!context) {
    redirect("/admin/login");
  }

  if (permission && !hasAdminPermission(context, permission)) {
    redirect("/admin/forbidden");
  }

  return context;
};

export const isInternalRequest = async (request: Request) => {
  if (await isAdminRequest(request)) return true;

  const internalSecret = serverEnv.DOMAIN_EVENTS_CRON_SECRET;
  if (!internalSecret) return false;

  return (
    hasExpectedValue(request.headers.get("x-internal-key"), internalSecret) ||
    hasExpectedValue(request.headers.get("x-cron-secret"), internalSecret) ||
    hasExpectedValue(parseBearer(request.headers.get("authorization")), internalSecret)
  );
};
