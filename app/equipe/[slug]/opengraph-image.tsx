import { ImageResponse } from "next/og";

import { getAdminTeamTitleLabel } from "@/lib/i18n/domain";
import { getRequestLocale } from "@/lib/i18n/request";
import {
  TEAM_CARD_NAVY,
  TEAM_CARD_SAND,
  fetchPortraitJpeg,
  loadCardFonts,
  loadCardLogoDataUri,
  toJpegDataUri,
} from "@/lib/team/card-assets";
import { getTeamCardMemberBySlug } from "@/services/team/team-card.service";

export const runtime = "nodejs";
export const alt = "Sillage Immo — carte de visite";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type ImageProps = { params: Promise<{ slug: string }> };

/**
 * Aperçu de lien (WhatsApp, iMessage, LinkedIn…) de la carte : portrait,
 * nom, poste et agence. Collaborateur inconnu → même visuel sans portrait.
 */
export default async function TeamCardOpenGraphImage({ params }: ImageProps) {
  const { slug } = await params;
  const locale = await getRequestLocale();
  const member = await getTeamCardMemberBySlug(slug, locale);
  const [fonts, logo, portrait] = await Promise.all([
    loadCardFonts(),
    loadCardLogoDataUri(),
    fetchPortraitJpeg(member?.avatarUrl ?? null, 520),
  ]);
  const title = member ? getAdminTeamTitleLabel(member.title, locale) : null;
  const initials = member
    ? `${member.firstName.charAt(0)}${member.lastName.charAt(0)}`.toUpperCase()
    : "S";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          padding: "0 84px",
          gap: 72,
          background: `linear-gradient(135deg, ${TEAM_CARD_NAVY} 0%, #1c1e4a 60%, #26296a 100%)`,
          color: TEAM_CARD_SAND,
          fontFamily: "Montserrat",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 400,
            height: 400,
            borderRadius: 200,
            overflow: "hidden",
            border: `10px solid ${TEAM_CARD_SAND}`,
            background: "rgba(244,236,228,0.15)",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 140,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {portrait ? (
            <img src={toJpegDataUri(portrait)} alt="" width={400} height={400} style={{ objectFit: "cover" }} />
          ) : (
            initials
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <img src={logo} alt="" width={132} height={120} style={{ opacity: 0.9 }} />
          <div style={{ marginTop: 36, fontSize: 64, fontWeight: 700, lineHeight: 1.1 }}>
            {member?.fullName ?? "Sillage Immo"}
          </div>
          {title ? <div style={{ marginTop: 10, fontSize: 36, opacity: 0.85 }}>{title}</div> : null}
          <div style={{ marginTop: 44, fontSize: 26, opacity: 0.65, letterSpacing: 4, textTransform: "uppercase" }}>
            Sillage Immo · Nice · sillage-immo.com
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Montserrat", data: fonts.regular, weight: 400, style: "normal" },
        { name: "Montserrat", data: fonts.bold, weight: 700, style: "normal" },
      ],
    }
  );
}
