import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getReactivationContact = vi.fn();
const recordOwnerResponse = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: (url: string) => redirect(url) }));
vi.mock("next/link", () => ({ default: (props: Record<string, unknown>) => ({ type: "a", props }) }));
vi.mock("next/image", () => ({ default: (props: Record<string, unknown>) => ({ type: "img", props }) }));
vi.mock("@/services/reactivation/reactivation-followup.service", () => ({
  getReactivationContact: (...args: unknown[]) => getReactivationContact(...args),
  recordOwnerResponse: (...args: unknown[]) => recordOwnerResponse(...args),
}));

import { OwnerFollowupPage } from "@/app/suivi/[token]/owner-page";

const TOKEN = "jeton.signe";
const payload = { leadId: "11111111-1111-4111-8111-111111111111", campaign: "reac-proprietaires-2026-11", issuedAt: 1_793_979_456 };
const contact = {
  id: payload.leadId,
  campaign: payload.campaign,
  segment: "v1_proprietaire",
  fullName: "Patricia Fantoni",
  firstName: "Patricia",
  email: "patricia@example.test",
  phone: "+33600000000",
  status: "sent",
  response: null,
  negotiator: "Jordan Saiman",
};

type AnyElement = ReactElement<Record<string, unknown>>;

/** Tous les éléments de l'arbre renvoyé par le composant serveur (sans rendu DOM). */
const collect = (node: unknown, out: AnyElement[] = []): AnyElement[] => {
  if (Array.isArray(node)) {
    node.forEach((child) => collect(child, out));
  } else if (node && typeof node === "object" && "props" in node) {
    const element = node as AnyElement;
    out.push(element);
    collect(element.props.children, out);
  }
  return out;
};

type PostForm = { action: string; response: string | null; preview: boolean; label: string };

const postForms = (tree: unknown): PostForm[] =>
  collect(tree)
    .filter((el) => el.type === "form")
    .map((form) => {
      expect(form.props.method).toBe("post");
      const inputs = collect(form.props.children).filter((el) => el.type === "input");
      const button = collect(form.props.children).find((el) => el.type === "button");
      const field = (name: string) => inputs.find((el) => el.props.name === name)?.props.value as string | undefined;
      return {
        action: String(form.props.action),
        response: field("r") ?? null,
        preview: field("apercu") === "1",
        label: collect(button?.props.children).length ? JSON.stringify(button?.props.children) : String(button?.props.children ?? ""),
      };
    });

const getLinks = (tree: unknown): string[] =>
  collect(tree)
    .filter((el) => el.type === "a" || (typeof el.props.href === "string" && el.type !== "form"))
    .map((el) => String(el.props.href));

const eyebrowOf = (tree: unknown): string => {
  const view = collect(tree).find((el) => el.props.screen && typeof el.props.screen === "object");
  return String((view?.props.screen as { eyebrow: string } | undefined)?.eyebrow ?? "");
};

const render = (overrides: Partial<Parameters<typeof OwnerFollowupPage>[0]>) =>
  OwnerFollowupPage({ token: TOKEN, payload, response: "vendre", done: false, choose: false, ...overrides });

describe("/suivi/<jeton> — réactivation propriétaires : rien n'est écrit au GET", () => {
  beforeEach(() => {
    getReactivationContact.mockReset();
    recordOwnerResponse.mockReset();
    redirect.mockClear();
    getReactivationContact.mockResolvedValue(contact);
    vi.stubEnv("REACTIVATION_SENDER_JORDAN_BOOKING_URL", "https://calendar.app.google/jordan");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("GET ?r=vendre : écran de confirmation avec un seul bouton POST, aucun enregistrement", async () => {
    const tree = await render({ response: "vendre" });
    expect(recordOwnerResponse).not.toHaveBeenCalled();
    const forms = postForms(tree);
    expect(forms).toHaveLength(1);
    expect(forms[0]).toMatchObject({ action: `/suivi/${TOKEN}/confirm`, response: "vendre", preview: false });
    expect(forms[0].label).toContain("Oui, parlons-en");
    expect(getLinks(tree)).toContain(`/suivi/${TOKEN}?r=vendre&choose=1`);
    expect(eyebrowOf(tree)).not.toContain("APERÇU");
  });

  it.each([
    ["valeur", "Oui, je veux une estimation"],
    ["garde", "Oui, je le garde"],
    ["cherche", "Oui, je cherche"],
    ["vendu_cherche", "Oui, je cherche"],
    ["rappel", "Oui, qu'on m'appelle"],
    ["visio", "Oui, je choisis un créneau"],
    ["stop", "Oui, ne plus m'écrire"],
  ])("GET ?r=%s : confirmation POST « %s », sans écriture ni redirection", async (response, label) => {
    const tree = await render({ response });
    expect(recordOwnerResponse).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
    const forms = postForms(tree);
    expect(forms.map((form) => form.response)).toContain(response);
    expect(forms.find((form) => form.response === response)?.label).toContain(label);
  });

  it("GET ?r=vendu : confirmation avec le second choix « vendu et je cherche » (POST aussi)", async () => {
    const forms = postForms(await render({ response: "vendu" }));
    expect(forms.map((form) => form.response)).toEqual(["vendu", "vendu_cherche"]);
  });

  it("done=1 après vendre : le choix appel / visio / cherche en trois formulaires POST, rien n'est ré-enregistré", async () => {
    const tree = await render({ response: "vendre", done: true });
    expect(recordOwnerResponse).not.toHaveBeenCalled();
    const forms = postForms(tree);
    expect(forms.map((form) => form.response)).toEqual(["rappel", "visio", "cherche"]);
    forms.forEach((form) => expect(form.action).toBe(`/suivi/${TOKEN}/confirm`));
    // Plus aucun lien GET vers ?r=… qui écrirait.
    expect(getLinks(tree).filter((href) => href.includes("?r="))).toEqual([]);
  });

  it("done=1 après garde : « Je cherche un autre bien » est un formulaire POST", async () => {
    const forms = postForms(await render({ response: "garde", done: true }));
    expect(forms.map((form) => form.response)).toEqual(["cherche"]);
  });

  it("done=1 après visio : redirection vers le planning du négociateur, sans écriture", async () => {
    await expect(render({ response: "visio", done: true })).rejects.toThrow("REDIRECT:https://calendar.app.google/jordan");
    expect(recordOwnerResponse).not.toHaveBeenCalled();
  });

  it("aperçu : bandeau, formulaires porteurs du champ apercu, pas de redirection visio", async () => {
    const confirm = await render({ response: "vendre", preview: true });
    expect(eyebrowOf(confirm)).toContain("APERÇU");
    expect(postForms(confirm)).toEqual([expect.objectContaining({ response: "vendre", preview: true })]);
    expect(getLinks(confirm)).toContain(`/suivi/${TOKEN}?r=vendre&choose=1&apercu=1`);

    const next = await render({ response: "vendre", done: true, preview: true });
    expect(eyebrowOf(next)).toContain("APERÇU");
    expect(postForms(next).every((form) => form.preview)).toBe(true);

    const visio = await render({ response: "visio", done: true, preview: true });
    expect(redirect).not.toHaveBeenCalled();
    expect(getLinks(visio)).toContain("https://calendar.app.google/jordan");
    expect(recordOwnerResponse).not.toHaveBeenCalled();
  });

  it("choose=1 : les quatre choix en liens vers leurs écrans de confirmation, aucun formulaire", async () => {
    const tree = await render({ response: "vendre", choose: true });
    expect(postForms(tree)).toEqual([]);
    const links = getLinks(tree).filter((href) => href.includes("?r="));
    expect(links).toEqual(["vendre", "valeur", "vendu", "garde"].map((r) => `/suivi/${TOKEN}?r=${r}`));
    expect(recordOwnerResponse).not.toHaveBeenCalled();
  });

  it("réponse inconnue ou contact introuvable : écran « lien non valide », sans écriture", async () => {
    const unknown = await render({ response: "pirate" });
    expect(postForms(unknown)).toEqual([]);
    getReactivationContact.mockResolvedValueOnce(null);
    const missing = await render({ response: "vendre" });
    expect(postForms(missing)).toEqual([]);
    expect(recordOwnerResponse).not.toHaveBeenCalled();
  });
});
