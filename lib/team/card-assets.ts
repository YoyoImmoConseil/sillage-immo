import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import sharp from "sharp";

/** Bleu nuit Sillage, utilisé pour les modules du QR et les fonds. */
export const TEAM_CARD_NAVY = "#141446";
export const TEAM_CARD_SAND = "#f4ece4";

/** Photo du collaborateur redimensionnée (carré centré) en JPEG, pour la vCard et l'image de partage. */
export const fetchPortraitJpeg = async (
  url: string | null,
  size: number
): Promise<Buffer | null> => {
  if (!url) return null;
  try {
    const response = await fetch(url, { next: { revalidate: 3600 } });
    if (!response.ok) return null;
    const source = Buffer.from(await response.arrayBuffer());
    return await sharp(source)
      .rotate()
      .resize(size, size, { fit: "cover", position: "attention" })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
  } catch (error) {
    console.error("[team-card] portrait unavailable", error);
    return null;
  }
};

/** QR PNG (niveau M, marge 2 modules) prêt à imprimer ou à partager. */
export const renderQrPng = (text: string, width: number) =>
  QRCode.toBuffer(text, {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 2,
    width,
    color: { dark: TEAM_CARD_NAVY, light: "#ffffff" },
  });

/** QR vectoriel pour l'imprimeur (cartes, badges, vitrine). */
export const renderQrSvg = (text: string) =>
  QRCode.toString(text, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 2,
    color: { dark: TEAM_CARD_NAVY, light: "#ffffff" },
  });

const assetPath = (...segments: string[]) => path.join(process.cwd(), "assets", "vitrine", ...segments);

let fontsCache: Promise<{ regular: ArrayBuffer; bold: ArrayBuffer }> | null = null;
/** Montserrat (regular + bold) pour les images générées par satori. */
export const loadCardFonts = () => {
  if (!fontsCache) {
    fontsCache = Promise.all([
      readFile(assetPath("fonts", "Montserrat-Regular.ttf")),
      readFile(assetPath("fonts", "Montserrat-Bold.ttf")),
    ]).then(([regular, bold]) => ({
      regular: regular.buffer.slice(regular.byteOffset, regular.byteOffset + regular.byteLength) as ArrayBuffer,
      bold: bold.buffer.slice(bold.byteOffset, bold.byteOffset + bold.byteLength) as ArrayBuffer,
    }));
  }
  return fontsCache;
};

let logoCache: Promise<string> | null = null;
/** Logo sable sur fond transparent, en data URI pour satori. */
export const loadCardLogoDataUri = () => {
  if (!logoCache) {
    logoCache = readFile(assetPath("logo-sillage-sand.png")).then(
      (data) => `data:image/png;base64,${data.toString("base64")}`
    );
  }
  return logoCache;
};

export const toJpegDataUri = (data: Buffer) => `data:image/jpeg;base64,${data.toString("base64")}`;
export const toPngDataUri = (data: Buffer) => `data:image/png;base64,${data.toString("base64")}`;
