import { describe, expect, it } from "vitest";
import { detectDevice, detectPlatform } from "@/lib/platform/detect";

const UA = {
  iphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  androidPhone:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
  androidTablet:
    "Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  ipadLegacy:
    "Mozilla/5.0 (iPad; CPU OS 15_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Mobile/15E148 Safari/604.1",
  ipadDesktopMode:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  windows:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  googlebotMobile:
    "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
} as const;

describe("detectPlatform", () => {
  it("range les téléphones sur leur plateforme tactile", () => {
    expect(detectPlatform(UA.iphone)).toBe("ios");
    expect(detectPlatform(UA.androidPhone)).toBe("android");
  });

  it("sert l'affichage ordinateur aux tablettes", () => {
    expect(detectPlatform(UA.ipadLegacy)).toBe("desktop");
    expect(detectPlatform(UA.androidTablet)).toBe("desktop");
  });

  it("traite l'iPad en mode bureau comme un Mac, ce qui donne le même résultat", () => {
    expect(detectPlatform(UA.ipadDesktopMode)).toBe("desktop");
    expect(detectPlatform(UA.ipadDesktopMode)).toBe(detectPlatform(UA.windows));
  });

  it("retombe sur l'affichage complet sans user-agent exploitable", () => {
    expect(detectPlatform(null)).toBe("desktop");
    expect(detectPlatform(undefined)).toBe("desktop");
    expect(detectPlatform("")).toBe("desktop");
    expect(detectPlatform("curl/8.4.0")).toBe("desktop");
  });

  it("suit le crawler mobile de Google sur la version mobile", () => {
    expect(detectPlatform(UA.googlebotMobile)).toBe("android");
  });
});

describe("detectDevice", () => {
  it("conserve l'OS et le format au-delà de la plateforme servie", () => {
    expect(detectDevice(UA.ipadLegacy)).toEqual({
      os: "ios",
      formFactor: "tablet",
      platform: "desktop",
    });
    expect(detectDevice(UA.iphone)).toEqual({
      os: "ios",
      formFactor: "phone",
      platform: "ios",
    });
    expect(detectDevice(UA.windows)).toEqual({
      os: "windows",
      formFactor: "desktop",
      platform: "desktop",
    });
  });
});
