import { NextResponse } from "next/server";
import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import { recomputeMatchesForBuyerLead } from "@/services/buyers/buyer-matching.service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "matching.manage")) {
    return NextResponse.json({ ok: false, message: "Acces refuse." }, { status: 403 });
  }

  try {
    const { id } = await params;
    const result = await recomputeMatchesForBuyerLead(id);
    return NextResponse.json({
      ok: true,
      count: result.totalMatches,
      newCount: result.newMatches.length,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Matching impossible." },
      { status: 500 }
    );
  }
}
