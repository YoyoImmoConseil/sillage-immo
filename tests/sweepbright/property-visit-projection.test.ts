import { describe, expect, it } from "vitest";
import {
  splitVisitsByTime,
  toClientView,
  type PropertyVisitClientView,
  type PropertyVisitRow,
} from "@/services/properties/property-visit.projection";

const baseRow: PropertyVisitRow = {
  id: "visit-1",
  created_at: "2026-04-01T08:00:00.000Z",
  updated_at: "2026-04-01T08:00:00.000Z",
  received_at: "2026-04-01T08:00:00.000Z",
  property_id: "property-1",
  external_visit_id: "ext-1",
  status: "scheduled",
  scheduled_at: "2026-04-15T13:00:00.000Z",
  ended_at: "2026-04-15T13:30:00.000Z",
  duration_minutes: 30,
  negotiator_email: "advisor@example.com",
  negotiator_name: "Marie Conseillère",
  negotiator_phone: "+33 1 00 00 00 00",
  contact_external_id: "buyer-1",
  contact_email: "buyer@example.com",
  contact_name: "Claire Caisson",
  contact_phone: "+33 6 00 00 00 00",
  creator_email: "creator@example.com",
  creator_name: "Marie Conseillère",
  creator_phone: "+33 1 00 00 00 00",
  feedback_rating: null,
  feedback_comment_public: null,
  feedback_comment_internal: null,
  feedback_offer_amount: null,
  zapier_event: "visit.scheduled",
  occurred_at: "2026-04-01T08:00:00.000Z",
  raw_payload: {},
};

describe("toClientView", () => {
  it("strips PII to initials and exposes no feedback for a scheduled visit", () => {
    const view = toClientView(baseRow);
    expect(view).toMatchObject({
      id: "visit-1",
      status: "scheduled",
      negotiatorName: "Marie Conseillère",
      contactInitials: "CC",
      feedbackRating: null,
      feedbackComment: null,
    });
    // Ensure raw PII never leaks via the projection.
    expect(view).not.toHaveProperty("contact_name");
    expect(view).not.toHaveProperty("contact_email");
    expect(view).not.toHaveProperty("contact_phone");
  });

  it("exposes feedback verbatim for a completed visit with a public comment", () => {
    const view = toClientView({
      ...baseRow,
      status: "completed",
      zapier_event: "visit.completed",
      feedback_rating: 4,
      feedback_comment_public: "Acquéreur très intéressé, demande un second RDV.",
      feedback_comment_internal: "Note privée — ne pas afficher.",
    });
    expect(view.status).toBe("completed");
    expect(view.feedbackRating).toBe(4);
    expect(view.feedbackComment).toBe(
      "Acquéreur très intéressé, demande un second RDV."
    );
  });

  it("falls back to the internal comment when the public comment is null", () => {
    const view = toClientView({
      ...baseRow,
      status: "completed",
      zapier_event: "visit.completed",
      feedback_rating: 3,
      feedback_comment_public: null,
      feedback_comment_internal: "Commentaire saisi côté agent.",
    });
    expect(view.feedbackRating).toBe(3);
    expect(view.feedbackComment).toBe("Commentaire saisi côté agent.");
  });

  it("returns null comment when both feedback comments are absent", () => {
    const view = toClientView({
      ...baseRow,
      status: "completed",
      zapier_event: "visit.completed",
      feedback_rating: 5,
      feedback_comment_public: null,
      feedback_comment_internal: null,
    });
    expect(view.feedbackRating).toBe(5);
    expect(view.feedbackComment).toBeNull();
  });
});

describe("splitVisitsByTime", () => {
  const now = new Date("2026-04-15T12:00:00.000Z");

  const buildView = (
    overrides: Partial<PropertyVisitClientView>
  ): PropertyVisitClientView => ({
    ...toClientView(baseRow),
    ...overrides,
  });

  it("places future scheduled visits in upcoming, past ones in past", () => {
    const future = buildView({
      id: "future",
      status: "scheduled",
      scheduledAt: "2026-05-01T10:00:00.000Z",
    });
    const past = buildView({
      id: "past",
      status: "scheduled",
      scheduledAt: "2026-04-01T10:00:00.000Z",
    });
    const result = splitVisitsByTime([future, past], now);
    expect(result.upcoming.map((v) => v.id)).toEqual(["future"]);
    expect(result.past.map((v) => v.id)).toEqual(["past"]);
  });

  it("routes a completed visit to past even when scheduledAt is in the future", () => {
    const completedEarly = buildView({
      id: "completed-early",
      status: "completed",
      scheduledAt: "2026-05-01T10:00:00.000Z",
      feedbackRating: 4,
      feedbackComment: "RAS",
    });
    const result = splitVisitsByTime([completedEarly], now);
    expect(result.upcoming).toHaveLength(0);
    expect(result.past.map((v) => v.id)).toEqual(["completed-early"]);
  });

  it("routes a completed visit with past scheduledAt to past", () => {
    const completedNormal = buildView({
      id: "completed",
      status: "completed",
      scheduledAt: "2026-04-10T10:00:00.000Z",
      feedbackRating: 5,
      feedbackComment: "Excellent retour",
    });
    const result = splitVisitsByTime([completedNormal], now);
    expect(result.past.map((v) => v.id)).toEqual(["completed"]);
  });

  it("routes a cancelled visit to past regardless of scheduledAt", () => {
    const cancelledFuture = buildView({
      id: "cancelled-future",
      status: "cancelled",
      scheduledAt: "2026-05-01T10:00:00.000Z",
    });
    const result = splitVisitsByTime([cancelledFuture], now);
    expect(result.upcoming).toHaveLength(0);
    expect(result.past.map((v) => v.id)).toEqual(["cancelled-future"]);
  });

  it("treats a missing scheduledAt as past for non-terminal status", () => {
    const orphan = buildView({
      id: "orphan",
      status: "scheduled",
      scheduledAt: null,
    });
    const result = splitVisitsByTime([orphan], now);
    expect(result.past.map((v) => v.id)).toEqual(["orphan"]);
  });

  it("sorts upcoming chronologically and past reverse-chronologically", () => {
    const visits: PropertyVisitClientView[] = [
      buildView({
        id: "u-late",
        status: "scheduled",
        scheduledAt: "2026-05-02T10:00:00.000Z",
      }),
      buildView({
        id: "u-early",
        status: "scheduled",
        scheduledAt: "2026-04-20T10:00:00.000Z",
      }),
      buildView({
        id: "p-old",
        status: "scheduled",
        scheduledAt: "2026-04-01T10:00:00.000Z",
      }),
      buildView({
        id: "p-recent",
        status: "scheduled",
        scheduledAt: "2026-04-10T10:00:00.000Z",
      }),
    ];
    const result = splitVisitsByTime(visits, now);
    expect(result.upcoming.map((v) => v.id)).toEqual(["u-early", "u-late"]);
    expect(result.past.map((v) => v.id)).toEqual(["p-recent", "p-old"]);
  });
});
