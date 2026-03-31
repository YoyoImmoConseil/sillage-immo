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

  // #region agent log
  fetch("http://127.0.0.1:7695/ingest/34db18ce-fe4a-4a99-91a2-c9c0aaded505", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "cada68" },
    body: JSON.stringify({
      sessionId: "cada68",
      runId: request.headers.get("x-vercel-id") ?? `admin-session-${Date.now()}`,
      hypothesisId: "H1",
      location: "app/api/admin/auth/session/route.ts:POST",
      message: "Received request to create dedicated admin cookie",
      data: {
        hasAccessToken: Boolean(body.accessToken),
        hasCookieHeader: Boolean(request.headers.get("cookie")),
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

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

  // #region agent log
  fetch("http://127.0.0.1:7695/ingest/34db18ce-fe4a-4a99-91a2-c9c0aaded505", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "cada68" },
    body: JSON.stringify({
      sessionId: "cada68",
      runId: request.headers.get("x-vercel-id") ?? `admin-session-${Date.now()}`,
      hypothesisId: "H5",
      location: "app/api/admin/auth/session/route.ts:POST",
      message: "Dedicated admin cookie prepared on response",
      data: {
        hasValidatedUser: Boolean(user?.id),
        cookieName: ADMIN_ACCESS_TOKEN_COOKIE,
        secure: true,
        sameSite: "lax",
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  return response;
}
