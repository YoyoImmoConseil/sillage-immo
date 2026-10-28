import { NextResponse } from "next/server";

import { getRequestLocale } from "@/lib/i18n/request";
import { buildTeamCardUrl } from "@/lib/team/card";
import { renderQrPng } from "@/lib/team/card-assets";
import { getTeamCardMemberBySlug } from "@/services/team/team-card.service";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ slug: string }> };

/** QR code PNG 1024 px vers la carte (utm_source=qr), à imprimer ou partager. */
export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const member = await getTeamCardMemberBySlug(slug, await getRequestLocale());
  if (!member) return new NextResponse(null, { status: 404 });

  const png = await renderQrPng(buildTeamCardUrl(member.slug, "qr"), 1024);
  return new NextResponse(new Uint8Array(png), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `inline; filename="qr-${member.slug}-sillage-immo.png"`,
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "X-Robots-Tag": "noindex",
    },
  });
}
