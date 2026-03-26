import { NextResponse } from "next/server";
import { TimeoutError, withTimeout } from "@/lib/async/timeout";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { linkAdminProfileToAuthUser } from "@/services/admin/admin-user.service";

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
  const redirectToLogin = (error: string) => {
    const loginUrl = new URL("/admin/login", requestUrl.origin);
    loginUrl.searchParams.set("error", error);
    return NextResponse.redirect(loginUrl);
  };

  if (!code) {
    return redirectToLogin("missing_code");
  }

  try {
    const supabase = await createSupabaseServerClient();
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
      return NextResponse.redirect(new URL("/admin/forbidden", requestUrl.origin));
    }

    return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
  } catch (error) {
    if (error instanceof TimeoutError) {
      return redirectToLogin("oauth_callback_timeout");
    }

    return redirectToLogin("oauth_exchange_failed");
  }
}
