import { NextResponse } from "next/server";
import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import { generateVitrinePoster } from "@/services/vitrine/poster-generation.service";

export const runtime = "nodejs";
export const maxDuration = 60;

type GenerateBody = { sendEmail?: boolean; requesterEmail?: string };

const isEmail = (value: unknown): value is string =>
  typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

/**
 * « Imprimer la fiche vitrine » : génère le PDF A3, l'archive et l'envoie par
 * mail au collaborateur connecté. 422 avec la liste des manques si une donnée
 * obligatoire est absente.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "properties.manage")) {
    return NextResponse.json({ ok: false, message: "Acces refuse." }, { status: 403 });
  }
  let body: GenerateBody = {};
  try {
    const text = await request.text();
    body = text ? (JSON.parse(text) as GenerateBody) : {};
  } catch {
    return NextResponse.json({ ok: false, message: "Corps JSON invalide." }, { status: 400 });
  }

  // Destinataire = le collaborateur connecté. Seule la clé d'administration
  // (scripts, outils internes) peut désigner explicitement un destinataire.
  const sessionEmail = context.profile?.email?.trim().toLowerCase() ?? null;
  const email =
    sessionEmail ?? (context.mode === "secret" && isEmail(body.requesterEmail) ? body.requesterEmail.trim().toLowerCase() : null);
  if (!email) {
    return NextResponse.json(
      { ok: false, message: "Aucune adresse e-mail associée à votre session : connectez-vous avec votre compte Sillage." },
      { status: 400 }
    );
  }

  const { id } = await params;
  try {
    const result = await generateVitrinePoster({
      propertyId: id,
      requester: { email, firstName: context.profile?.firstName ?? null },
      sendEmail: body.sendEmail !== false,
    });
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, message: "Données incomplètes : la fiche vitrine ne peut pas être produite.", errors: result.errors, warnings: result.warnings },
        { status: 422 }
      );
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Génération impossible." },
      { status: 500 }
    );
  }
}
