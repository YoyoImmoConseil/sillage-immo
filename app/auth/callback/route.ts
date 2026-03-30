import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { TimeoutError, withTimeout } from "@/lib/async/timeout";
import { publicEnv } from "@/lib/env/public";
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
