import { NextResponse } from "next/server";

import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import { syncProtectedContactsFromMyNotary } from "@/services/reactivation/protected-contacts.service";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Synchronisation manuelle des contacts protégés (bouton de la page admin « Réactivation »). */
export async function POST(request: Request) {
  const adminContext = await getAdminRequestContext(request);
  if (!adminContext || !hasAdminPermission(adminContext, "leads.sellers.manage")) {
    return NextResponse.json({ ok: false, code: "forbidden", message: "Acces refuse." }, { status: 403 });
  }
  try {
    const summary = await syncProtectedContactsFromMyNotary();
    return NextResponse.json({ ok: true, data: summary });
  } catch (error) {
    return NextResponse.json(
      { ok: false, code: "sync_failed", message: error instanceof Error ? error.message : "Sync failed." },
      { status: 500 }
    );
  }
}
