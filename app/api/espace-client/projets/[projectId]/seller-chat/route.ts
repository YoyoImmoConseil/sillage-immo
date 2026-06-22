import { NextResponse } from "next/server";
import { getClientSpacePageContext } from "@/lib/client-space/auth";
import { getClientPortalProjectDetail } from "@/services/clients/client-portal.service";
import { getSellerProjectByClientProjectId } from "@/services/clients/seller-project.service";
import { askSellerChat } from "@/services/sellers/seller-chat.service";

type Body = {
  message?: string;
  locale?: "fr" | "en" | "es" | "ru";
};

export const POST = async (
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) => {
  const { projectId } = await params;

  // 1. Authenticated client space session.
  const context = await getClientSpacePageContext();
  if (!context) {
    return NextResponse.json({ ok: false, message: "Non authentifié." }, { status: 401 });
  }

  let body: Body | null = null;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, message: "Corps JSON invalide." }, { status: 400 });
  }
  const message = body?.message?.trim();
  if (!message) {
    return NextResponse.json({ ok: false, message: "Message vide." }, { status: 422 });
  }
  if (message.length > 700) {
    return NextResponse.json(
      { ok: false, message: "Message trop long (max 700 caractères)." },
      { status: 422 }
    );
  }

  // 2. Membership gate: getClientPortalProjectDetail returns null unless the
  //    authenticated client is a member (primary or co-owner) of the project.
  const detail = await getClientPortalProjectDetail({
    authUserId: context.authUserId,
    projectId,
  });
  if (!detail) {
    return NextResponse.json({ ok: false, message: "Projet introuvable." }, { status: 404 });
  }
  if (detail.kind !== "seller") {
    return NextResponse.json(
      { ok: false, message: "Chat indisponible pour ce type de projet." },
      { status: 422 }
    );
  }

  // 3. Resolve the underlying seller lead so the chat continues the same
  //    conversation thread the seller started before converting.
  const sellerProject = await getSellerProjectByClientProjectId(projectId);
  if (!sellerProject?.seller_lead_id) {
    return NextResponse.json(
      { ok: false, message: "Conversation vendeur indisponible pour ce projet." },
      { status: 422 }
    );
  }

  try {
    const data = await askSellerChat(
      sellerProject.seller_lead_id,
      message,
      body?.locale ?? "fr"
    );
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Impossible de traiter la question.";
    return NextResponse.json({ ok: false, message: errorMessage }, { status: 500 });
  }
};
