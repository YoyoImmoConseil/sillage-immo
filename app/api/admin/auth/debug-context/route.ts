import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { withTimeout, TimeoutError } from "@/lib/async/timeout";
import { ADMIN_ACCESS_TOKEN_COOKIE } from "@/lib/admin/session";
import { supabaseAdmin } from "@/lib/supabase/admin";

const formatError = (error: unknown) => {
  if (error instanceof TimeoutError) return error.message;
  if (error instanceof Error) return error.message;
  return "unknown_error";
};

const inspectAdminUser = async (email: string | null | undefined, userId: string | null | undefined) => {
  if (!email) {
    return {
      profileFound: false,
      roleFound: false,
      isActive: false,
      authUserLinked: false,
      profileDurationMs: 0,
      roleDurationMs: 0,
      error: "missing_email",
    };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const profileStartedAt = Date.now();
  const { data: profileData, error: profileError } = await supabaseAdmin
    .from("admin_profiles")
    .select("id, auth_user_id, is_active")
    .eq("email", normalizedEmail)
    .maybeSingle();
  const profileDurationMs = Date.now() - profileStartedAt;

  if (profileError || !profileData) {
    return {
      profileFound: false,
      roleFound: false,
      isActive: false,
      authUserLinked: false,
      profileDurationMs,
      roleDurationMs: 0,
      error: profileError?.message ?? null,
    };
  }

  const roleStartedAt = Date.now();
  const { data: roleData, error: roleError } = await supabaseAdmin
    .from("admin_role_assignments")
    .select("role, is_active")
    .eq("admin_profile_id", profileData.id)
    .maybeSingle();
  const roleDurationMs = Date.now() - roleStartedAt;

  return {
    profileFound: true,
    roleFound: Boolean(roleData?.is_active),
    isActive: Boolean(profileData.is_active),
    authUserLinked: Boolean(profileData.auth_user_id && userId && profileData.auth_user_id === userId),
    profileDurationMs,
    roleDurationMs,
    error: roleError?.message ?? null,
  };
};

export async function GET(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  const cookieNames = request.cookies.getAll().map((cookie) => cookie.name);
  const adminAccessToken = request.cookies.get(ADMIN_ACCESS_TOKEN_COOKIE)?.value ?? null;

  const diagnostics: Record<string, unknown> = {
    adminCookiePresent: Boolean(adminAccessToken),
    supabaseCookieNames: cookieNames.filter((name) => name.startsWith("sb-")),
  };

  try {
    if (adminAccessToken) {
      const startedAt = Date.now();
      const {
        data: { user },
      } = await withTimeout(
        supabaseAdmin.auth.getUser(adminAccessToken),
        3500,
        "admin_cookie_user_timeout"
      );
      diagnostics.adminCookieCheck = {
        durationMs: Date.now() - startedAt,
        userFound: Boolean(user),
        profileInspection: await inspectAdminUser(user?.email, user?.id),
      };
    } else {
      diagnostics.adminCookieCheck = {
        skipped: true,
      };
    }
  } catch (error) {
    diagnostics.adminCookieCheck = {
      error: formatError(error),
    };
  }

  try {
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const startedAt = Date.now();
    const {
      data: { user },
    } = await withTimeout(supabase.auth.getUser(), 3500, "supabase_session_user_timeout");
    diagnostics.supabaseSessionCheck = {
      durationMs: Date.now() - startedAt,
      userFound: Boolean(user),
      profileInspection: await inspectAdminUser(user?.email, user?.id),
    };
  } catch (error) {
    diagnostics.supabaseSessionCheck = {
      error: formatError(error),
    };
  }

  return NextResponse.json({
    ok: true,
    diagnostics,
  });
}
