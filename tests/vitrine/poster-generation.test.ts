import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * « Imprimer la fiche vitrine » : rien n'est déposé ni envoyé quand une donnée
 * obligatoire manque ; sinon dépôt dans le bucket, trace en base, mail avec
 * pièce jointe + lien 7 jours ; un mail en échec n'annule pas la génération.
 */

vi.mock("server-only", () => ({}));

const state = vi.hoisted(() => ({
  uploads: [] as Array<{ path: string; size: number; options: Record<string, unknown> }>,
  inserts: [] as Array<Record<string, unknown>>,
  updates: [] as Array<Record<string, unknown>>,
  signed: [] as Array<{ path: string; ttl: number }>,
  emails: [] as Array<Record<string, unknown>>,
  buildResult: null as null | { pdf: Buffer | null; errors: string[]; warnings: string[]; content: Record<string, unknown>; fileName: string },
  emailBehaviour: "ok" as "ok" | "throw" | "not_configured",
}));

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string, body: Buffer, options: Record<string, unknown>) => {
          state.uploads.push({ path: `${bucket}/${path}`, size: body.length, options });
          return { error: null };
        },
        createSignedUrl: async (path: string, ttl: number) => {
          state.signed.push({ path, ttl });
          return { data: { signedUrl: `https://signed.test/${path}?ttl=${ttl}` }, error: null };
        },
      }),
    },
    from: () => ({
      insert: (row: Record<string, unknown>) => {
        state.inserts.push(row);
        return { select: () => ({ single: async () => ({ data: { id: "poster-1" }, error: null }) }) };
      },
      update: (patch: Record<string, unknown>) => {
        state.updates.push(patch);
        return { eq: async () => ({ error: null }) };
      },
    }),
  },
}));

vi.mock("@/services/vitrine/poster.service", () => ({
  buildVitrinePoster: async () => state.buildResult,
}));

vi.mock("@/lib/email/vitrine-poster", () => ({
  sendVitrinePosterEmail: async (input: Record<string, unknown>) => {
    state.emails.push(input);
    if (state.emailBehaviour === "throw") throw new Error("Resend email failed: boom");
    if (state.emailBehaviour === "not_configured") return { sent: false as const, reason: "email_not_configured" as const };
    return { sent: true as const, provider: "resend" as const };
  },
}));

import { generateVitrinePoster, VITRINE_EMAIL_LINK_TTL_SECONDS } from "@/services/vitrine/poster-generation.service";

const content = { locationLine: "NICE · ÉGLISE RUSSE", priceLine: "195 000 €" };
const requester = { email: "yu@sillage-immo.com", firstName: "Yoann" };

beforeEach(() => {
  state.uploads.length = 0;
  state.inserts.length = 0;
  state.updates.length = 0;
  state.signed.length = 0;
  state.emails.length = 0;
  state.emailBehaviour = "ok";
  state.buildResult = {
    pdf: Buffer.alloc(2048, 1),
    errors: [],
    warnings: ["Photo de la carte : définition faible"],
    content,
    fileName: "fiche-vitrine-nice-eglise-russe-06000.pdf",
  };
});

describe("generateVitrinePoster", () => {
  it("refuse sans rien déposer ni envoyer quand une donnée obligatoire manque", async () => {
    state.buildResult = { pdf: null, errors: ["Copropriété : charges courantes annuelles absentes dans SweepBright."], warnings: [], content, fileName: "x.pdf" };
    const result = await generateVitrinePoster({ propertyId: "prop-1", requester });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toHaveLength(1);
    expect(state.uploads).toHaveLength(0);
    expect(state.inserts).toHaveLength(0);
    expect(state.emails).toHaveLength(0);
  });

  it("dépose le PDF, trace la génération et envoie le mail avec pièce jointe et lien 7 jours", async () => {
    const result = await generateVitrinePoster({ propertyId: "prop-1", requester });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(state.uploads).toHaveLength(1);
    expect(state.uploads[0].path).toMatch(/^vitrine-posters\/properties\/prop-1\/.+\.pdf$/);
    expect(state.uploads[0].options).toMatchObject({ contentType: "application/pdf", upsert: false });

    expect(state.inserts).toHaveLength(1);
    expect(state.inserts[0]).toMatchObject({
      property_id: "prop-1",
      file_name: "fiche-vitrine-nice-eglise-russe-06000.pdf",
      file_size: 2048,
      generated_by: "yu@sillage-immo.com",
      warnings: ["Photo de la carte : définition faible"],
    });
    expect((state.inserts[0].content as Record<string, unknown>).priceLine).toBe("195 000 €");

    expect(state.signed[0].ttl).toBe(VITRINE_EMAIL_LINK_TTL_SECONDS);
    expect(result.downloadUrl).toContain("signed.test");

    expect(state.emails).toHaveLength(1);
    expect(state.emails[0]).toMatchObject({
      to: "yu@sillage-immo.com",
      firstName: "Yoann",
      propertyLabel: "NICE · ÉGLISE RUSSE",
      priceLine: "195 000 €",
      downloadUrl: result.downloadUrl,
    });
    expect((state.emails[0].attachment as { filename: string }).filename).toBe("fiche-vitrine-nice-eglise-russe-06000.pdf");
    expect(result.email).toEqual({ sent: true, to: "yu@sillage-immo.com", attached: true });
    expect(state.updates[0]).toEqual({ email_sent_to: "yu@sillage-immo.com" });
  });

  it("garde le PDF et le lien quand le mail échoue, et note l'erreur", async () => {
    state.emailBehaviour = "throw";
    const result = await generateVitrinePoster({ propertyId: "prop-1", requester });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.email).toEqual({ sent: false, to: "yu@sillage-immo.com", reason: "Resend email failed: boom" });
    expect(state.updates[0]).toEqual({ email_error: "Resend email failed: boom" });
    expect(state.uploads).toHaveLength(1);
  });

  it("n'envoie pas de mail quand sendEmail est faux", async () => {
    const result = await generateVitrinePoster({ propertyId: "prop-1", requester, sendEmail: false });
    expect(result.ok).toBe(true);
    expect(state.emails).toHaveLength(0);
    expect(state.updates).toHaveLength(0);
  });

  it("joint le PDF seulement sous le plafond de pièce jointe", async () => {
    state.buildResult = { ...state.buildResult!, pdf: Buffer.alloc(16 * 1024 * 1024, 1) };
    const result = await generateVitrinePoster({ propertyId: "prop-1", requester });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(state.emails[0].attachment).toBeNull();
    expect(result.email).toEqual({ sent: true, to: "yu@sillage-immo.com", attached: false });
  });
});
