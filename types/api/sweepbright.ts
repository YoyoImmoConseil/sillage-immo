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
