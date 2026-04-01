import { NextRequest, NextResponse } from "next/server";
import { withTimeout } from "@/lib/async/timeout";
import { ADMIN_ACCESS_TOKEN_COOKIE } from "@/lib/admin/session";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Body = {
  accessToken?: string;
};

export async function POST(request: NextRequest) {
  let body: Body = {};

  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, message: "Payload JSON invalide." }, { status: 400 });
  }

  if (!body.accessToken) {
    return NextResponse.json({ ok: false, message: "Token de session manquant." }, { status: 400 });
  }

  const {
    data: { user },
    error,
  } = await withTimeout(
    supabaseAdmin.auth.getUser(body.accessToken),
    5000,
    "La validation du token admin a expire."
  );

  if (error || !user?.email) {
    return NextResponse.json(
      { ok: false, message: error?.message ?? "Token admin invalide." },
      { status: 400 }
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_ACCESS_TOKEN_COOKIE, body.accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  return response;
}
