import type {
  SellerAiInsight,
  SellerChatInternalMetadata,
  SellerChatMessage,
  SellerChatMetadata,
  SellerIdentityMetadata,
  SellerLeadMetadata,
  SellerPropertyDetailsMetadata,
  SellerScoringMetadata,
  SellerValuationMetadata,
  SellerVerificationMetadata,
} from "@/types/domain/sellers";

const asRecord = (value: unknown): Record<string, unknown> | null => {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
};

export const toNumberOrNull = (value: unknown) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
};

export const toStringOrNull = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

export const parseFloorNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value !== "string") return null;
  const match = value.match(/\d+/);
  if (!match) return null;
  const parsed = Number.parseInt(match[0], 10);
  return Number.isFinite(parsed) ? parsed : null;
};

export const computeIsTopFloor = (floorRaw: unknown, totalFloorsRaw: unknown) => {
  const floor = parseFloorNumber(floorRaw);
  const totalFloors =
    typeof totalFloorsRaw === "number" && Number.isFinite(totalFloorsRaw)
      ? Math.trunc(totalFloorsRaw)
      : null;
  if (floor === null || totalFloors === null || floor < 0 || totalFloors < 0) return null;
  if (floor > totalFloors) return null;
  return floor === totalFloors;
};

const isSellerChatMessage = (value: unknown): value is SellerChatMessage => {
  const row = asRecord(value);
  return Boolean(
    row &&
      (row.role === "user" || row.role === "assistant") &&
      typeof row.text === "string" &&
      typeof row.created_at === "string"
  );
};

export const getSellerMetadataSections = (value: unknown) => {
  const raw = (asRecord(value) ?? {}) as SellerLeadMetadata;
  const identity = (asRecord(raw.identity) as SellerIdentityMetadata | null) ?? null;
  const valuation = (asRecord(raw.valuation) as SellerValuationMetadata | null) ?? null;
  const propertyDetails =
    (asRecord(raw.property_details) as SellerPropertyDetailsMetadata | null) ?? null;
  const verification =
    (asRecord(raw.verification) as SellerVerificationMetadata | null) ?? null;
  const scoring = (asRecord(raw.scoring) as SellerScoringMetadata | null) ?? null;
  const aiInsight =
    (asRecord(scoring?.ai_insight) as SellerAiInsight | null) ?? null;
  const sellerChat = (asRecord(raw.seller_chat) as SellerChatMetadata | null) ?? null;
  const sellerChatInternal =
    (asRecord(sellerChat?.internal) as SellerChatInternalMetadata | null) ?? null;
  const sellerChatMessages = Array.isArray(sellerChat?.messages)
    ? sellerChat.messages.filter(isSellerChatMessage)
    : [];

  return {
    raw,
    identity,
    valuation,
    propertyDetails,
    verification,
    scoring,
    aiInsight,
    sellerChat,
    sellerChatInternal,
    sellerChatMessages,
  };
};

export const mergeSellerMetadata = (
  current: unknown,
  patch: Partial<{
    identity: SellerIdentityMetadata | null;
    valuation: SellerValuationMetadata | null;
    property_details: SellerPropertyDetailsMetadata | null;
    verification: SellerVerificationMetadata | null;
    scoring: SellerScoringMetadata | null;
    seller_chat: SellerChatMetadata | null;
  }>
) => {
  const base = getSellerMetadataSections(current).raw;
  const next: SellerLeadMetadata = { ...base };

  if ("identity" in patch) next.identity = patch.identity ?? undefined;
  if ("valuation" in patch) next.valuation = patch.valuation ?? undefined;
  if ("property_details" in patch) next.property_details = patch.property_details ?? undefined;
  if ("verification" in patch) next.verification = patch.verification ?? undefined;
  if ("scoring" in patch) next.scoring = patch.scoring ?? undefined;
  if ("seller_chat" in patch) next.seller_chat = patch.seller_chat ?? undefined;

  return next;
};

export const buildSellerPropertyDetails = (input: {
  livingArea?: unknown;
  rooms?: unknown;
  bedrooms?: unknown;
  floor?: unknown;
  buildingTotalFloors?: unknown;
  condition?: unknown;
  elevator?: unknown;
  apartmentCondition?: unknown;
  buildingAge?: unknown;
  seaView?: unknown;
  terrace?: unknown;
  terraceArea?: unknown;
  balcony?: unknown;
  balconyArea?: unknown;
  livingExposure?: unknown;
  projectTemporality?: unknown;
  loupeSupportedInputs?: unknown;
  loupeExtraInputs?: unknown;
  valuationLow?: unknown;
  valuationHigh?: unknown;
  notes?: unknown;
  updatedAt?: string;
}) => {
  return {
    living_area: toNumberOrNull(input.livingArea),
    rooms: toNumberOrNull(input.rooms),
    bedrooms: toNumberOrNull(input.bedrooms),
    floor: toStringOrNull(input.floor),
    building_total_floors: toNumberOrNull(input.buildingTotalFloors),
    is_top_floor: computeIsTopFloor(input.floor, input.buildingTotalFloors),
    condition: toStringOrNull(input.condition),
    elevator: typeof input.elevator === "boolean" ? input.elevator : null,
    apartment_condition: toStringOrNull(input.apartmentCondition),
    building_age: toStringOrNull(input.buildingAge),
    sea_view: toStringOrNull(input.seaView),
    terrace: typeof input.terrace === "boolean" ? input.terrace : null,
    terrace_area: toNumberOrNull(input.terraceArea),
    balcony: typeof input.balcony === "boolean" ? input.balcony : null,
    balcony_area: toNumberOrNull(input.balconyArea),
    living_exposure: toStringOrNull(input.livingExposure),
    loupe_supported_inputs: (asRecord(input.loupeSupportedInputs) as Record<string, unknown> | null) ?? null,
    loupe_extra_inputs: (asRecord(input.loupeExtraInputs) as Record<string, unknown> | null) ?? null,
    project_temporality: toStringOrNull(input.projectTemporality),
    valuation_low: toNumberOrNull(input.valuationLow),
    valuation_high: toNumberOrNull(input.valuationHigh),
    notes: toStringOrNull(input.notes),
    updated_at: input.updatedAt ?? new Date().toISOString(),
  } satisfies SellerPropertyDetailsMetadata;
};
