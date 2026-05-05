export type SweepBrightWebhookEventName =
  | "estate-added"
  | "estate-updated"
  | "estate-deleted";

export type SweepBrightWebhookPayload = {
  event: SweepBrightWebhookEventName;
  estate_id: string;
  happened_at: string;
  company_id: string;
};

/**
 * Payload shape produced by Zapier's "Webhooks by Zapier - Custom Request"
 * action wired to the SweepBright "New Visit Scheduled" trigger.
 *
 * Verified on webhook.site on 5 May 2026 with the production Zap.
 * SweepBright user IDs (negotiator/creator) are NOT exposed by the Zapier
 * app; we identify those users by email instead. The pretty-printed
 * `scheduled_at` / `ended_at` strings are parsed server-side via
 * `lib/sweepbright/zapier-date.ts`.
 */
export type SweepBrightZapierVisitEventName =
  | "visit.scheduled"
  | "visit.updated"
  | "visit.cancelled"
  | "visit.completed";

export type SweepBrightZapierVisitContact = {
  id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
};

export type SweepBrightZapierVisitNegotiator = {
  id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
};

export type SweepBrightZapierVisitEstate = {
  id: string;
  reference: string | null;
  title: string | null;
};

/**
 * Qualitative outcome saved by the advisor on a SweepBright visiting
 * report. SweepBright's UI exposes 5 radio buttons for this; the API
 * label may evolve, so we type it as the union of the 5 known literals
 * AND a fallback string for forward compatibility.
 */
export type SweepBrightFeedbackOutcome =
  | "no_interest"
  | "wants_info"
  | "wants_to_visit"
  | "offer"
  | "deal";

export type SweepBrightZapierVisitFeedback = {
  /**
   * Numeric rating, kept for forward compatibility — SweepBright's
   * current Feedback UI does NOT expose a 1-5 score. The qualitative
   * outcome is conveyed by `outcome` instead.
   */
  rating: number | null;
  outcome: SweepBrightFeedbackOutcome | string | null;
  /** Public comment — visible to the seller in their portal. */
  comment_public: string | null;
  /**
   * Internal advisor-only comment. Lock-icon flagged in SweepBright UI.
   * MUST NEVER be exposed in the seller portal projection.
   */
  comment_internal: string | null;
  /**
   * Buyer offer amount. NOT carried by `lead_reaction_changed` in
   * SweepBright — populated only via the dedicated `offer_*` triggers
   * (out of scope for this feedback flow). Kept on the type for
   * symmetry with the DB column.
   */
  offer_amount: number | null;
};

export type SweepBrightZapierVisitPayload = {
  event: SweepBrightZapierVisitEventName;
  occurred_at: string;
  external_visit_id: string;
  estate: SweepBrightZapierVisitEstate;
  scheduled_at: string | null;
  ended_at: string | null;
  status: "scheduled" | "updated" | "cancelled" | "completed";
  negotiator: SweepBrightZapierVisitNegotiator;
  contact: SweepBrightZapierVisitContact;
  creator: SweepBrightZapierVisitNegotiator;
  vendors: unknown;
  feedback?: SweepBrightZapierVisitFeedback | null;
};

export type SweepBrightTokenResponse = {
  token_type: string;
  expires_in: number;
  access_token: string;
};

export type SweepBrightMoney = {
  amount?: number | null;
  currency?: string | null;
  hidden?: boolean | null;
};

export type SweepBrightMediaItem = {
  id?: string;
  filename?: string | null;
  description?: string | null;
  content_type?: string | null;
  url?: string | null;
  url_expires_on?: string | null;
  ordinal?: number | null;
};

export type SweepBrightEstateData = {
  id: string;
  is_project?: boolean;
  project_id?: string | null;
  type?: string | null;
  sub_type?: string | null;
  negotiation?: string | null;
  status?: string | null;
  description?: Record<string, string> | string | null;
  description_title?: Record<string, string> | string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  living_rooms?: number | null;
  price?: SweepBrightMoney | null;
  price_base_rent?: SweepBrightMoney | null;
  video_url?: string | null;
  virtual_tour_url?: string | null;
  appointment_service_url?: string | null;
  general_condition?: string | null;
  legal?: Record<string, unknown> | null;
  location?: {
    city?: string | null;
    street?: string | null;
    number?: string | null;
    country?: string | null;
    formatted?: string | null;
    postal_code?: string | null;
    floor?: number | null;
    hidden?: boolean | null;
    geo?: {
      latitude?: number | null;
      longitude?: number | null;
    } | null;
  } | null;
  sizes?: {
    plot_area?: { size?: number | null } | null;
    liveable_area?: { size?: number | null } | null;
  } | null;
  amenities?: Array<string | null> | null;
  images?: SweepBrightMediaItem[] | null;
  plans?: SweepBrightMediaItem[] | null;
  documents?: SweepBrightMediaItem[] | null;
  negotiator?: Record<string, unknown> | null;
  properties?: SweepBrightEstateData[] | null;
  office?: {
    id?: string | null;
    name?: string | null;
  } | null;
  [key: string]: unknown;
};
