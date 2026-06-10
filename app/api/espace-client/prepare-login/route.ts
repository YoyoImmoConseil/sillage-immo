import { NextResponse } from "next/server";
import { prepareClientPortalLogin } from "@/services/clients/client-portal-login.service";

type Body = {
  email?: string;
  nextPath?: string;
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

  try {
    const result = await prepareClientPortalLogin({
      email,
      nextPath: body?.nextPath,
    });

    if (!result.ok) {
      // Anti-enumeration : reponse uniforme, sans confirmer l'existence
      // ou non d'un acces portail pour cette adresse.
      return NextResponse.json({
        ok: true,
        code: "sent_if_exists",
        message:
          "Si un espace client existe pour cette adresse, vous recevrez les instructions de connexion.",
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "[prepare-login] failed:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      {
        ok: false,
        code: "prepare_login_failed",
        message: "Impossible de preparer votre acces a l'espace client.",
      },
      { status: 500 }
    );
  }
}
