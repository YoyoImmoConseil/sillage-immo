import { NextResponse } from "next/server";
import { isClientPortalDirectAccessEnabled } from "@/lib/client-space/direct-access";
import { sendClientPortalMagicLink } from "@/services/clients/client-portal-magic-link.service";

type Body = {
  email?: string;
  nextPath?: string;
  inviteToken?: string | null;
};

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
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

  try {
    const result = await sendClientPortalMagicLink({
      email,
      nextPath: body?.nextPath,
      inviteToken: body?.inviteToken,
      origin: requestUrl.origin,
      baseUrlOverride: isClientPortalDirectAccessEnabled(requestUrl.host) ? requestUrl.origin : undefined,
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
