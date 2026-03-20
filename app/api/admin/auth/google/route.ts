import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const getSafeNextPath = (value: string | null) => {
  if (!value || !value.startsWith("/")) {
    return "/admin";
  }

  return value;
};

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const nextPath = getSafeNextPath(requestUrl.searchParams.get("next"));
  const redirectTo = new URL("/auth/callback", requestUrl.origin);
  redirectTo.searchParams.set("next", nextPath);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectTo.toString(),
    },
  });

  if (error || !data.url) {
    const loginUrl = new URL("/admin/login", requestUrl.origin);
    loginUrl.searchParams.set("error", "oauth_start_failed");
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.redirect(data.url);
}
