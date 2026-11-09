import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;
const state: { row: Row | null; updates: Row[]; inserts: Row[] } = { row: null, updates: [], inserts: [] };

const sendTransactionalEmail = vi.fn(async () => ({ sent: true }));
const sendSweepBrightOwnerLead = vi.fn(async () => ({ ok: true }));
const createSellerLead = vi.fn(async () => ({ status: "created", sellerLeadId: "lead-0001" }));
const pushReactivationWebhook = vi.fn<(input: Record<string, unknown>) => Promise<void>>(async () => undefined);

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === "reactivation_contacts") {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.row, error: null }) }) }),
          update: (patch: Row) => ({
            eq: async () => {
              state.updates.push(patch);
              state.row = { ...(state.row ?? {}), ...patch };
              return { error: null };
            },
          }),
        };
      }
      if (table === "activity_events") {
        return {
          insert: async (payload: Row) => {
            state.inserts.push(payload);
            return { error: null };
          },
        };
      }
      throw new Error(`table inattendue : ${table}`);
    },
  },
}));
vi.mock("@/lib/email/smtp", () => ({ sendTransactionalEmail: (...args: unknown[]) => sendTransactionalEmail(...(args as [])) }));
vi.mock("@/services/properties/sweepbright-leads.service", () => ({
  sendSweepBrightOwnerLead: (...args: unknown[]) => sendSweepBrightOwnerLead(...(args as [])),
}));
vi.mock("@/services/sellers/seller-lead.service", () => ({ createSellerLead: (...args: unknown[]) => createSellerLead(...(args as [])) }));
vi.mock("@/services/buyers/buyer-followup.service", () => ({ getFollowupSecret: () => "secret-de-test" }));
vi.mock("@/lib/reactivation/webhook", () => ({
  pushReactivationWebhook: (input: Record<string, unknown>) => pushReactivationWebhook(input),
}));

import { recordOwnerResponse } from "@/services/reactivation/reactivation-followup.service";

const payload = { leadId: "11111111-1111-4111-8111-111111111111", campaign: "reac-proprietaires-2026-11", issuedAt: 1_793_979_456 };

const freshRow = (): Row => ({
  id: payload.leadId,
  campaign: payload.campaign,
  segment: "v1_proprietaire",
  sweepbright_contact_id: "sb-123",
  negotiator: "Jordan Saiman",
  first_name: "Patricia",
  last_name: "Fantoni",
  full_name: "Patricia Fantoni",
  email: "patricia@example.test",
  phone: "+33600000000",
  status: "sent",
  exclude_reason: null,
  subject_variant: "A",
  sequence_step: 1,
  sent_count: 1,
  response: null,
  responded_at: null,
  response_history: [],
  seller_lead_id: null,
  metadata: {},
  next_send_at: "2026-11-16T08:00:00.000Z",
});

const counts = () => ({
  mails: sendTransactionalEmail.mock.calls.length,
  notes: sendSweepBrightOwnerLead.mock.calls.length,
  leads: createSellerLead.mock.calls.length,
  webhooks: pushReactivationWebhook.mock.calls.length,
});

describe("recordOwnerResponse — dédoublonnage", () => {
  beforeEach(() => {
    state.row = freshRow();
    state.updates = [];
    state.inserts = [];
    sendTransactionalEmail.mockClear();
    sendSweepBrightOwnerLead.mockClear();
    createSellerLead.mockClear();
    pushReactivationWebhook.mockClear();
    vi.stubEnv("REACTIVATION_SWEEPBRIGHT_NOTE", "");
  });

  it("premier « vendre » : lead, mail(s), note SweepBright et webhook, une fois", async () => {
    const result = await recordOwnerResponse({ payload, response: "vendre", userAgent: "Mozilla/5.0 (humain)" });
    expect(result?.duplicate).toBe(false);
    expect(result?.newStatus).toBe("responded");
    expect(result?.sellerLeadId).toBe("lead-0001");
    expect(createSellerLead).toHaveBeenCalledTimes(1);
    expect(sendTransactionalEmail.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(sendSweepBrightOwnerLead).toHaveBeenCalledTimes(1);
    expect(pushReactivationWebhook).toHaveBeenCalledTimes(1);
    expect(pushReactivationWebhook.mock.calls[0]?.[0]).toMatchObject({ event: "reactivation_response", response: "vendre", newStatus: "responded" });
    expect(state.row).toMatchObject({ status: "responded", response: "vendre", next_send_at: null, seller_lead_id: "lead-0001" });
    expect(state.inserts).toHaveLength(1);
    expect(state.inserts[0]).toMatchObject({ event_type: "reactivation_response", payload: expect.objectContaining({ response: "vendre", user_agent: "Mozilla/5.0 (humain)" }) });
    expect((state.inserts[0].payload as Row).duplicate).toBeUndefined();
  });

  it("le même « vendre » une seconde fois : historisé et journalisé en doublon, sans mail, note ni webhook", async () => {
    await recordOwnerResponse({ payload, response: "vendre", userAgent: "humain" });
    const before = counts();
    const rowBefore = { ...state.row };

    const result = await recordOwnerResponse({ payload, response: "vendre", userAgent: "Google-Read-Aloud" });
    expect(result?.duplicate).toBe(true);
    expect(result?.notified).toBe(false);
    expect(counts()).toEqual(before);
    const history = state.row?.response_history as Row[];
    expect(history).toHaveLength(2);
    expect(history[1]).toMatchObject({ response: "vendre", duplicate: true, user_agent: "Google-Read-Aloud" });
    expect(state.inserts).toHaveLength(2);
    expect(state.inserts[1].payload).toMatchObject({ response: "vendre", duplicate: true, previous_status: "responded", new_status: "responded" });
    // Rien d'autre n'a bougé sur la fiche.
    expect(state.row).toMatchObject({ status: rowBefore.status, response: rowBefore.response, responded_at: rowBefore.responded_at, seller_lead_id: rowBefore.seller_lead_id, metadata: rowBefore.metadata });
  });

  it("une réponse différente (vendre puis rappel) est traitée normalement, puis un second rappel est un doublon", async () => {
    await recordOwnerResponse({ payload, response: "vendre" });
    const afterVendre = counts();

    const rappel = await recordOwnerResponse({ payload, response: "rappel" });
    expect(rappel?.duplicate).toBe(false);
    expect(sendTransactionalEmail.mock.calls.length).toBeGreaterThan(afterVendre.mails);
    expect(pushReactivationWebhook).toHaveBeenCalledTimes(afterVendre.webhooks + 1);
    expect(createSellerLead).toHaveBeenCalledTimes(1); // pas de second lead
    expect(state.row).toMatchObject({ status: "responded", response: "vendre", metadata: { prefers_callback: true } });

    const afterRappel = counts();
    const again = await recordOwnerResponse({ payload, response: "rappel" });
    expect(again?.duplicate).toBe(true);
    expect(counts()).toEqual(afterRappel);
  });

  it("« stop » puis « stop » : le second est un doublon ; « garde » sur une fiche non répondue n'en est pas un", async () => {
    await recordOwnerResponse({ payload, response: "stop" });
    expect(state.row?.status).toBe("unsubscribed");
    const before = counts();
    const again = await recordOwnerResponse({ payload, response: "stop" });
    expect(again?.duplicate).toBe(true);
    expect(counts()).toEqual(before);

    state.row = freshRow();
    const garde = await recordOwnerResponse({ payload, response: "garde" });
    expect(garde?.duplicate).toBe(false);
    expect(state.row).toMatchObject({ status: "responded", response: "garde", next_send_at: null });
    expect(createSellerLead).toHaveBeenCalledTimes(0);
  });

  it("contact introuvable : null, rien d'envoyé", async () => {
    state.row = null;
    expect(await recordOwnerResponse({ payload, response: "vendre" })).toBeNull();
    expect(counts()).toEqual({ mails: 0, notes: 0, leads: 0, webhooks: 0 });
  });
});
