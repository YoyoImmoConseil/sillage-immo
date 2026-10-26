import { describe, expect, it, vi } from "vitest";

/**
 * Contrat « fiche vitrine » : les champs éditoriaux saisis à la main
 * (`vitrine_*`) ne doivent jamais être touchés par la synchronisation
 * SweepBright, et inversement l'enregistrement de la fiche vitrine ne doit
 * écrire que ces colonnes-là (jamais `updated_at` / `last_synced_at`, qui
 * appartiennent à la synchronisation).
 *
 * L'upsert PostgREST ne met à jour que les colonnes présentes dans le payload :
 * verrouiller la liste des clés produites par le mapper suffit donc à garantir
 * qu'une resynchronisation n'efface pas ce qui a été saisi.
 */

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env/server", () => ({ serverEnv: {} }));
vi.mock("@/lib/cache/revalidate", () => ({ revalidatePublicListings: vi.fn() }));
vi.mock("@/services/properties/sweepbright-client.service", () => ({ sweepBrightClient: {} }));
vi.mock("@/services/properties/sweepbright-media-cache.service", () => ({ cacheSweepBrightMedia: vi.fn() }));
vi.mock("@/services/buyers/buyer-matching.service", () => ({ recomputeMatchesForProperty: vi.fn() }));
vi.mock("@/services/buyers/buyer-alert.service", () => ({ processBuyerAlerts: vi.fn() }));
vi.mock("@/services/contacts/contact-identity.service", () => ({ ensureContactIdentity: vi.fn() }));
vi.mock("@/services/properties/sweepbright-history.service", () => ({
  readSweepBrightProjectionSnapshot: vi.fn(),
  recordSweepBrightDeletionHistory: vi.fn(),
  recordSweepBrightHistory: vi.fn(),
}));
vi.mock("@/lib/ai/openai", () => ({ callOpenAiChat: vi.fn(), UTILITY_CHAT_MODEL: "test" }));

const db = vi.hoisted(() => ({
  updates: [] as Array<{ table: string; patch: Record<string, unknown> }>,
}));

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      update: (patch: Record<string, unknown>) => {
        db.updates.push({ table, patch });
        return {
          eq: () => ({
            select: () => ({
              maybeSingle: async () => ({
                data: {
                  vitrine_highlights: patch.vitrine_highlights,
                  vitrine_quartier: patch.vitrine_quartier,
                  vitrine_updated_at: patch.vitrine_updated_at,
                  vitrine_updated_by: patch.vitrine_updated_by,
                },
                error: null,
              }),
            }),
          }),
        };
      },
    }),
  },
}));

import { mapEstateToPropertyInsert } from "@/services/properties/sweepbright-sync.service";
import { saveVitrineEditorial, VitrineValidationError } from "@/services/properties/vitrine.service";
import type { SweepBrightEstateData } from "@/types/api/sweepbright";

const estate = {
  id: "estate-1",
  type: "apartment",
  status: "available",
  negotiation: "sale",
  description_title: { fr: "NICE – Église Russe – Appartement 3 pièces" },
  location: { city: "Nice", postal_code: "06000" },
} as unknown as SweepBrightEstateData;

describe("contrat fiche vitrine ↔ synchronisation SweepBright", () => {
  it("le mapper SweepBright ne produit aucune colonne vitrine_*", () => {
    const payload = mapEstateToPropertyInsert(estate) as Record<string, unknown>;
    const vitrineKeys = Object.keys(payload).filter((key) => key.startsWith("vitrine_"));
    expect(vitrineKeys).toEqual([]);
    expect(payload).not.toHaveProperty("vitrine_highlights");
    expect(payload).not.toHaveProperty("vitrine_quartier");
  });

  it("l'enregistrement de la fiche vitrine n'écrit que les colonnes vitrine_*", async () => {
    db.updates.length = 0;
    const result = await saveVitrineEditorial({
      propertyId: "prop-1",
      highlights: [" Vue mer panoramique ", "Terrasse plein sud", "", "Cave et parking"],
      quartier: " Église Russe ",
      updatedBy: "yu@sillage-immo.com",
    });

    expect(db.updates).toHaveLength(1);
    expect(db.updates[0].table).toBe("properties");
    expect(Object.keys(db.updates[0].patch).sort()).toEqual([
      "vitrine_card_media_ref",
      "vitrine_highlights",
      "vitrine_main_media_ref",
      "vitrine_quartier",
      "vitrine_updated_at",
      "vitrine_updated_by",
    ]);
    expect(result.highlights).toEqual(["Vue mer panoramique", "Terrasse plein sud", "Cave et parking"]);
    expect(result.quartier).toBe("Église Russe");
    expect(result.updatedBy).toBe("yu@sillage-immo.com");
  });

  it("refuse une saisie invalide sans rien écrire", async () => {
    db.updates.length = 0;
    await expect(
      saveVitrineEditorial({
        propertyId: "prop-1",
        highlights: ["Une seule ligne beaucoup trop longue pour l'affiche", "b"],
        quartier: null,
        updatedBy: null,
      })
    ).rejects.toBeInstanceOf(VitrineValidationError);
    expect(db.updates).toHaveLength(0);
  });
});
