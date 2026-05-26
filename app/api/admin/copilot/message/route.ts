import { NextResponse } from "next/server";
import { getAdminPageContext, hasAdminPermission } from "@/lib/admin/auth";
import {
  runCopilotTurn,
  type CopilotRole,
} from "@/services/admin/copilot-orchestrator.service";

export const dynamic = "force-dynamic";

type Body = {
  conversationId?: string | null;
  message?: string;
};

export const POST = async (request: Request) => {
  const context = await getAdminPageContext();
  if (!context || !context.profile) {
    return NextResponse.json(
      { ok: false, code: "unauthenticated", message: "Session admin requise." },
      { status: 401 }
    );
  }

  if (!hasAdminPermission(context, "admin.dashboard.pilot.view")) {
    return NextResponse.json(
      {
        ok: false,
        code: "forbidden",
        message:
          "Le copilot est réservé aux managers et administrateurs Sillage Immo.",
      },
      { status: 403 }
    );
  }

  if (context.role !== "manager" && context.role !== "administrateur") {
    return NextResponse.json(
      { ok: false, code: "forbidden", message: "Rôle non autorisé." },
      { status: 403 }
    );
  }

  let body: Body | null = null;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, code: "invalid_json", message: "Corps JSON invalide." },
      { status: 400 }
    );
  }

  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (message.length < 2 || message.length > 4000) {
    return NextResponse.json(
      {
        ok: false,
        code: "invalid_message",
        message: "Le message doit faire entre 2 et 4000 caractères.",
      },
      { status: 422 }
    );
  }

  const conversationId =
    typeof body?.conversationId === "string" && body.conversationId.length > 0
      ? body.conversationId
      : null;

  try {
    const result = await runCopilotTurn({
      adminProfileId: context.profile.id,
      adminEmail: context.profile.email ?? null,
      adminRole: context.role as CopilotRole,
      conversationId,
      userMessage: message,
    });
    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Copilot a échoué.";
    return NextResponse.json(
      { ok: false, code: "copilot_failed", message: errorMessage },
      { status: 502 }
    );
  }
};
