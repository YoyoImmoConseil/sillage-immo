import { describe, expect, it } from "vitest";

import {
  buildTeamCardUrl,
  buildTeamVCard,
  buildVCardFileName,
  buildWhatsAppUrl,
  escapeVCardText,
  foldVCardLine,
  formatPhoneDisplay,
  normalizePhoneE164,
  slugifyFirstName,
} from "@/lib/team/card";
import { buildTeamCardJsonLd } from "@/lib/team/card-jsonld";

describe("slugifyFirstName", () => {
  it("retire accents, majuscules et espaces", () => {
    expect(slugifyFirstName("Jean-Édouard")).toBe("jean-edouard");
    expect(slugifyFirstName("  Maÿlis ")).toBe("maylis");
    expect(slugifyFirstName("Yoann")).toBe("yoann");
  });
  it("retourne null sans caractère exploitable", () => {
    expect(slugifyFirstName("")).toBeNull();
    expect(slugifyFirstName("   ")).toBeNull();
    expect(slugifyFirstName(null)).toBeNull();
  });
});

describe("normalizePhoneE164", () => {
  it("convertit les formats français courants", () => {
    expect(normalizePhoneE164("06 09 95 12 84")).toBe("+33609951284");
    expect(normalizePhoneE164("0609951284")).toBe("+33609951284");
    expect(normalizePhoneE164("+33 6 09 95 12 84")).toBe("+33609951284");
    expect(normalizePhoneE164("0033609951284")).toBe("+33609951284");
    expect(normalizePhoneE164("+33 (0)4 23 45 04 85")).toBe("+33423450485");
  });
  it("rejette les numéros inexploitables", () => {
    expect(normalizePhoneE164("12 34")).toBeNull();
    expect(normalizePhoneE164("appelez-moi")).toBeNull();
    expect(normalizePhoneE164(null)).toBeNull();
  });
  it("affiche un mobile français par paires", () => {
    expect(formatPhoneDisplay("+33609951284")).toBe("06 09 95 12 84");
    expect(formatPhoneDisplay("+447700900123")).toBe("+447700900123");
  });
  it("construit le lien WhatsApp sans le +", () => {
    expect(buildWhatsAppUrl("+33609951284")).toBe("https://wa.me/33609951284");
  });
});

describe("buildTeamCardUrl", () => {
  it("ajoute les utm selon le support", () => {
    expect(buildTeamCardUrl("yoann")).toBe("https://sillage-immo.com/equipe/yoann");
    expect(buildTeamCardUrl("yoann", "qr")).toBe(
      "https://sillage-immo.com/equipe/yoann?utm_source=qr&utm_medium=card&utm_campaign=carte-visite"
    );
    expect(buildTeamCardUrl("yoann", "qr", "screen")).toBe(
      "https://sillage-immo.com/equipe/yoann?utm_source=qr&utm_medium=screen&utm_campaign=carte-visite"
    );
    expect(buildTeamCardUrl("yoann", "share", "screen", "https://preview.vercel.app/")).toBe(
      "https://preview.vercel.app/equipe/yoann?utm_source=share&utm_medium=screen&utm_campaign=carte-visite"
    );
  });
});

describe("vCard", () => {
  it("échappe les caractères réservés", () => {
    expect(escapeVCardText("Uzzan; Nice, 06\nSuite")).toBe("Uzzan\\; Nice\\, 06\\nSuite");
  });
  it("plie les lignes longues à 75 octets sans couper les accents", () => {
    const folded = foldVCardLine(`NOTE:${"é".repeat(60)}`);
    const lines = folded.split("\r\n");
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    expect(lines.slice(1).every((line) => line.startsWith(" "))).toBe(true);
    expect(folded.replace(/\r\n /g, "")).toBe(`NOTE:${"é".repeat(60)}`);
  });
  it("produit une vCard 3.0 complète en CRLF", () => {
    const vcard = buildTeamVCard({
      firstName: "Yoann",
      lastName: "Uzzan",
      title: "Directeur",
      email: "yu@sillage-immo.com",
      phone: "+33609951284",
      whatsappPhone: "+33609951284",
      cardUrl: "https://sillage-immo.com/equipe/yoann?utm_source=vcard&utm_medium=card&utm_campaign=carte-visite",
      photoBase64: "AAAA",
      revision: new Date("2026-10-28T09:00:00Z"),
    });
    expect(vcard.startsWith("BEGIN:VCARD\r\nVERSION:3.0\r\n")).toBe(true);
    expect(vcard.endsWith("END:VCARD\r\n")).toBe(true);
    expect(vcard).toContain("N:Uzzan;Yoann;;;");
    expect(vcard).toContain("FN:Yoann Uzzan");
    expect(vcard).toContain("ORG:Sillage Immo");
    expect(vcard).toContain("TITLE:Directeur");
    expect(vcard).toContain("TEL;TYPE=CELL,VOICE,pref:+33609951284");
    expect(vcard).not.toContain("TEL;TYPE=CELL,VOICE:+33609951284"); // WhatsApp identique : pas de doublon
    expect(vcard).toContain("EMAIL;TYPE=INTERNET,WORK,pref:yu@sillage-immo.com");
    expect(vcard).toContain("ADR;TYPE=WORK:;;35 rue Arson;Nice;;06300;France");
    expect(vcard).toContain("URL;TYPE=WORK:https://sillage-immo.com");
    expect(vcard).toContain("X-SOCIALPROFILE;TYPE=instagram:https://www.instagram.com/sillage.immo/");
    expect(vcard).toContain("PHOTO;ENCODING=b;TYPE=JPEG:AAAA");
    expect(vcard).toContain("REV:2026-10-28T09:00:00Z");
    expect(vcard.replace(/\r\n/g, "")).not.toContain("\n");
  });
  it("ajoute un second numéro quand WhatsApp diffère et omet la photo absente", () => {
    const vcard = buildTeamVCard({
      firstName: "Laura",
      lastName: "Zeisser",
      title: null,
      email: "laura@sillage-immo.com",
      phone: "+33600000001",
      whatsappPhone: "+33600000002",
      cardUrl: "https://sillage-immo.com/equipe/laura",
    });
    expect(vcard).toContain("TEL;TYPE=CELL,VOICE,pref:+33600000001");
    expect(vcard).toContain("TEL;TYPE=CELL,VOICE:+33600000002");
    expect(vcard).not.toContain("TITLE:");
    expect(vcard).not.toContain("PHOTO;");
  });
  it("nomme le fichier en ASCII", () => {
    expect(buildVCardFileName("Jean-Édouard", "Dürr")).toBe("jean-edouard-durr-sillage-immo.vcf");
  });
});

describe("buildTeamCardJsonLd", () => {
  it("rattache la personne à l'agence et omet les champs vides", () => {
    const jsonLd = buildTeamCardJsonLd({
      cardUrl: "https://sillage-immo.com/equipe/laura",
      firstName: "Laura",
      lastName: "Zeisser",
      fullName: "Laura Zeisser",
      jobTitle: null,
      email: "laura@sillage-immo.com",
      phoneE164: null,
      imageUrl: null,
    });
    expect(jsonLd["@type"]).toBe("Person");
    expect(jsonLd.worksFor["@id"]).toBe("https://sillage-immo.com/#organization");
    expect("telephone" in jsonLd).toBe(false);
    expect("jobTitle" in jsonLd).toBe(false);
    expect("image" in jsonLd).toBe(false);
  });
});
