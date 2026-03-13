export const SELLER_LEAD_STATUSES = ["new", "to_call", "qualified", "closed"] as const;
export type SellerLeadStatus = (typeof SELLER_LEAD_STATUSES)[number];

export const SELLER_PROPERTY_TYPES = ["appartement", "maison", "villa", "autre"] as const;
export type SellerPropertyType = (typeof SELLER_PROPERTY_TYPES)[number];

export const SELLER_TIMELINES = ["immediate", "3_months", "6_months", "future"] as const;
export type SellerTimeline = (typeof SELLER_TIMELINES)[number];

export const SELLER_OCCUPANCY_STATUSES = [
  "owner_occupied",
  "tenant_occupied",
  "vacant",
] as const;
export type SellerOccupancyStatus = (typeof SELLER_OCCUPANCY_STATUSES)[number];

export const SELLER_APARTMENT_CONDITIONS = [
  "a_renover",
  "renove_20_ans",
  "renove_10_ans",
  "renove_moins_5_ans",
  "neuf",
] as const;
export type SellerApartmentCondition = (typeof SELLER_APARTMENT_CONDITIONS)[number];

export const SELLER_BUILDING_AGES = [
  "ancien_1950",
  "recent_1950_1970",
  "moderne_1980_today",
] as const;
export type SellerBuildingAge = (typeof SELLER_BUILDING_AGES)[number];

export const SELLER_SEA_VIEWS = ["none", "panoramic", "classic", "lateral"] as const;
export type SellerSeaView = (typeof SELLER_SEA_VIEWS)[number];

export type SellerAiInsight = {
  summary: string;
  competitorRiskLevel: "low" | "medium" | "high";
  recommendedPitch: string;
  nextAction: string;
  generatedAt: string;
  model: string;
};

export type SellerChatMessage = {
  role: "user" | "assistant";
  text: string;
  created_at: string;
};

export type SellerIdentityMetadata = {
  fingerprint?: string;
  dedupe_window_hours?: number;
  computed_at?: string;
};

export type SellerValuationMetadata = {
  provider?: string | null;
  synced_at?: string | null;
  source?: string | null;
  normalized?: Record<string, unknown> | null;
};

export type SellerPropertyDetailsMetadata = {
  living_area?: number | null;
  rooms?: number | null;
  bedrooms?: number | null;
  floor?: string | null;
  building_total_floors?: number | null;
  is_top_floor?: boolean | null;
  condition?: string | null;
  elevator?: boolean | null;
  apartment_condition?: SellerApartmentCondition | string | null;
  building_age?: SellerBuildingAge | string | null;
  sea_view?: SellerSeaView | string | null;
  valuation_low?: number | null;
  valuation_high?: number | null;
  notes?: string | null;
  updated_at?: string | null;
};

export type SellerVerificationMetadata = {
  email_verified_at?: string | null;
};

export type SellerScoringMetadata = {
  score?: number | null;
  segment?: string | null;
  next_best_action?: string | null;
  updated_at?: string | null;
  ai_insight?: SellerAiInsight | null;
};

export type SellerChatInternalMetadata = {
  confidence_score?: number | null;
  confidence_level?: "low" | "medium" | "high" | string | null;
  mcp_context_used?: boolean | null;
  updated_at?: string | null;
};

export type SellerChatMetadata = {
  messages?: SellerChatMessage[];
  knowledge_version?: string | null;
  updated_at?: string | null;
  internal?: SellerChatInternalMetadata | null;
};

export type SellerLeadMetadata = Record<string, unknown> & {
  identity?: SellerIdentityMetadata;
  valuation?: SellerValuationMetadata;
  property_details?: SellerPropertyDetailsMetadata;
  verification?: SellerVerificationMetadata;
  scoring?: SellerScoringMetadata;
  seller_chat?: SellerChatMetadata;
};

export type SellerLeadSnapshot = {
  sellerLeadId: string;
  identity: {
    fullName: string;
    email: string;
    phone: string | null;
  };
  property: {
    city: string | null;
    postalCode: string | null;
    propertyType: string | null;
    propertyAddress: string | null;
    timeline: string | null;
    status: string;
    propertyDetails: SellerPropertyDetailsMetadata | null;
    valuation: SellerValuationMetadata | null;
  };
  scoring: {
    score: number | null;
    segment: string | null;
    nextBestAction: string | null;
    breakdown: unknown;
    reasons: unknown;
    updatedAt: string | null;
  };
  aiInsight: SellerAiInsight | null;
  sellerChat: {
    messages: SellerChatMessage[];
    messageCount: number;
    knowledgeVersion: string | null;
    updatedAt: string | null;
    internal: {
      confidenceScore: number | null;
      confidenceLevel: string | null;
      mcpContextUsed: boolean | null;
    };
  };
};
