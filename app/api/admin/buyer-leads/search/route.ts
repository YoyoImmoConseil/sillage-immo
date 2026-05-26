import { NextResponse } from "next/server";
import { getAdminPageContext, hasAdminPermission } from "@/lib/admin/auth";
import { searchBuyerLeadsForOffer } from "@/services/clients/seller-project.service";

export const dynamic = "force-dynamic";

// Tiny autocomplete endpoint used by the seller_project milestones
// form to attach an offerer to a buyer_lead. Requires `leads.buyers.view`
// (same permission used by /admin/buyer-leads listings).

export const GET = async (request: Request) => {
  const context = await getAdminPageContext();
  if (!context) {
    return NextResponse.json(
      { ok: false, code: "unauthenticated" },
      { status: 401 }
    );
  }
  if (!hasAdminPermission(context, "leads.buyers.view")) {
    return NextResponse.json(
      { ok: false, code: "forbidden" },
      { status: 403 }
    );
  }
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const items = await searchBuyerLeadsForOffer(q, 10);
  return NextResponse.json({ ok: true, items });
};
