import { NextResponse } from "next/server";

import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import { buildFollowupLinksForLead, getFollowupLead } from "@/services/buyers/buyer-followup.service";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

const CAMPAIGN_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;

/**
 * Liens trackés d'un acquéreur pour une campagne de relance
 * (`?campaign=mls-2026-11`) : un jeton signé, cinq URL (actif, visio, modif,
 * conclu, abandon) à poser sur les boutons de l'e-mail. Lecture seule.
 */
export async function GET(request: Request, context: RouteContext) {
  const adminContext = await getAdminRequestContext(request);
  if (!adminContext || !hasAdminPermission(adminContext, "leads.buyers.manage")) {
    return NextResponse.json({ ok: false, code: "forbidden", message: "Acces refuse." }, { status: 403 });
  }
  const { id } = await context.params;
  const campaign = new URL(request.url).searchParams.get("campaign")?.trim().toLowerCase() ?? "";
  if (!CAMPAIGN_RE.test(campaign)) {
    return NextResponse.json(
      { ok: false, code: "invalid_campaign", message: "Campagne attendue : minuscules, chiffres, tirets (ex. mls-2026-11)." },
      { status: 422 }
    );
  }
  const lead = await getFollowupLead(id);
  if (!lead) {
    return NextResponse.json({ ok: false, code: "not_found", message: "Acquereur introuvable." }, { status: 404 });
  }
  const links = buildFollowupLinksForLead({ leadId: lead.id, campaign });
  return NextResponse.json({ ok: true, data: { lead: { id: lead.id, fullName: lead.fullName, email: lead.email, status: lead.status }, campaign, ...links } });
}
