import { NextResponse } from "next/server";
import { sendClientPortalMagicLink } from "@/services/clients/client-portal-magic-link.service";

type Body = {
  email?: string;
  nextPath?: string;
  inviteToken?: string | null;
};

export async function POST(request: Request) {
  let body: Body | null = null;

  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, message: "Corps JSON invalide." }, { status: 400 });
  }

  const email = body?.email?.trim().toLowerCase() ?? "";
  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { ok: false, code: "invalid_email", message: "Veuillez renseigner une adresse email valide." },
      { status: 422 }
    );
  }

  // #region agent log
  fetch("http://127.0.0.1:7760/ingest/34db18ce-fe4a-4a99-91a2-c9c0aaded505", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "cada68" },
    body: JSON.stringify({
      sessionId: "cada68",
      runId: "pre-fix",
      hypothesisId: "H2",
      location: "app/api/espace-client/send-magic-link/route.ts:19",
      message: "portal magic link request received",
      data: {
        hasInviteToken: Boolean(body?.inviteToken),
        nextPath: body?.nextPath ?? null,
        emailLength: email.length,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  try {
    const result = await sendClientPortalMagicLink({
      email,
      nextPath: body?.nextPath,
      inviteToken: body?.inviteToken,
      origin: new URL(request.url).origin,
    });

    if (!result.ok) {
      const status =
        result.code === "invalid_email"
          ? 422
          : result.code === "no_portal_access"
            ? 404
            : result.code === "email_send_failed"
              ? 502
              : 400;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        code: "send_magic_link_failed",
        message:
          error instanceof Error
            ? error.message
            : "Impossible d'envoyer le lien de connexion a l'espace client.",
      },
      { status: 500 }
    );
  }
}
