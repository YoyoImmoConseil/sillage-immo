import { NextResponse } from "next/server";

import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import { importReactivationContacts, type ImportedContactInput } from "@/services/reactivation/reactivation-import.service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BATCH = 1000;

/**
 * Import d'un lot de contacts SweepBright dans la file de réactivation.
 * Corps : { campaign?: "reac-…", contacts: [{ sweepbright_contact_id, type,
 * created_at, labels, negotiator, first_name, last_name, email, phone,
 * negotiations }] }. Un contact déjà importé garde son statut.
 */
export async function POST(request: Request) {
  const adminContext = await getAdminRequestContext(request);
  if (!adminContext || !hasAdminPermission(adminContext, "leads.sellers.manage")) {
    return NextResponse.json({ ok: false, code: "forbidden", message: "Acces refuse." }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as { campaign?: string; contacts?: unknown } | null;
  if (!body || !Array.isArray(body.contacts)) {
    return NextResponse.json({ ok: false, code: "invalid_body", message: "contacts[] attendu." }, { status: 422 });
  }
  if (body.contacts.length > MAX_BATCH) {
    return NextResponse.json(
      { ok: false, code: "batch_too_large", message: `Au plus ${MAX_BATCH} contacts par appel.` },
      { status: 422 }
    );
  }
  try {
    const summary = await importReactivationContacts({
      campaign: body.campaign ?? null,
      contacts: body.contacts as ImportedContactInput[],
    });
    return NextResponse.json({ ok: true, data: summary });
  } catch (error) {
    return NextResponse.json(
      { ok: false, code: "import_failed", message: error instanceof Error ? error.message : "Import failed." },
      { status: 500 }
    );
  }
}
