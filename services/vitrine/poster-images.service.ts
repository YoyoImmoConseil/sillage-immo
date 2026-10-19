import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { CARD_PHOTO, MAIN_PHOTO } from "@/lib/vitrine/poster-layout";
import type { VitrinePosterImage, VitrinePosterLogo } from "./poster-document";

/** Plafond du côté long des photos (décision validée) et seuil d'alerte. */
export const VITRINE_PHOTO_MAX_PX = 3500;
export const VITRINE_PHOTO_WARN_PX = 1600;

export type PreparedPhoto = {
  image: VitrinePosterImage;
  sourceWidth: number;
  sourceHeight: number;
  warning: string | null;
};

const fetchBytes = async (url: string) => {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Photo inaccessible (${response.status}) : ${url}`);
  }
  return Buffer.from(await response.arrayBuffer());
};

/**
 * Recadre la photo au format exact de son emplacement (« cover », centré),
 * plafonne la définition à 3 500 px côté long et la réencode en JPEG. Les
 * dimensions d'origine ne sont pas stockées en base : elles sont mesurées ici.
 */
export const preparePosterPhoto = async (input: {
  url: string;
  label: string;
  slot: "main" | "card";
}): Promise<PreparedPhoto> => {
  const source = await fetchBytes(input.url);
  const meta = await sharp(source).rotate().metadata();
  const sourceWidth = meta.width ?? 0;
  const sourceHeight = meta.height ?? 0;
  const slot = input.slot === "main" ? MAIN_PHOTO : CARD_PHOTO;
  const ratio = slot.w / slot.h;
  // Côté long plafonné ; côté court déduit du ratio de l'emplacement.
  const targetWidth = Math.min(VITRINE_PHOTO_MAX_PX, Math.max(sourceWidth, 1));
  const targetHeight = Math.round(targetWidth / ratio);
  const data = await sharp(source)
    .rotate()
    .resize({ width: targetWidth, height: targetHeight, fit: "cover", position: "centre", withoutEnlargement: true })
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
  const longSide = Math.max(sourceWidth, sourceHeight);
  const warning =
    longSide > 0 && longSide < VITRINE_PHOTO_WARN_PX
      ? `${input.label} : définition faible (${sourceWidth} × ${sourceHeight} px, en dessous de ${VITRINE_PHOTO_WARN_PX} px), l'impression A3 peut manquer de netteté.`
      : null;
  return { image: { data, format: "jpg" }, sourceWidth, sourceHeight, warning };
};

let logoCache: VitrinePosterLogo | null = null;
export const loadPosterLogo = async (): Promise<VitrinePosterLogo> => {
  if (logoCache) return logoCache;
  const file = path.join(process.cwd(), "assets", "vitrine", "logo-sillage-sand.png");
  const data = await readFile(file);
  const meta = await sharp(data).metadata();
  logoCache = { data, format: "png", width: meta.width ?? 1400, height: meta.height ?? 1272 };
  return logoCache;
};
