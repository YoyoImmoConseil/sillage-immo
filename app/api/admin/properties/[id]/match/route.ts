import { NextResponse } from "next/server";
import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import { recomputeMatchesForProperty } from "@/services/buyers/buyer-matching.service";
import { processBuyerAlertsForNewMatches } from "@/services/buyers/buyer-alert.service";

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
    const result = await recomputeMatchesForProperty(id);
    let notifiedCount = 0;
    if (result.newMatches.length > 0) {
      try {
        const alert = await processBuyerAlertsForNewMatches(result.newMatches);
        notifiedCount = alert.notifiedCount;
      } catch (error) {
        console.error("[admin property match] alert failed", error);
      }
    }
    return NextResponse.json({
      ok: true,
      count: result.totalMatches,
      newCount: result.newMatches.length,
      notifiedCount,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Matching impossible." },
      { status: 500 }
    );
  }
}
