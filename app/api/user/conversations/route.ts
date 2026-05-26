import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { executeConversationDeletion } from "@/services/ai/conversations-deletion.service";
import {
  ANONYMOUS_SESSION_COOKIE_NAME,
  parseAnonymousSessionCookie,
} from "@/lib/ai/anonymous-session";

export const dynamic = "force-dynamic";

// DELETE /api/user/conversations
// Body: { email: string, code: string }
//
// Verifies the 6-digit code sent by /request-deletion, then soft-
// deletes every ai_conversations row tied to the email (and to the
// optional anonymous_session_id) and emits the
// `gdpr_deletion_executed` domain event.

type Body = { email?: string; code?: string };

export const DELETE = async (request: Request) => {
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
  const code = typeof body?.code === "string" ? body.code.trim() : "";

  if (!email || !code) {
    return NextResponse.json(
      {
        ok: false,
        code: "missing_fields",
        message: "Email et code sont requis.",
      },
      { status: 422 }
    );
  }

  const cookieStore = await cookies();
  const sessionRaw = cookieStore.get(ANONYMOUS_SESSION_COOKIE_NAME)?.value;
  const session = await parseAnonymousSessionCookie(sessionRaw);

  try {
    const result = await executeConversationDeletion({
      email,
      code,
      anonymousSessionId: session?.id ?? null,
    });
    return NextResponse.json({
      ok: true,
      data: {
        softDeletedConversations: result.softDeletedConversations,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Suppression impossible.";
    const isInvalidCode =
      message.toLowerCase().includes("code invalide") ||
      message.toLowerCase().includes("expiré");
    return NextResponse.json(
      {
        ok: false,
        code: isInvalidCode ? "invalid_code" : "deletion_failed",
        message,
      },
      { status: isInvalidCode ? 410 : 422 }
    );
  }
};
