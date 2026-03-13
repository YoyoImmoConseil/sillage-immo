import { NextResponse } from "next/server";
import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import { recomputeMatchesForProperty } from "@/services/buyers/buyer-matching.service";

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
    const matches = await recomputeMatchesForProperty(id);
    return NextResponse.json({ ok: true, count: matches.length });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Matching impossible." },
      { status: 500 }
    );
  }
}
