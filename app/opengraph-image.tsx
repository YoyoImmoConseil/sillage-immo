import { ImageResponse } from "next/og";

/**
 * Image de partage par défaut (WhatsApp, LinkedIn, iMessage…) pour toutes les
 * pages qui n'en fournissent pas une plus précise (les fiches biens utilisent
 * leur photo de couverture).
 */
export const alt = "Sillage Immo — Agence immobilière à Nice";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 84px",
          background: "linear-gradient(135deg, #14143f 0%, #1c1e4a 60%, #26296a 100%)",
          color: "#f3ece2",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 30, letterSpacing: 10, textTransform: "uppercase", opacity: 0.85 }}>
            Sillage Immo
          </div>
          <div style={{ width: 96, height: 3, background: "#f3ece2", opacity: 0.6 }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ fontSize: 68, lineHeight: 1.08, maxWidth: 940 }}>
            L&apos;immobilier à Nice, piloté par la data et l&apos;humain
          </div>
          <div style={{ fontSize: 28, opacity: 0.8, fontFamily: "Helvetica, Arial, sans-serif" }}>
            Estimation · Vente · Recherche accompagnée · Espace client
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, opacity: 0.75, fontFamily: "Helvetica, Arial, sans-serif" }}>
          <span>sillage-immo.com</span>
          <span>35 rue Arson · 06300 Nice</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
