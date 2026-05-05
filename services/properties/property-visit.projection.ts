/**
 * Pure projection / sorting helpers for `property_visits` rows.
 *
 * Kept separate from `property-visit.service.ts` (which imports
 * `server-only` and `supabaseAdmin`) so the helpers can be unit-tested
 * without booting the Supabase admin client or the server env loader.
 */

import { computeContactInitials } from "@/lib/sweepbright/contact-initials";
import type { Database } from "@/types/db/supabase";

export type PropertyVisitRow =
  Database["public"]["Tables"]["property_visits"]["Row"];

export type PropertyVisitClientView = {
  id: string;
  status: PropertyVisitRow["status"];
  scheduledAt: string | null;
  endedAt: string | null;
  durationMinutes: number | null;
  negotiatorName: string | null;
  contactInitials: string;
  zapierEvent: string;
  occurredAt: string;
  /**
   * Qualitative outcome the advisor saved on the visiting report.
   * SweepBright exposes 5 buckets via 5 radio buttons (Pas d'intérêt /
   * Info / Visite / Offre / Deal); the canonical API string is one of
   * `no_interest | wants_info | wants_to_visit | offer | deal`. The UI
   * maps this to a localized label and a coloured badge. Free-form
   * string for forward compatibility with future SweepBright values.
   */
  feedbackOutcome: string | null;
  /**
   * Verbatim public comment from the visiting report (owner-facing).
   * Sourced STRICTLY from `feedback_comment_public`. The advisor's
   * 🔒 internal comment is NEVER fallback-injected here — SweepBright
   * marks the two fields with explicit "this text will appear in the
   * owner report" hint vs lock icon, and we respect that boundary.
   */
  feedbackComment: string | null;
};

export type PropertyVisitAdminView = PropertyVisitClientView & {
  contact: {
    name: string | null;
    email: string | null;
    phone: string | null;
    externalId: string | null;
  };
  negotiator: {
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  creator: {
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  feedback: {
    rating: number | null;
    outcome: string | null;
    commentPublic: string | null;
    /** Advisor-only. NEVER projected to PropertyVisitClientView. */
    commentInternal: string | null;
    offerAmount: number | null;
  };
  receivedAt: string;
  rawPayload: Record<string, unknown>;
};

export const toClientView = (
  row: PropertyVisitRow
): PropertyVisitClientView => ({
  id: row.id,
  status: row.status,
  scheduledAt: row.scheduled_at,
  endedAt: row.ended_at,
  durationMinutes: row.duration_minutes,
  negotiatorName: row.negotiator_name,
  contactInitials: computeContactInitials(row.contact_name),
  zapierEvent: row.zapier_event,
  occurredAt: row.occurred_at,
  feedbackOutcome: row.feedback_outcome,
  // PRIVACY: SOURCE UNIQUE on feedback_comment_public. Do NOT add a
  // fallback on feedback_comment_internal — SweepBright distinguishes
  // the two via a 🔒 icon in its UI and we respect that boundary.
  feedbackComment: row.feedback_comment_public,
});

export const toAdminView = (row: PropertyVisitRow): PropertyVisitAdminView => ({
  ...toClientView(row),
  contact: {
    name: row.contact_name,
    email: row.contact_email,
    phone: row.contact_phone,
    externalId: row.contact_external_id,
  },
  negotiator: {
    name: row.negotiator_name,
    email: row.negotiator_email,
    phone: row.negotiator_phone,
  },
  creator: {
    name: row.creator_name,
    email: row.creator_email,
    phone: row.creator_phone,
  },
  feedback: {
    rating: row.feedback_rating,
    outcome: row.feedback_outcome,
    commentPublic: row.feedback_comment_public,
    commentInternal: row.feedback_comment_internal,
    offerAmount: row.feedback_offer_amount,
  },
  receivedAt: row.received_at,
  rawPayload: row.raw_payload,
});

/**
 * Split a list of visits into upcoming (scheduled in the future) and past
 * (everything else, including cancelled / completed). Useful for the UI
 * which renders two stacked sections.
 *
 * `completed` and `cancelled` visits always land in `past` regardless of
 * their `scheduledAt`, so an advisor who completes a visit early — or who
 * cancels a future slot — does not leave a stale row in the upcoming
 * section.
 */
export const splitVisitsByTime = <
  T extends {
    scheduledAt: string | null;
    status?: PropertyVisitRow["status"];
  },
>(
  visits: T[],
  now: Date = new Date()
): { upcoming: T[]; past: T[] } => {
  const nowMs = now.getTime();
  const upcoming: T[] = [];
  const past: T[] = [];
  for (const visit of visits) {
    if (visit.status === "completed" || visit.status === "cancelled") {
      past.push(visit);
      continue;
    }
    if (visit.scheduledAt) {
      const scheduledMs = new Date(visit.scheduledAt).getTime();
      if (Number.isFinite(scheduledMs) && scheduledMs >= nowMs) {
        upcoming.push(visit);
        continue;
      }
    }
    past.push(visit);
  }
  upcoming.sort(
    (a, b) =>
      new Date(a.scheduledAt ?? 0).getTime() -
      new Date(b.scheduledAt ?? 0).getTime()
  );
  past.sort(
    (a, b) =>
      new Date(b.scheduledAt ?? 0).getTime() -
      new Date(a.scheduledAt ?? 0).getTime()
  );
  return { upcoming, past };
};
