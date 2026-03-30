import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { TimeoutError, withTimeout } from "@/lib/async/timeout";
import { publicEnv } from "@/lib/env/public";
import { linkAdminProfileToAuthUser } from "@/services/admin/admin-user.service";
import type { Database } from "@/types/db/supabase";

const getSafeNextPath = (value: string | null) => {
  if (!value || !value.startsWith("/")) {
    return "/admin";
  }

  return value;
};

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const nextPath = getSafeNextPath(requestUrl.searchParams.get("next"));
  const code = requestUrl.searchParams.get("code");
  const cookieStore = await cookies();
  const responseCookies: Array<{
    name: string;
    value: string;
    options: Parameters<NextResponse["cookies"]["set"]>[2];
  }> = [];
  const redirectToLogin = (error: string) => {
    const loginUrl = new URL("/admin/login", requestUrl.origin);
    loginUrl.searchParams.set("error", error);
    const response = NextResponse.redirect(loginUrl);
    responseCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });
    return response;
  };
  const buildSupabaseClient = (): SupabaseClient<Database> =>
    createServerClient<Database>(
      publicEnv.NEXT_PUBLIC_SUPABASE_URL,
      publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            responseCookies.splice(0, responseCookies.length, ...cookiesToSet);
          },
        },
      }
    );

  if (!code) {
    return redirectToLogin("missing_code");
  }

  try {
    const supabase = buildSupabaseClient();
    const { error: exchangeError } = await withTimeout(
      supabase.auth.exchangeCodeForSession(code),
      5000,
      "Le retour Google prend trop de temps."
    );

    if (exchangeError) {
      return redirectToLogin("oauth_exchange_failed");
    }

    const {
      data: { user },
    } = await withTimeout(
      supabase.auth.getUser(),
      5000,
      "La lecture du compte Google prend trop de temps."
    );

    if (!user?.email) {
      await supabase.auth.signOut();
      return redirectToLogin("missing_user");
    }

    const profile = await withTimeout(
      linkAdminProfileToAuthUser({
        authUserId: user.id,
        email: user.email,
        firstName: typeof user.user_metadata.first_name === "string" ? user.user_metadata.first_name : null,
        lastName: typeof user.user_metadata.last_name === "string" ? user.user_metadata.last_name : null,
        fullName: typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : null,
      }),
      5000,
      "Le rattachement du profil admin prend trop de temps."
    );

    if (!profile) {
      await supabase.auth.signOut();
      const response = NextResponse.redirect(new URL("/admin/forbidden", requestUrl.origin));
      responseCookies.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options);
      });
      return response;
    }

    const response = NextResponse.redirect(new URL(nextPath, requestUrl.origin));
    responseCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });
    return response;
  } catch (error) {
    if (error instanceof TimeoutError) {
      return redirectToLogin("oauth_callback_timeout");
    }

    return redirectToLogin("oauth_exchange_failed");
  }
}
