import { NextResponse } from "next/server";
import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import { buildVitrinePoster } from "@/services/vitrine/poster.service";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Aperçu de la fiche vitrine (lot 2) : renvoie le PDF A3 en ligne.
 * `?force=1` rend malgré les manques bloquants, avec un filigrane.
 * `?diag=1` renvoie le diagnostic JSON sans rendre.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "properties.view")) {
    return NextResponse.json({ ok: false, message: "Acces refuse." }, { status: 403 });
  }
  const { id } = await params;
  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "1";
  const diagnosticsOnly = url.searchParams.get("diag") === "1";

  try {
    if (diagnosticsOnly) {
      const result = await buildVitrinePoster({ propertyId: id, force: false });
      return NextResponse.json({ ok: result.errors.length === 0, errors: result.errors, warnings: result.warnings, content: result.content });
    }
    const result = await buildVitrinePoster({ propertyId: id, force });
    if (!result.pdf) {
      return NextResponse.json(
        {
          ok: false,
          message: "Données incomplètes : la fiche vitrine ne peut pas être produite.",
          errors: result.errors,
          warnings: result.warnings,
          hint: "Ajoutez ?force=1 pour un aperçu filigrané malgré les manques.",
        },
        { status: 422 }
      );
    }
    return new Response(new Uint8Array(result.pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${result.fileName}"`,
        "Cache-Control": "no-store",
        "X-Vitrine-Warnings": String(result.warnings.length),
        "X-Vitrine-Errors": String(result.errors.length),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Aperçu impossible." },
      { status: 500 }
    );
  }
}
