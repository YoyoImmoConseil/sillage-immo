import { NextResponse } from "next/server";
import { askSellerChat } from "@/services/sellers/seller-chat.service";

type Body = {
  sellerLeadId?: string;
  message?: string;
};

export const POST = async (request: Request) => {
  let body: Body | null = null;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, message: "Corps JSON invalide." }, { status: 400 });
  }

  const sellerLeadId = body?.sellerLeadId?.trim();
  const message = body?.message?.trim();

  if (!sellerLeadId || !message) {
    return NextResponse.json(
      { ok: false, message: "sellerLeadId et message sont requis." },
      { status: 422 }
    );
  }

  if (message.length > 700) {
    return NextResponse.json(
      { ok: false, message: "Message trop long (max 700 caracteres)." },
      { status: 422 }
    );
  }

  try {
    const data = await askSellerChat(sellerLeadId, message);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Impossible de traiter la question.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
};
