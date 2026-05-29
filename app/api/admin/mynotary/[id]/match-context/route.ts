import { NextResponse } from "next/server";
import { getAdminPageContext, hasAdminPermission } from "@/lib/admin/auth";
import { getMyNotaryMatchContext } from "@/services/admin/mynotary-match.service";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const context = await getAdminPageContext();
  if (!context || !context.profile) {
    return NextResponse.json(
      { ok: false, code: "unauthenticated", message: "Session admin requise." },
      { status: 401 }
    );
  }
  if (!hasAdminPermission(context, "admin.mynotary.view")) {
    return NextResponse.json(
      { ok: false, code: "forbidden", message: "Permission insuffisante." },
      { status: 403 }
    );
  }

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json(
      { ok: false, code: "invalid_document_id" },
      { status: 400 }
    );
  }

  const data = await getMyNotaryMatchContext(id);
  if (!data) {
    return NextResponse.json(
      { ok: false, code: "not_found", message: "Document introuvable." },
      { status: 404 }
    );
  }
  return NextResponse.json({ ok: true, ...data });
};
