import { describe, expect, it } from "vitest";
import {
  splitVisitsByTime,
  toAdminView,
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
  feedback_outcome: null,
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
      feedbackOutcome: null,
      feedbackComment: null,
    });
    expect(view).not.toHaveProperty("contact_name");
    expect(view).not.toHaveProperty("contact_email");
    expect(view).not.toHaveProperty("contact_phone");
  });

  it("exposes feedback verbatim for a completed visit with a public comment", () => {
    const view = toClientView({
      ...baseRow,
      status: "completed",
      zapier_event: "visit.completed",
      feedback_outcome: "wants_to_visit",
      feedback_comment_public:
        "Acquéreur très intéressé, demande un second RDV.",
      feedback_comment_internal: "Note privée — ne pas afficher.",
    });
    expect(view.status).toBe("completed");
    expect(view.feedbackOutcome).toBe("wants_to_visit");
    expect(view.feedbackComment).toBe(
      "Acquéreur très intéressé, demande un second RDV."
    );
  });

  // PRIVACY: this is the canary test for the lock-icon contract. If this
  // ever fails, we are leaking the advisor's internal comment to the
  // seller portal — see migration 024 + property-visits-client-panel.tsx.
  it("never leaks feedback_comment_internal into the client view, even when public is null", () => {
    const view = toClientView({
      ...baseRow,
      status: "completed",
      zapier_event: "visit.completed",
      feedback_outcome: "no_interest",
      feedback_comment_public: null,
      feedback_comment_internal: "PRIVATE — agent only, do not show owner.",
    });
    expect(view.feedbackComment).toBeNull();
    expect(view).not.toHaveProperty("feedbackCommentInternal");
  });

  it("returns null for both feedbackComment and feedbackOutcome when nothing is set", () => {
    const view = toClientView({
      ...baseRow,
      status: "completed",
      zapier_event: "visit.completed",
    });
    expect(view.feedbackOutcome).toBeNull();
    expect(view.feedbackComment).toBeNull();
  });

  it("exposes the raw outcome string verbatim for forward-compat with new SweepBright values", () => {
    const view = toClientView({
      ...baseRow,
      status: "completed",
      feedback_outcome: "withdrawn",
    });
    // Even an unknown outcome string is preserved — UI is responsible for
    // localizing known values and falling back to a generic label otherwise.
    expect(view.feedbackOutcome).toBe("withdrawn");
  });
});

describe("toAdminView", () => {
  it("exposes both comments and the outcome to the admin", () => {
    const view = toAdminView({
      ...baseRow,
      status: "completed",
      zapier_event: "visit.completed",
      feedback_outcome: "deal",
      feedback_rating: 4,
      feedback_comment_public: "Public takeaway.",
      feedback_comment_internal: "Private agent note.",
      feedback_offer_amount: 250000,
    });
    expect(view.feedback.outcome).toBe("deal");
    expect(view.feedback.rating).toBe(4);
    expect(view.feedback.commentPublic).toBe("Public takeaway.");
    expect(view.feedback.commentInternal).toBe("Private agent note.");
    expect(view.feedback.offerAmount).toBe(250000);
  });

  it("inherits the same client-safe comment policy on the AdminView client-facing fields", () => {
    // PropertyVisitAdminView extends PropertyVisitClientView, so the
    // top-level feedbackComment must still be the public one only.
    const view = toAdminView({
      ...baseRow,
      status: "completed",
      feedback_comment_public: null,
      feedback_comment_internal: "Private only.",
    });
    expect(view.feedbackComment).toBeNull();
    // But the structured admin-only block exposes it:
    expect(view.feedback.commentInternal).toBe("Private only.");
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
      feedbackOutcome: "wants_to_visit",
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
      feedbackOutcome: "deal",
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
