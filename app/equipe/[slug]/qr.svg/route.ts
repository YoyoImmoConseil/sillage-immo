import { NextResponse } from "next/server";

import { getRequestLocale } from "@/lib/i18n/request";
import { buildTeamCardUrl } from "@/lib/team/card";
import { renderQrSvg } from "@/lib/team/card-assets";
import { getTeamCardBaseUrl } from "@/services/team/team-card-base-url";
import { getTeamCardMemberBySlug } from "@/services/team/team-card.service";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ slug: string }> };

/** QR code vectoriel (SVG) vers la carte, pour l'imprimeur. */
export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const member = await getTeamCardMemberBySlug(slug, await getRequestLocale());
  if (!member) return new NextResponse(null, { status: 404 });

  const svg = await renderQrSvg(buildTeamCardUrl(member.slug, "qr", "card", await getTeamCardBaseUrl()));
  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Content-Disposition": `inline; filename="qr-${member.slug}-sillage-immo.svg"`,
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "X-Robots-Tag": "noindex",
    },
  });
}
