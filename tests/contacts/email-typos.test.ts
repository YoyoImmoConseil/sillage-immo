import { describe, expect, it } from "vitest";
import { correctEmailDomainTypo, hasEmailDomainTypo } from "@/lib/contacts/email-typos";

describe("correctEmailDomainTypo", () => {
  it("corrige les TLD inexistants des grands fournisseurs", () => {
    expect(correctEmailDomainTypo("flobucur85@gmail.con")).toBe("flobucur85@gmail.com");
    expect(correctEmailDomainTypo("jean@hotmail.fe")).toBe("jean@hotmail.fr");
    expect(correctEmailDomainTypo("marie@orange.ft")).toBe("marie@orange.fr");
    expect(correctEmailDomainTypo("paul@icloud.con")).toBe("paul@icloud.com");
  });

  it("corrige les fautes de frappe dans le nom du fournisseur", () => {
    expect(correctEmailDomainTypo("a@gmial.com")).toBe("a@gmail.com");
    expect(correctEmailDomainTypo("a@hotmial.com")).toBe("a@hotmail.com");
    expect(correctEmailDomainTypo("a@wanado.fr")).toBe("a@wanadoo.fr");
  });

  it("est insensible à la casse du domaine et conserve la partie locale", () => {
    expect(correctEmailDomainTypo("Jean.Dupont@GMAIL.CON")).toBe("Jean.Dupont@gmail.com");
  });

  it("ne touche pas aux domaines réels, même rares", () => {
    for (const email of [
      "a@gmail.com",
      "a@orange.fr",
      "a@gmail.co.uk",
      "a@orange.com",
      "a@sillage-immo.com",
      "a@laposte.net",
      "a@proton.me",
    ]) {
      expect(correctEmailDomainTypo(email)).toBe(email);
    }
  });

  it("renvoie les valeurs invalides ou vides sans les casser", () => {
    expect(correctEmailDomainTypo("")).toBe("");
    expect(correctEmailDomainTypo("  pas-un-email ")).toBe("pas-un-email");
    expect(correctEmailDomainTypo("@gmail.con")).toBe("@gmail.con");
    expect(correctEmailDomainTypo("jean@")).toBe("jean@");
  });

  it("hasEmailDomainTypo signale uniquement les corrections effectives", () => {
    expect(hasEmailDomainTypo("a@gmail.con")).toBe(true);
    expect(hasEmailDomainTypo("a@gmail.com")).toBe(false);
  });
});
