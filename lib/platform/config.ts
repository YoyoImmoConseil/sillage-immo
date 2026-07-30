/**
 * Plateformes distinguées au moment du rendu. Volontairement limité à trois
 * cas : les deux surfaces tactiles téléphone, qui reçoivent un affichage
 * orienté conversion, et tout le reste, qui reçoit l'affichage complet.
 *
 * À ne pas confondre avec les breakpoints Tailwind : `md:` décrit la largeur
 * disponible, `platform` décrit l'appareil qui se connecte.
 */
export type Platform = "ios" | "android" | "desktop";

/** Système détecté, conservé pour les contournements spécifiques à un OS. */
export type PlatformOs = "ios" | "android" | "macos" | "windows" | "other";

export type PlatformFormFactor = "phone" | "tablet" | "desktop";

/** Retenu quand le user-agent est absent ou inconnu : on sert l'affichage complet. */
export const DEFAULT_PLATFORM: Platform = "desktop";

/**
 * En-tête posé par `proxy.ts` sur la requête transmise, puis relu par
 * `getRequestPlatform()`. Même convention que `x-sillage-locale`.
 */
export const PLATFORM_HEADER_NAME = "x-sillage-platform";

const PLATFORMS = new Set<string>(["ios", "android", "desktop"]);

export const isPlatform = (
  value: string | null | undefined
): value is Platform => typeof value === "string" && PLATFORMS.has(value);
