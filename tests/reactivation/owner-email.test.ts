import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { renderOwnerReactivationEmail } from "@/lib/email/reactivation-owner";
import { resolveSender } from "@/lib/reactivation/model";

const links = {
  vendre: "https://sillage-immo.com/suivi/t?r=vendre",
  valeur: "https://sillage-immo.com/suivi/t?r=valeur",
  vendu: "https://sillage-immo.com/suivi/t?r=vendu",
  garde: "https://sillage-immo.com/suivi/t?r=garde",
  stop: "https://sillage-immo.com/suivi/t?r=stop",
};
const base = { links, bookingUrl: "https://calendar.app.google/x", quartiersUrl: "https://sillage-immo.com/quartiers" };

describe("mail de réactivation propriétaires", () => {
  it("J0 : objet selon la variante, pont, quatre boutons, réservation, désinscription", () => {
    const a = renderOwnerReactivationEmail({ ...base, step: 1, variant: "A", firstName: "Jean" });
    expect(a.subject).toBe("Ce que j'ignore encore de votre bien à Nice");
    expect(a.html).toContain("Bonjour Jean,");
    expect(a.html).toContain("j'ai fondé <strong>Sillage Immo</strong>");
    expect(a.html).toContain("Je remets mes dossiers à jour");
    for (const href of Object.values(links)) expect(a.html).toContain(href);
    expect(a.html).toContain("Réservez 15 minutes de visio avec moi");
    expect(a.text).toContain("Réservez 15 minutes de visio avec moi");
    expect(a.text).toContain("répondez simplement à ce message");
    expect(a.html).toContain("me désinscrire");
    expect(a.html).toContain("#141446");
    expect(a.html).not.toContain("{{");
    expect(a.text).toContain(links.vendre);
  });

  it("J0 variante B ajoute la phrase sur le quartier, C garde le texte de base", () => {
    const b = renderOwnerReactivationEmail({ ...base, step: 1, variant: "B", firstName: null });
    expect(b.subject).toBe("Votre quartier a bougé. Et votre bien ?");
    expect(b.html).toContain("Les prix de votre quartier ont évolué");
    expect(b.html).toContain("Bonjour,");
    const c = renderOwnerReactivationEmail({ ...base, step: 1, variant: "C", firstName: "Anne" });
    expect(c.subject).toBe("Je remets mes dossiers à jour, et le vôtre ?");
    expect(c.html).not.toContain("ont évolué");
  });

  it("sans page de réservation, pas de phrase « réservez »", () => {
    const a = renderOwnerReactivationEmail({ ...base, bookingUrl: null, step: 1, variant: "A", firstName: "Jean" });
    expect(a.html).not.toContain("Réservez 15 minutes");
    expect(a.text).not.toContain("Réservez 15 minutes");
  });

  it("J+7 et J+21 ont leurs propres objets et boutons", () => {
    const r = renderOwnerReactivationEmail({ ...base, step: 2, variant: "A", firstName: "Jean" });
    expect(r.subject).toBe("Un clic suffit");
    expect(r.html).toContain(links.vendre);
    const l = renderOwnerReactivationEmail({ ...base, step: 3, variant: "A", firstName: "Jean" });
    expect(l.subject).toBe("On classe votre dossier ?");
    expect(l.html).toContain("Gardez-moi dans votre veille de quartier");
    expect(l.html).toContain("Classez mon dossier");
    expect(l.html).not.toContain(links.vendre);
  });

  it("échappe le prénom", () => {
    const a = renderOwnerReactivationEmail({ ...base, step: 1, variant: "A", firstName: "<b>X</b>" });
    expect(a.html).not.toContain("<b>X</b>");
    expect(a.html).toContain("&lt;b&gt;X&lt;/b&gt;");
  });
});

describe("expéditeur par négociateur", () => {
  it("Jordan signe « Jordan S. » avec le pont équipe, Yoann « j'ai fondé »", () => {
    const j = renderOwnerReactivationEmail({ ...base, step: 1, variant: "A", firstName: "Jean", sender: resolveSender("jordan", {}) });
    expect(j.html).toContain("Jordan S.");
    expect(j.html).not.toContain("Saiman");
    expect(j.html).toContain("l'agence indépendante fondée par Yoann Uzzan");
    expect(j.text).toContain("Jordan S.");
    const y = renderOwnerReactivationEmail({ ...base, step: 1, variant: "A", firstName: "Jean" });
    expect(y.html).toContain("j'ai fondé <strong>Sillage Immo</strong>");
    expect(y.html).toContain("Yoann Uzzan");
  });
});
