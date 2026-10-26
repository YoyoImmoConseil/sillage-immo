import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { renderBuyerAlertEmail, renderBuyerPriceDropEmail } from "@/lib/email/buyer-alert";

process.env.PUBLIC_SITE_URL = "https://sillage-immo.com";

const base = {
  to: "lenara@example.com",
  locale: "fr" as const,
  firstName: "Lenara",
  searchLabel: "Achat · Nice",
  searchUrl: "https://sillage-immo.com/espace-client/recherches/abc",
  unsubscribeUrl: "https://sillage-immo.com/api/buyer-searches/unsubscribe?projectId=abc&token=t",
};

const musiciens = {
  title: "NICE MUSICIENS – SUPERBE 5 PIÈCES BELLE ÉPOQUE",
  city: "Nice",
  propertyType: "apartment",
  priceAmount: 635000,
  canonicalPath: "/06000/b5519406",
  coverImageUrl: "https://zqozducphdvqjrodozvq.supabase.co/storage/v1/object/public/property-media-cache/sweepbright/x.jpg",
};

describe("alerte acquéreur — carte du bien", () => {
  it("affiche la photo principale en vignette, cliquable vers le bien", () => {
    const { html } = renderBuyerAlertEmail({ ...base, matches: [musiciens] });
    // Servie par l'optimiseur d'images du site, pas l'original de 1 à 2 Mo.
    expect(html).toContain(`<img src="https://sillage-immo.com/_next/image?url=${encodeURIComponent(musiciens.coverImageUrl)}&amp;w=1200&amp;q=75"`);
    expect(html).toMatch(/<a href="https:\/\/sillage-immo\.com\/06000\/b5519406"[^>]*>\s*<img/);
    expect(html).toContain("width=\"560\" height=\"315\"");
  });

  it("sans photo, la carte reste la même sans image ; une URL non https est ignorée", () => {
    const { html } = renderBuyerAlertEmail({ ...base, matches: [{ ...musiciens, coverImageUrl: null }] });
    expect(html).not.toContain("<img");
    const unsafe = renderBuyerAlertEmail({ ...base, matches: [{ ...musiciens, coverImageUrl: "javascript:alert(1)" }] });
    expect(unsafe.html).not.toContain("<img");
  });

  it("type de bien traduit (« Appartement », pas « apartment »), prix en euros, texte brut cohérent", () => {
    const { html, text, subject } = renderBuyerAlertEmail({ ...base, matches: [musiciens] });
    expect(html).toContain("Nice · Appartement");
    expect(html).not.toContain("· apartment");
    expect(text).toContain("Nice · Appartement");
    expect(text).toContain("635");
    expect(subject.length).toBeGreaterThan(10);
  });

  it("plusieurs biens : une carte par bien, dans l'ordre", () => {
    const { html } = renderBuyerAlertEmail({
      ...base,
      matches: [musiciens, { ...musiciens, title: "NICE PORT – 3 PIÈCES", canonicalPath: "/06300/6eb9b251", coverImageUrl: null }],
    });
    expect(html.indexOf("MUSICIENS")).toBeLessThan(html.indexOf("NICE PORT"));
    expect((html.match(/<img /g) ?? []).length).toBe(1);
  });
});

describe("mail « Nouveau prix »", () => {
  it("ancien prix barré, nouveau prix, photo, lien vers le bien", () => {
    const { subject, html, text } = renderBuyerPriceDropEmail({
      ...base,
      match: { ...musiciens, priceAmount: 188000, previousPriceAmount: 195000 },
    });
    expect(subject).toBe("Nouveau prix : NICE MUSICIENS – SUPERBE 5 PIÈCES BELLE ÉPOQUE");
    expect(html).toMatch(/line-through;">195[\s\u00a0\u202f]*000 €<\/span>/);
    expect(html).toMatch(/188[\s\u00a0\u202f]*000 €<\/p>/);
    expect(html).toContain("<img src=");
    expect(html).toContain("vient de passer de");
    expect(text).toContain("→");
  });

  it("le mail d'alerte classique n'affiche jamais de prix barré", () => {
    const { html } = renderBuyerAlertEmail({ ...base, matches: [musiciens] });
    expect(html).not.toContain("line-through");
  });
});
