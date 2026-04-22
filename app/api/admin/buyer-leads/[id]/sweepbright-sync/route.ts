import { NextResponse } from "next/server";
import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import { syncBuyerLeadToSweepBright } from "@/services/buyers/sweepbright-sync.service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "leads.buyers.manage")) {
    return NextResponse.json({ ok: false, message: "Acces refuse." }, { status: 403 });
  }

  try {
    const { id } = await params;
    const result = await syncBuyerLeadToSweepBright(id, { force: true });
    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "SweepBright sync failed.",
      },
      { status: 500 }
    );
  }
}
