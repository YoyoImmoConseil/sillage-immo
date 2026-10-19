import "server-only";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/seo/site";
import { buildVitrinePosterContent, type VitrinePosterContent } from "@/lib/vitrine/poster-content";
import { buildQrModules } from "@/lib/vitrine/qr";
import type { Database } from "@/types/db/supabase";
import { VitrinePosterDocument, type VitrinePosterImage } from "./poster-document";
import { loadPosterLogo, preparePosterPhoto } from "./poster-images.service";

type PropertyRow = Database["public"]["Tables"]["properties"]["Row"];
type ListingRow = Database["public"]["Tables"]["property_listings"]["Row"];
type MediaRow = Pick<Database["public"]["Tables"]["property_media"]["Row"], "kind" | "ordinal" | "cached_url" | "remote_url">;

export type VitrinePosterDiagnostics = {
  errors: string[];
  warnings: string[];
};

export type VitrinePosterResult = VitrinePosterDiagnostics & {
  content: VitrinePosterContent;
  pdf: Buffer | null;
  fileName: string;
};

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

const loadPropertyBundle = async (propertyId: string) => {
  const [{ data: property, error: propertyError }, { data: listing, error: listingError }, { data: media, error: mediaError }] =
    await Promise.all([
      supabaseAdmin.from("properties").select("*").eq("id", propertyId).maybeSingle(),
      supabaseAdmin.from("property_listings").select("*").eq("property_id", propertyId).maybeSingle(),
      supabaseAdmin
        .from("property_media")
        .select("kind, ordinal, cached_url, remote_url")
        .eq("property_id", propertyId)
        .eq("kind", "image")
        .order("ordinal", { ascending: true }),
    ]);
  if (propertyError) throw new Error(propertyError.message);
  if (listingError) throw new Error(listingError.message);
  if (mediaError) throw new Error(mediaError.message);
  return {
    property: (property as PropertyRow | null) ?? null,
    listing: (listing as ListingRow | null) ?? null,
    media: ((media ?? []) as MediaRow[]).filter((row) => row.cached_url || row.remote_url),
  };
};

/**
 * Assemble les données, prépare les photos, rend le PDF A3.
 *
 * `force` : rend malgré des manques bloquants (aperçu de travail, filigrané).
 * Sans `force`, un manque bloquant renvoie `pdf: null` avec la liste des
 * erreurs, et aucune photo n'est téléchargée.
 */
export const buildVitrinePoster = async (input: {
  propertyId: string;
  force?: boolean;
}): Promise<VitrinePosterResult> => {
  const bundle = await loadPropertyBundle(input.propertyId);
  if (!bundle.property) {
    throw new Error("Bien introuvable.");
  }
  const { property, listing, media } = bundle;

  const built = buildVitrinePosterContent({
    property,
    listing: listing
      ? { price_amount: listing.price_amount, canonical_path: listing.canonical_path, business_type: listing.business_type }
      : null,
    // Même URL canonique que le SEO : le QR d'une affiche imprimée depuis une
    // preview doit pointer vers le site public, jamais vers la preview.
    siteUrl: SITE_URL,
  });
  const errors = [...built.errors];
  const warnings = [...built.warnings];

  if (media.length === 0) {
    errors.push("Aucune photo sur le bien.");
  } else if (media.length === 1) {
    warnings.push("Une seule photo : l'encart photo de la carte reprend la photo principale.");
  }

  const fileName = `fiche-vitrine-${slugify(built.content.locationLine) || property.id}.pdf`;

  if (errors.length > 0 && !input.force) {
    return { content: built.content, pdf: null, fileName, errors, warnings };
  }

  const [mainMedia, cardMedia] = [media[0] ?? null, media[1] ?? media[0] ?? null];
  const photoUrl = (row: MediaRow | null) => row?.cached_url ?? row?.remote_url ?? null;

  let mainPhoto: VitrinePosterImage | null = null;
  let cardPhoto: VitrinePosterImage | null = null;
  const mainUrl = photoUrl(mainMedia);
  const cardUrl = photoUrl(cardMedia);
  if (mainUrl) {
    const prepared = await preparePosterPhoto({ url: mainUrl, label: "Photo principale", slot: "main" });
    mainPhoto = prepared.image;
    if (prepared.warning) warnings.push(prepared.warning);
  }
  if (cardUrl) {
    const prepared = await preparePosterPhoto({ url: cardUrl, label: "Photo de la carte", slot: "card" });
    cardPhoto = prepared.image;
    if (prepared.warning) warnings.push(prepared.warning);
  }

  const logo = await loadPosterLogo();
  const qrModules = buildQrModules(built.content.qrUrl);

  const element = createElement(VitrinePosterDocument, {
    content: built.content,
    mainPhoto,
    cardPhoto,
    logo,
    qrModules,
    draftWatermark: errors.length > 0 ? "APERÇU · DONNÉES INCOMPLÈTES" : null,
  }) as unknown as ReactElement<DocumentProps>;
  const pdf = await renderToBuffer(element);

  return { content: built.content, pdf: Buffer.from(pdf), fileName, errors, warnings };
};
