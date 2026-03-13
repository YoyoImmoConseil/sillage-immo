import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin/auth";
import { syncSellerValuationFromLoupe } from "@/services/sellers/seller-valuation-sync.service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export const POST = async (request: Request, { params }: RouteParams) => {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

  if (!id?.trim()) {
    return NextResponse.json(
      { ok: false, message: "Identifiant de lead vendeur manquant." },
      { status: 422 }
    );
  }

  let loupeLeadId: string | undefined;
  try {
    const body = (await request.json()) as { loupeLeadId?: unknown };
    if (typeof body.loupeLeadId === "string" && body.loupeLeadId.trim().length > 0) {
      loupeLeadId = body.loupeLeadId.trim();
    }
  } catch {
    // optional body
  }

  try {
    const result = await syncSellerValuationFromLoupe(id, { loupeLeadId });
    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur de synchronisation valuation.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
};
