import {
  DEFAULT_PLATFORM,
  type Platform,
  type PlatformFormFactor,
  type PlatformOs,
} from "./config";

export type DetectedDevice = {
  os: PlatformOs;
  formFactor: PlatformFormFactor;
  platform: Platform;
};

/**
 * Décision produit : une tablette est servie comme un ordinateur (grand écran,
 * contenu complet). Effet de bord bienvenu, l'iPad sous iPadOS 13+ annonce un
 * user-agent de Mac et reste indiscernable d'un Mac côté serveur : comme les
 * deux cas retombent sur "desktop", cette ambiguïté n'a aucune conséquence.
 *
 * Pour servir un jour les tablettes comme des mobiles, c'est la seule ligne à
 * changer.
 */
const toPlatform = (
  os: PlatformOs,
  formFactor: PlatformFormFactor
): Platform => {
  if (formFactor !== "phone") return "desktop";
  if (os === "ios" || os === "android") return os;
  return DEFAULT_PLATFORM;
};

const describe = (
  os: PlatformOs,
  formFactor: PlatformFormFactor
): DetectedDevice => ({ os, formFactor, platform: toPlatform(os, formFactor) });

/**
 * Analyse un user-agent. L'ordre des tests compte : un iPhone annonce
 * « like Mac OS X » et un iPad annonce « Mobile », donc les cas Apple les plus
 * spécifiques doivent être écartés avant les cas génériques.
 */
export const detectDevice = (
  userAgent: string | null | undefined
): DetectedDevice => {
  const ua = typeof userAgent === "string" ? userAgent : "";
  if (!ua) return describe("other", "desktop");

  if (/android/i.test(ua)) {
    // Android identifie ses téléphones par le jeton « Mobile » ; son absence
    // désigne une tablette (convention documentée par Google).
    return describe("android", /mobile/i.test(ua) ? "phone" : "tablet");
  }
  if (/iphone|ipod/i.test(ua)) return describe("ios", "phone");
  if (/ipad/i.test(ua)) return describe("ios", "tablet");
  if (/macintosh|mac os x/i.test(ua)) return describe("macos", "desktop");
  if (/windows nt/i.test(ua)) return describe("windows", "desktop");

  return describe("other", "desktop");
};

export const detectPlatform = (userAgent: string | null | undefined): Platform =>
  detectDevice(userAgent).platform;
