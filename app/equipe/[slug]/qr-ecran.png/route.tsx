/* eslint-disable @next/next/no-img-element -- image générée par satori (next/og), pas de next/image possible */
import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";

import { getAdminTeamTitleLabel } from "@/lib/i18n/domain";
import { getRequestLocale } from "@/lib/i18n/request";
import { buildTeamCardUrl } from "@/lib/team/card";
import {
  TEAM_CARD_NAVY,
  TEAM_CARD_SAND,
  loadCardFonts,
  loadCardLogoDataUri,
  renderQrPng,
  toPngDataUri,
} from "@/lib/team/card-assets";
import { getTeamCardBaseUrl } from "@/services/team/team-card-base-url";
import { getTeamCardMemberBySlug } from "@/services/team/team-card.service";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ slug: string }> };

/** Format iPhone 15/16 Pro ; recadré proprement sur les autres téléphones. */
const WIDTH = 1179;
const HEIGHT = 2556;

/**
 * Fond d'écran de verrouillage : QR vers la carte dans le tiers bas (le haut
 * reste libre pour l'heure et les notifications). Le collaborateur le montre
 * sans déverrouiller son téléphone.
 */
export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const locale = await getRequestLocale();
  const member = await getTeamCardMemberBySlug(slug, locale);
  if (!member) return new NextResponse(null, { status: 404 });

  const [fonts, logo, qr] = await Promise.all([
    loadCardFonts(),
    loadCardLogoDataUri(),
    renderQrPng(buildTeamCardUrl(member.slug, "qr", "card", await getTeamCardBaseUrl()), 760),
  ]);
  const title = getAdminTeamTitleLabel(member.title, locale);

  const image = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-end",
          padding: "0 0 220px",
          background: `linear-gradient(180deg, ${TEAM_CARD_NAVY} 0%, #1c1e4a 55%, #26296a 100%)`,
          color: TEAM_CARD_SAND,
          fontFamily: "Montserrat",
        }}
      >
        <img src={logo} alt="" width={260} height={236} style={{ opacity: 0.9, marginBottom: 56 }} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: 44,
            borderRadius: 56,
            background: "#ffffff",
          }}
        >
          <img src={toPngDataUri(qr)} alt="" width={760} height={760} />
        </div>
        <div style={{ marginTop: 64, fontSize: 64, fontWeight: 700, textAlign: "center" }}>{member.fullName}</div>
        {title ? <div style={{ marginTop: 12, fontSize: 40, opacity: 0.85 }}>{title}</div> : null}
        <div style={{ marginTop: 40, fontSize: 36, opacity: 0.75, textAlign: "center" }}>
          Scannez pour enregistrer mon contact
        </div>
        <div style={{ marginTop: 16, fontSize: 32, opacity: 0.6, letterSpacing: 4, textTransform: "uppercase" }}>
          Sillage Immo · Nice
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        { name: "Montserrat", data: fonts.regular, weight: 400, style: "normal" },
        { name: "Montserrat", data: fonts.bold, weight: 700, style: "normal" },
      ],
      headers: {
        "Content-Disposition": `inline; filename="ecran-verrouillage-${member.slug}-sillage-immo.png"`,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        "X-Robots-Tag": "noindex",
      },
    }
  );
  return image;
}
