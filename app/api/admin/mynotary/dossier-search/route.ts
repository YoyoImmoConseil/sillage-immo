import { NextResponse } from "next/server";
import { getAdminPageContext, hasAdminPermission } from "@/lib/admin/auth";
import { searchDossiers } from "@/services/admin/mynotary-match.service";

export const dynamic = "force-dynamic";

export const GET = async (request: Request) => {
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

  const q = new URL(request.url).searchParams.get("q") ?? "";
  const results = await searchDossiers(q, 10);
  return NextResponse.json({ ok: true, results });
};
