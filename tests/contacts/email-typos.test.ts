import { describe, expect, it } from "vitest";
import { correctEmailDomainTypo, hasEmailDomainTypo } from "@/lib/contacts/email-typos";

describe("correctEmailDomainTypo", () => {
  it("corrige les extensions mal tapées de tous les fournisseurs connus", () => {
    expect(correctEmailDomainTypo("flobucur85@gmail.con")).toBe("flobucur85@gmail.com");
    expect(correctEmailDomainTypo("a@live.con")).toBe("a@live.com");
    expect(correctEmailDomainTypo("a@msn.cm")).toBe("a@msn.com");
    expect(correctEmailDomainTypo("a@ymail.comm")).toBe("a@ymail.com");
    expect(correctEmailDomainTypo("jean@hotmail.fe")).toBe("jean@hotmail.fr");
    expect(correctEmailDomainTypo("marie@orange.ft")).toBe("marie@orange.fr");
    expect(correctEmailDomainTypo("a@gmx.fe")).toBe("a@gmx.fr");
    expect(correctEmailDomainTypo("paul@icloud.con")).toBe("paul@icloud.com");
    expect(correctEmailDomainTypo("a@laposte.ne")).toBe("a@laposte.net");
    expect(correctEmailDomainTypo("a@proton.mr")).toBe("a@proton.me");
  });

  it("corrige les fautes de frappe dans le nom du fournisseur", () => {
    expect(correctEmailDomainTypo("a@gmial.com")).toBe("a@gmail.com");
    expect(correctEmailDomainTypo("a@hotmial.fr")).toBe("a@hotmail.fr");
    expect(correctEmailDomainTypo("a@wanado.fr")).toBe("a@wanadoo.fr");
    expect(correctEmailDomainTypo("a@ornage.fr")).toBe("a@orange.fr");
  });

  it("combine les deux corrections", () => {
    expect(correctEmailDomainTypo("a@gmial.con")).toBe("a@gmail.com");
    expect(correctEmailDomainTypo("a@hotmial.fe")).toBe("a@hotmail.fr");
  });

  it("ramène un fournisseur à extension unique vers sa seule extension réelle", () => {
    expect(correctEmailDomainTypo("a@gmail.fr")).toBe("a@gmail.com");
    expect(correctEmailDomainTypo("a@icloud.fr")).toBe("a@icloud.com");
    // orange.com et laposte.fr sont des domaines d'entreprise réels : intouchés.
    expect(correctEmailDomainTypo("a@orange.com")).toBe("a@orange.com");
    expect(correctEmailDomainTypo("a@laposte.fr")).toBe("a@laposte.fr");
  });

  it("ne corrige pas vers une extension que le fournisseur n'utilise pas", () => {
    // hotmail.fr existe : « hotmail.fe » → fr, mais « gmail.fe » → com (extension unique).
    expect(correctEmailDomainTypo("a@hotmail.fe")).toBe("a@hotmail.fr");
    expect(correctEmailDomainTypo("a@gmail.fe")).toBe("a@gmail.com");
  });

  it("est insensible à la casse du domaine et conserve la partie locale", () => {
    expect(correctEmailDomainTypo("Jean.Dupont@GMAIL.CON")).toBe("Jean.Dupont@gmail.com");
  });

  it("ne touche pas aux domaines réels, même rares, ni aux domaines inconnus", () => {
    for (const email of [
      "a@gmail.com",
      "a@orange.fr",
      "a@hotmail.co.uk",
      "a@live.fr",
      "a@sillage-immo.com",
      "a@laposte.net",
      "a@laposte.fr",
      "a@proton.me",
      "a@free.fr",
      "a@mairie-nice.fr",
      "a@societe.con",
    ]) {
      expect(correctEmailDomainTypo(email)).toBe(email);
    }
  });

  it("renvoie les valeurs invalides ou vides sans les casser", () => {
    expect(correctEmailDomainTypo("")).toBe("");
    expect(correctEmailDomainTypo("  pas-un-email ")).toBe("pas-un-email");
    expect(correctEmailDomainTypo("@gmail.con")).toBe("@gmail.con");
    expect(correctEmailDomainTypo("jean@")).toBe("jean@");
    expect(correctEmailDomainTypo("jean@gmail")).toBe("jean@gmail");
  });

  it("hasEmailDomainTypo signale uniquement les corrections effectives", () => {
    expect(hasEmailDomainTypo("a@gmail.con")).toBe(true);
    expect(hasEmailDomainTypo("a@gmail.com")).toBe(false);
  });
});
