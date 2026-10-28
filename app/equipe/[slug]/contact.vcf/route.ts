import { NextResponse } from "next/server";

import { getRequestLocale } from "@/lib/i18n/request";
import { getAdminTeamTitleLabel } from "@/lib/i18n/domain";
import { localizePath } from "@/lib/i18n/routing";
import { buildTeamCardUrl, buildTeamVCard, buildVCardFileName } from "@/lib/team/card";
import { fetchPortraitJpeg } from "@/lib/team/card-assets";
import { getTeamCardMemberBySlug } from "@/services/team/team-card.service";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ slug: string }> };

/**
 * Fiche contact (.vcf) du collaborateur. Servie « inline » : Safari iOS ouvre
 * alors directement la fiche Contacts (avec « attachment », il l'enregistre
 * dans Fichiers) ; Chrome Android télécharge le fichier puis propose
 * Contacts. Le nom de fichier reste lisible grâce à `filename`.
 */
export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const locale = await getRequestLocale();
  const member = await getTeamCardMemberBySlug(slug, locale);
  if (!member) {
    return NextResponse.redirect(new URL(localizePath("/agence", locale), _request.url), 307);
  }

  const portrait = await fetchPortraitJpeg(member.avatarUrl, 320);
  const vcard = buildTeamVCard({
    firstName: member.firstName,
    lastName: member.lastName,
    title: getAdminTeamTitleLabel(member.title, "fr"),
    email: member.email,
    phone: member.phoneE164,
    whatsappPhone: member.whatsappE164,
    cardUrl: buildTeamCardUrl(member.slug, "vcard"),
    photoBase64: portrait ? portrait.toString("base64") : null,
  });

  const fileName = buildVCardFileName(member.firstName, member.lastName);
  return new NextResponse(vcard, {
    status: 200,
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `inline; filename="${fileName}"`,
      "Cache-Control": "public, max-age=600, stale-while-revalidate=3600",
      "X-Robots-Tag": "noindex",
    },
  });
}
