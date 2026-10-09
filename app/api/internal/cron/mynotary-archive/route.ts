import { NextResponse } from "next/server";
import { isInternalRequest } from "@/lib/admin/auth";
import { archiveDueMyNotaryFiles } from "@/services/mynotary/archive-signed-document.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Tâche mensuelle d'archivage : copie chez Sillage les fichiers MyNotary
 * qui arrivent à échéance (signature + 9 ans 6 mois) sans copie locale.
 * Structure posée à l'étape 1 ; la première échéance réelle tombe en 2035.
 */
export const GET = async (request: Request) => {
  if (!(await isInternalRequest(request))) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const url = new URL(request.url);
  const limit = Number.parseInt(url.searchParams.get("limit") ?? "50", 10);
  const horizonDays = Number.parseInt(url.searchParams.get("horizonDays") ?? "31", 10);
  try {
    const result = await archiveDueMyNotaryFiles({ limit, horizonDays });
    return NextResponse.json({ ok: true, mode: "cron", ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "MyNotary archive cron failed.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
};
