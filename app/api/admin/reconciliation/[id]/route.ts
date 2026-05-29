import { NextResponse } from "next/server";
import { getAdminPageContext, hasAdminPermission } from "@/lib/admin/auth";
import {
  acceptReconciliationSuggestion,
  rejectReconciliationSuggestion,
} from "@/services/admin/reconciliation-list.service";

export const dynamic = "force-dynamic";

type Body = { action?: "accept" | "reject" };

export const POST = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const context = await getAdminPageContext();
  if (!context || !context.profile) {
    return NextResponse.json(
      { ok: false, code: "unauthenticated", message: "Session admin requise." },
      { status: 401 }
    );
  }
  if (!hasAdminPermission(context, "clients.edit")) {
    return NextResponse.json(
      { ok: false, code: "forbidden", message: "Permission insuffisante." },
      { status: 403 }
    );
  }

  const { id } = await params;
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, code: "invalid_json", message: "JSON invalide." },
      { status: 400 }
    );
  }

  if (body.action === "accept") {
    const result = await acceptReconciliationSuggestion(id, context.profile.id);
    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, clientProjectId: result.clientProjectId });
  }
  if (body.action === "reject") {
    await rejectReconciliationSuggestion(id, context.profile.id);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json(
    { ok: false, code: "invalid_action", message: "Action inconnue." },
    { status: 400 }
  );
};
