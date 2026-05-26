import { NextResponse } from "next/server";
import { getAdminPageContext, hasAdminPermission } from "@/lib/admin/auth";
import { runIncrementalBackfill } from "@/services/mynotary/backfill.service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const POST = async () => {
  const context = await getAdminPageContext();
  if (!context || !context.profile) {
    return NextResponse.json(
      { ok: false, code: "unauthenticated", message: "Session admin requise." },
      { status: 401 }
    );
  }
  if (!hasAdminPermission(context, "admin.mynotary.sync")) {
    return NextResponse.json(
      { ok: false, code: "forbidden", message: "Accès réservé aux administrateurs." },
      { status: 403 }
    );
  }

  try {
    const result = await runIncrementalBackfill({ trigger: "manual" });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        code: "sync_failed",
        message: err instanceof Error ? err.message : "Sync failed",
      },
      { status: 500 }
    );
  }
};
