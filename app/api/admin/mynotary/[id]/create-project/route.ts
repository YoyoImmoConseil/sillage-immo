import { NextResponse } from "next/server";
import { getAdminPageContext, hasAdminPermission } from "@/lib/admin/auth";
import { createProjectFromMyNotaryDocument } from "@/services/admin/mynotary-match.service";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const REASON_MESSAGE: Record<string, string> = {
  document_introuvable: "Document introuvable.",
  deja_rattache: "Ce contrat est déjà rattaché à un dossier.",
  pas_email_vendeur:
    "Impossible de créer un dossier : aucun e-mail vendeur dans le contrat.",
  pas_adresse: "Impossible de créer un dossier : adresse du bien absente.",
  aucun_bien_correspondant:
    "Aucun bien SweepBright ne correspond à l'adresse du contrat. Importez d'abord le bien, ou rattachez à un dossier existant.",
};

export const POST = async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const context = await getAdminPageContext();
  if (!context || !context.profile) {
    return NextResponse.json(
      { ok: false, code: "unauthenticated", message: "Session admin requise." },
      { status: 401 }
    );
  }
  if (!hasAdminPermission(context, "admin.mynotary.manage")) {
    return NextResponse.json(
      { ok: false, code: "forbidden", message: "Accès réservé aux managers / administrateurs." },
      { status: 403 }
    );
  }

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json(
      { ok: false, code: "invalid_document_id" },
      { status: 400 }
    );
  }

  const result = await createProjectFromMyNotaryDocument(id);
  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        code: result.reason ?? "create_failed",
        message: result.reason
          ? REASON_MESSAGE[result.reason] ?? "Création impossible."
          : "Création impossible.",
      },
      { status: 422 }
    );
  }

  return NextResponse.json({
    ok: true,
    clientProjectId: result.clientProjectId,
    sellerProjectId: result.sellerProjectId,
    clientProfileId: result.clientProfileId,
    golden: result.golden,
  });
};
