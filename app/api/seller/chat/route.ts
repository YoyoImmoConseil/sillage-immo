import { NextResponse } from "next/server";
import { readMerciVendeurAccessToken } from "@/lib/sellers/merci-vendeur-access";
import { askSellerChat } from "@/services/sellers/seller-chat.service";

type Body = {
  accessToken?: string;
  message?: string;
};

export const POST = async (request: Request) => {
  let body: Body | null = null;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, message: "Corps JSON invalide." }, { status: 400 });
  }

  const access = readMerciVendeurAccessToken(body?.accessToken?.trim());
  const message = body?.message?.trim();

  if (!access?.leadId || !message) {
    return NextResponse.json(
      { ok: false, message: "Acces vendeur invalide ou expire." },
      { status: 401 }
    );
  }

  if (message.length > 700) {
    return NextResponse.json(
      { ok: false, message: "Message trop long (max 700 caracteres)." },
      { status: 422 }
    );
  }

  try {
    const data = await askSellerChat(access.leadId, message);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Impossible de traiter la question.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
};
