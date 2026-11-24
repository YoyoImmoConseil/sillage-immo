import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;
const state: { rows: Row[]; ranges: Array<[number, number]> } = { rows: [], ranges: [] };

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table !== "reactivation_contacts") throw new Error(`table inattendue : ${table}`);
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              range: async (from: number, to: number) => {
                state.ranges.push([from, to]);
                return { data: state.rows.slice(from, to + 1), error: null };
              },
            }),
          }),
        }),
      };
    },
  },
}));
vi.mock("@/lib/email/smtp", () => ({ sendTransactionalEmail: vi.fn() }));
vi.mock("@/services/reactivation/reactivation-import.service", () => ({
  excludedEmailFragments: () => [],
  excludedNamePatterns: () => [],
}));
vi.mock("@/services/reactivation/protected-contacts.service", () => ({
  assertProtectionFresh: vi.fn(),
  loadProtectionIndex: vi.fn(),
}));
vi.mock("@/services/reactivation/reactivation-followup.service", () => ({ buildOwnerLinks: vi.fn() }));

import { getReactivationStats } from "@/services/reactivation/reactivation-send.service";

const CAMPAIGN = "reac-proprietaires-2026-11";

const contact = (index: number, overrides: Row = {}): Row => ({
  id: `id-${String(index).padStart(5, "0")}`,
  full_name: `Contact ${index}`,
  email: `contact${index}@example.com`,
  phone: null,
  segment: "v1_proprietaire",
  status: "pending",
  sequence_step: 0,
  subject_variant: null,
  response: null,
  responded_at: null,
  seller_lead_id: null,
  negotiator: "Yoann Uzzan",
  ...overrides,
});

/** 1 060 fiches (deux pages de lecture), dont 60 réponses : plus que l'ancienne limite de 50. */
const seed = () => {
  const rows: Row[] = [];
  for (let index = 0; index < 1060; index += 1) {
    if (index % 17 === 0 && rows.filter((row) => row.responded_at).length < 60) {
      const answered = rows.filter((row) => row.responded_at).length;
      const stop = answered % 3 === 0;
      rows.push(
        contact(index, {
          status: stop ? "unsubscribed" : "responded",
          sequence_step: 1,
          subject_variant: "A",
          response: stop ? "stop" : answered % 3 === 1 ? "vendre" : "garde",
          // Dates volontairement dans le désordre par rapport à l'ordre de lecture (tri par id).
          responded_at: new Date(Date.UTC(2026, 10, 1 + ((answered * 7) % 20), 9, answered)).toISOString(),
          seller_lead_id: !stop && answered % 3 === 1 ? `lead-${answered}` : null,
          negotiator: answered % 2 === 0 ? "Jordan Saiman" : "Yoann Uzzan",
        })
      );
    } else {
      rows.push(contact(index));
    }
  }
  return rows;
};

describe("getReactivationStats", () => {
  beforeEach(() => {
    state.rows = seed();
    state.ranges = [];
  });

  it("lit toutes les fiches, page par page", async () => {
    const stats = await getReactivationStats(CAMPAIGN);
    expect(state.ranges).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
    expect(stats.campaign).toBe(CAMPAIGN);
    expect(stats.total).toBe(1060);
  });

  it("renvoie toutes les réponses dans allResponses, de la plus récente à la plus ancienne", async () => {
    const stats = await getReactivationStats(CAMPAIGN);
    expect(stats.allResponses).toHaveLength(60);
    expect("recentResponses" in stats).toBe(false);

    const dates = stats.allResponses.map((row) => row.respondedAt ?? "");
    expect(dates.every(Boolean)).toBe(true);
    expect(dates).toEqual([...dates].sort((a, b) => b.localeCompare(a)));

    const expectedIds = state.rows
      .filter((row) => row.responded_at)
      .sort((a, b) => String(b.responded_at).localeCompare(String(a.responded_at)))
      .map((row) => row.id);
    expect(stats.allResponses.map((row) => row.id)).toEqual(expectedIds);
  });

  it("garde la forme des lignes et y ajoute le statut", async () => {
    state.rows = [
      contact(1),
      contact(2, {
        full_name: "  ",
        phone: "0600000000",
        status: "unsubscribed",
        sequence_step: 1,
        subject_variant: "B",
        response: "stop",
        responded_at: "2026-11-10T08:00:00.000Z",
        negotiator: null,
      }),
      contact(3, {
        status: "responded",
        sequence_step: 2,
        subject_variant: "C",
        response: "vendre",
        responded_at: "2026-11-12T08:00:00.000Z",
        seller_lead_id: "lead-3",
        negotiator: "Jordan Saiman",
      }),
    ];
    const stats = await getReactivationStats(CAMPAIGN);
    expect(stats.allResponses).toEqual([
      {
        id: "id-00003",
        fullName: "Contact 3",
        email: "contact3@example.com",
        phone: null,
        segment: "v1_proprietaire",
        status: "responded",
        response: "vendre",
        respondedAt: "2026-11-12T08:00:00.000Z",
        sellerLeadId: "lead-3",
        negotiator: "Jordan Saiman",
      },
      {
        id: "id-00002",
        // Nom vide : on affiche l'adresse.
        fullName: "contact2@example.com",
        email: "contact2@example.com",
        phone: "0600000000",
        segment: "v1_proprietaire",
        status: "unsubscribed",
        response: "stop",
        respondedAt: "2026-11-10T08:00:00.000Z",
        sellerLeadId: null,
        negotiator: null,
      },
    ]);
  });

  it("ne change pas les compteurs par réponse ni par statut", async () => {
    const stats = await getReactivationStats(CAMPAIGN);
    expect(stats.byResponse).toEqual({ stop: 20, vendre: 20, garde: 20 });
    expect(stats.byStatus).toEqual({ pending: 1000, unsubscribed: 20, responded: 40 });
    expect(stats.byVariantResponded).toEqual({ A: 60 });
  });
});
