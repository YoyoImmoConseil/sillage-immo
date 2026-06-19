import { NextResponse } from "next/server";
import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import { searchClientProfiles } from "@/services/clients/client-profile.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = await getAdminRequestContext(request);
  if (
    !context ||
    !(
      hasAdminPermission(context, "clients.view") ||
      hasAdminPermission(context, "leads.buyers.view")
    )
  ) {
    return NextResponse.json({ ok: false, message: "Acces refuse." }, { status: 403 });
  }

  const query = new URL(request.url).searchParams.get("q") ?? "";
  try {
    const results = await searchClientProfiles(query);
    return NextResponse.json({ ok: true, results });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Recherche impossible." },
      { status: 500 }
    );
  }
}
