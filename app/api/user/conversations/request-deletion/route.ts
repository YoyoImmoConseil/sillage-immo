import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requestConversationDeletion } from "@/services/ai/conversations-deletion.service";
import {
  ANONYMOUS_SESSION_COOKIE_NAME,
  parseAnonymousSessionCookie,
} from "@/lib/ai/anonymous-session";

export const dynamic = "force-dynamic";

// POST /api/user/conversations/request-deletion
// Body: { email: string }
//
// Sends a 6-digit verification code to the supplied email if (and
// only if) the email is well-formed. We never disclose whether the
// address actually exists in our DB — the response is always
// "ok: true" — to prevent enumeration.

type Body = { email?: string };

export const POST = async (request: Request) => {
  let body: Body | null = null;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, code: "invalid_json", message: "Corps JSON invalide." },
      { status: 400 }
    );
  }

  const email = typeof body?.email === "string" ? body.email.trim() : "";
  if (!email) {
    return NextResponse.json(
      { ok: false, code: "missing_email", message: "Email requis." },
      { status: 422 }
    );
  }

  const cookieStore = await cookies();
  const sessionRaw = cookieStore.get(ANONYMOUS_SESSION_COOKIE_NAME)?.value;
  const session = await parseAnonymousSessionCookie(sessionRaw);

  try {
    const result = await requestConversationDeletion({
      email,
      anonymousSessionId: session?.id ?? null,
    });
    return NextResponse.json({
      ok: true,
      data: {
        expiresInMinutes: result.expiresInMinutes,
        delivered: result.delivered,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Demande impossible.";
    return NextResponse.json(
      { ok: false, code: "request_failed", message },
      { status: 422 }
    );
  }
};
