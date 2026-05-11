import { describe, expect, it } from "vitest";
import { zapierVisitPayloadSchema } from "@/lib/sweepbright/zapier-payload-schema";

/**
 * Reproduces the live payload captured from Zapier's "Test action" on
 * 7 May 2026 18:36 (Paris) for the `lead_reaction_changed` trigger.
 * Zapier serialises blank trigger fields as empty strings instead of
 * the `null` literal mapped in the body, so the schema must absorb that.
 */
const liveZapierPayloadWithEmptyStrings = {
  event: "visit.completed",
  occurred_at: "2026-05-07 16:36:37",
  external_visit_id: "1afb8a2c-eb64-4f58-bc21-e15d9ff6687d",
  estate: {
    id: "7aeb3936-6696-473c-b737-d1823503f44d",
    reference: "",
    title: "",
  },
  scheduled_at: "",
  ended_at: "",
  status: "completed",
  negotiator: { id: "", name: "", email: "", phone: "" },
  contact: {
    id: "0b9d1f69-fa31-4a11-ad07-1e54957699b9",
    name: "Louise DUMAS",
    email: "louise.maria.dumas@gmail.com",
    phone: "+33651642941",
  },
  creator: { id: "", name: "", email: "", phone: "" },
  vendors: null,
  feedback: {
    rating: "",
    outcome: "Wants to visit",
    comment_public: "Cliente venue visiter avec sa maman.",
    comment_internal: "",
    offer_amount: "",
  },
};

describe("zapierVisitPayloadSchema", () => {
  describe("happy path", () => {
    it("accepts a fully nulled, well-typed payload", () => {
      const result = zapierVisitPayloadSchema.safeParse({
        event: "visit.scheduled",
        occurred_at: "2026-05-07T18:00:00.000Z",
        external_visit_id: "abc-123",
        estate: { id: "estate-1", reference: null, title: null },
        scheduled_at: "Monday, 23-Feb-26 13:00:00 UTC",
        ended_at: null,
        status: "scheduled",
        negotiator: { id: null, name: null, email: null, phone: null },
        contact: { id: null, name: null, email: null, phone: null },
        creator: { id: null, name: null, email: null, phone: null },
        vendors: null,
        feedback: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("Zapier empty-string coercion (the bug captured 7 May 2026)", () => {
    it("accepts the live captured payload and coerces '' to null", () => {
      const result = zapierVisitPayloadSchema.safeParse(
        liveZapierPayloadWithEmptyStrings
      );
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.estate.reference).toBeNull();
      expect(result.data.estate.title).toBeNull();
      expect(result.data.scheduled_at).toBeNull();
      expect(result.data.ended_at).toBeNull();
      expect(result.data.negotiator.id).toBeNull();
      expect(result.data.negotiator.name).toBeNull();
      expect(result.data.creator.email).toBeNull();
      expect(result.data.feedback?.rating).toBeNull();
      expect(result.data.feedback?.offer_amount).toBeNull();
      expect(result.data.feedback?.comment_internal).toBeNull();
    });

    it("preserves real values around blank fields", () => {
      const result = zapierVisitPayloadSchema.safeParse(
        liveZapierPayloadWithEmptyStrings
      );
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.contact.email).toBe("louise.maria.dumas@gmail.com");
      expect(result.data.feedback?.outcome).toBe("Wants to visit");
      expect(result.data.feedback?.comment_public).toBe(
        "Cliente venue visiter avec sa maman."
      );
    });

    it("treats whitespace-only strings as null", () => {
      const result = zapierVisitPayloadSchema.safeParse({
        ...liveZapierPayloadWithEmptyStrings,
        feedback: {
          ...liveZapierPayloadWithEmptyStrings.feedback,
          comment_internal: "   \t\n  ",
        },
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.feedback?.comment_internal).toBeNull();
    });
  });

  describe("number coercion for SweepBright stringified amounts", () => {
    it("coerces numeric strings on offer_amount", () => {
      const result = zapierVisitPayloadSchema.safeParse({
        ...liveZapierPayloadWithEmptyStrings,
        feedback: {
          ...liveZapierPayloadWithEmptyStrings.feedback,
          offer_amount: "150000",
        },
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.feedback?.offer_amount).toBe(150000);
    });

    it("coerces numeric strings on rating", () => {
      const result = zapierVisitPayloadSchema.safeParse({
        ...liveZapierPayloadWithEmptyStrings,
        feedback: {
          ...liveZapierPayloadWithEmptyStrings.feedback,
          rating: "4",
        },
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.feedback?.rating).toBe(4);
    });

    it("rejects rating outside the 0–5 range", () => {
      const result = zapierVisitPayloadSchema.safeParse({
        ...liveZapierPayloadWithEmptyStrings,
        feedback: {
          ...liveZapierPayloadWithEmptyStrings.feedback,
          rating: 7,
        },
      });
      expect(result.success).toBe(false);
    });

    it("falls back to null on unparseable numeric strings", () => {
      const result = zapierVisitPayloadSchema.safeParse({
        ...liveZapierPayloadWithEmptyStrings,
        feedback: {
          ...liveZapierPayloadWithEmptyStrings.feedback,
          offer_amount: "not a number",
        },
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.feedback?.offer_amount).toBeNull();
    });
  });

  describe("Zapier Python-repr stringified sub-objects (captured 11 May 2026)", () => {
    /**
     * Reproduces the actual payload Zapier serialised for the
     * `lead_reaction_changed` trigger when the Zap body was defined with
     * nested objects in the UI. Captured verbatim from Vercel logs at
     * 11 May 2026 12:38 (Paris) via [zapier-visit] debug instrumentation.
     */
    const liveZapierPayloadWithStringifiedSubobjects = {
      event: "visit.completed",
      occurred_at: "2026-05-11T10:36:56+00:00",
      external_visit_id: "1afb8a2c-eb64-4f58-bc21-e15d9ff6687d",
      estate: "{'id': '7aeb3936-6696-473c-b737-d1823503f44d'}",
      status: "completed",
      contact:
        "{'id': '0b9d1f69-fa31-4a11-ad07-1e54957699b9', 'name': 'Louise DUMAS', 'email': 'louise.maria.dumas@gmail.com', 'phone': '+33651642941'}",
      feedback:
        "{'outcome': 'Wants to visit', 'comment_public': \"Cliente venue visiter avec sa maman (primo accédante), elle a adoré l'appartement, la maman était un peu moins emballée à cause du bruit de la route et des avions.\"}",
    };

    it("parses the live captured payload end-to-end", () => {
      const result = zapierVisitPayloadSchema.safeParse(
        liveZapierPayloadWithStringifiedSubobjects
      );
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.estate.id).toBe(
        "7aeb3936-6696-473c-b737-d1823503f44d"
      );
      expect(result.data.contact.name).toBe("Louise DUMAS");
      expect(result.data.contact.email).toBe("louise.maria.dumas@gmail.com");
      expect(result.data.feedback?.outcome).toBe("Wants to visit");
      expect(result.data.feedback?.comment_public).toContain(
        "l'appartement"
      );
    });

    it("defaults missing negotiator and creator to an all-null object", () => {
      const result = zapierVisitPayloadSchema.safeParse(
        liveZapierPayloadWithStringifiedSubobjects
      );
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.negotiator).toEqual({
        id: null,
        name: null,
        email: null,
        phone: null,
      });
      expect(result.data.creator).toEqual({
        id: null,
        name: null,
        email: null,
        phone: null,
      });
    });

    it("preserves apostrophes inside double-quoted Python-repr values", () => {
      const result = zapierVisitPayloadSchema.safeParse({
        ...liveZapierPayloadWithStringifiedSubobjects,
        feedback:
          "{'outcome': 'no_interest', 'comment_public': \"L'élève n'a pas aimé l'appartement.\"}",
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.feedback?.comment_public).toBe(
        "L'élève n'a pas aimé l'appartement."
      );
    });

    it("handles nested Python-repr objects", () => {
      const result = zapierVisitPayloadSchema.safeParse({
        ...liveZapierPayloadWithStringifiedSubobjects,
        contact:
          "{'id': 'c-1', 'name': 'Alice', 'email': 'a@b.c', 'phone': '+33000000000'}",
        feedback:
          "{'outcome': 'deal', 'comment_public': 'OK', 'offer_amount': 150000}",
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.contact.email).toBe("a@b.c");
      expect(result.data.feedback?.offer_amount).toBe(150000);
    });

    it("translates Python literals None/True/False inside repr strings", () => {
      const result = zapierVisitPayloadSchema.safeParse({
        ...liveZapierPayloadWithStringifiedSubobjects,
        feedback:
          "{'outcome': 'offer', 'comment_public': None, 'offer_amount': 200000}",
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.feedback?.comment_public).toBeNull();
      expect(result.data.feedback?.offer_amount).toBe(200000);
    });

    it("falls back to schema rejection when the string is not a valid object", () => {
      const result = zapierVisitPayloadSchema.safeParse({
        ...liveZapierPayloadWithStringifiedSubobjects,
        estate: "not even close to JSON",
      });
      expect(result.success).toBe(false);
    });

    it("accepts a fully nested real-JSON payload (forward-compat)", () => {
      const result = zapierVisitPayloadSchema.safeParse({
        ...liveZapierPayloadWithStringifiedSubobjects,
        estate: { id: "real-id", reference: null, title: null },
        contact: {
          id: "c-1",
          name: "Alice",
          email: "a@b.c",
          phone: null,
        },
        negotiator: { id: "n-1", name: "Bob", email: null, phone: null },
        creator: { id: "n-1", name: "Bob", email: null, phone: null },
        feedback: {
          outcome: "wants_to_visit",
          comment_public: "hello",
          comment_internal: null,
          rating: null,
          offer_amount: null,
        },
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.negotiator.id).toBe("n-1");
      expect(result.data.contact.email).toBe("a@b.c");
    });
  });

  describe("strict guards (should still reject)", () => {
    it("rejects an empty estate.id", () => {
      const result = zapierVisitPayloadSchema.safeParse({
        ...liveZapierPayloadWithEmptyStrings,
        estate: { ...liveZapierPayloadWithEmptyStrings.estate, id: "" },
      });
      expect(result.success).toBe(false);
    });

    it("rejects an empty external_visit_id", () => {
      const result = zapierVisitPayloadSchema.safeParse({
        ...liveZapierPayloadWithEmptyStrings,
        external_visit_id: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects an unknown event", () => {
      const result = zapierVisitPayloadSchema.safeParse({
        ...liveZapierPayloadWithEmptyStrings,
        event: "visit.exploded",
      });
      expect(result.success).toBe(false);
    });

    it("rejects an unknown status", () => {
      const result = zapierVisitPayloadSchema.safeParse({
        ...liveZapierPayloadWithEmptyStrings,
        status: "exploded",
      });
      expect(result.success).toBe(false);
    });
  });
});
