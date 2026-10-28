import "server-only";
import { headers } from "next/headers";

import { SITE_URL } from "@/lib/seo/site";

/**
 * Domaine utilisé pour les liens que l'on suit réellement (QR, vCard, partage) :
 * en production, le site ; sur une preview Vercel ou en local, l'hôte de la
 * requête, pour que les tests avant merge n'envoient pas vers une page 404.
 * Les URL canoniques (metadata, JSON-LD) restent celles du site.
 */
export const getTeamCardBaseUrl = async (): Promise<string> => {
  if (process.env.VERCEL_ENV === "production") return SITE_URL;
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!host) return SITE_URL;
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
};
