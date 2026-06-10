import { NextResponse } from "next/server";
import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import { listActiveAdvisors } from "@/services/admin/admin-user.service";

export async function GET(request: Request) {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "clients.assign_advisor")) {
    return NextResponse.json({ ok: false, message: "Acces refuse." }, { status: 403 });
  }

  try {
    const advisors = await listActiveAdvisors();
    return NextResponse.json({ ok: true, advisors });
  } catch (error) {
    console.error(
      "[admin-advisors] list failed:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json({ ok: false, message: "Erreur interne." }, { status: 500 });
  }
}
