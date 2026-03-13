import { NextResponse } from "next/server";
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

  if (!code) {
    return NextResponse.redirect(new URL("/admin/login?error=missing_code", requestUrl.origin));
  }

  const supabase = await createSupabaseServerClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return NextResponse.redirect(new URL("/admin/login?error=oauth_exchange_failed", requestUrl.origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/admin/login?error=missing_user", requestUrl.origin));
  }

  const profile = await linkAdminProfileToAuthUser({
    authUserId: user.id,
    email: user.email,
    firstName: typeof user.user_metadata.first_name === "string" ? user.user_metadata.first_name : null,
    lastName: typeof user.user_metadata.last_name === "string" ? user.user_metadata.last_name : null,
    fullName: typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : null,
  });

  if (!profile) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/admin/forbidden", requestUrl.origin));
  }

  return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
}
