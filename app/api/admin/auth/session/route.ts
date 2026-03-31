import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/db/supabase";
import { publicEnv } from "@/lib/env/public";

type Body = {
  accessToken?: string;
  refreshToken?: string;
};

export async function POST(request: NextRequest) {
  let body: Body = {};

  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, message: "Payload JSON invalide." }, { status: 400 });
  }

  if (!body.accessToken || !body.refreshToken) {
    return NextResponse.json({ ok: false, message: "Tokens de session manquants." }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  const supabase = createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.setSession({
    access_token: body.accessToken,
    refresh_token: body.refreshToken,
  });

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 400 });
  }

  return response;
}
