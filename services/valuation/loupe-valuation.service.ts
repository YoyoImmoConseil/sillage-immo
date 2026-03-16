import { loupeClient } from "./loupe-client";

export type LoupeValuationInput = {
  addressLabel: string;
  cityName: string;
  cityZipCode: string;
  propertyType: "appartement" | "maison" | "villa" | "autre";
  livingArea?: number;
  rooms?: number;
  floor?: string;
  message?: string;
};

export type LoupeValuationResult = {
  addressAnalysisId: string | null;
  addressLabel: string | null;
  cityName: string | null;
  cityZipCode: string | null;
  type: string | null;
  state: string | null;
  livingSpaceArea: number | null;
  rooms: number | null;
  floor: string | null;
  valuationPrice: number | null;
  valuationPriceLow: number | null;
  valuationPriceHigh: number | null;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : null;

const asString = (value: unknown) => (typeof value === "string" ? value : null);
const asNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const POLL_ATTEMPTS = 12;
const POLL_INTERVAL_MS = 1200;
const ADDRESS_NOISE_TOKENS = new Set([
  "a",
  "au",
  "aux",
  "bd",
  "boulevard",
  "chemin",
  "de",
  "des",
  "du",
  "impasse",
  "la",
  "le",
  "les",
  "lotissement",
  "place",
  "quartier",
  "residence",
  "rte",
  "route",
  "rue",
  "square",
  "villa",
  "voie",
  "avenue",
  "av",
]);

const mapPropertyType = (value: LoupeValuationInput["propertyType"]) => {
  switch (value) {
    case "appartement":
      return "apt";
    case "maison":
    case "villa":
      return "house";
    default:
      return "other";
  }
};

const extractId = (payload: unknown) => {
  const record = asRecord(payload);
  if (!record) return null;

  const toIdString = (value: unknown) => {
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    return null;
  };

  const direct = toIdString(record.id);
  if (direct) return direct;

  const data = asRecord(record.data);
  if (data) {
    const nested = toIdString(data.id);
    if (nested) return nested;
  }
  return null;
};

const normalize = (id: string | null, payload: unknown): LoupeValuationResult => {
  const root = asRecord(payload) ?? {};
  const data = asRecord(root.data) ?? root;
  const realEstate = asRecord(data.realEstate) ?? asRecord(data.real_estate) ?? {};
  const valuation = asRecord(data.valuation) ?? {};
  const valuationData = asRecord(valuation.data) ?? valuation;

  const valuationPrice =
    asNumber(valuationData.price) ??
    asNumber(valuationData.valuationPrice) ??
    asNumber(valuationData.valuation_price);
  const valuationPriceLow =
    asNumber(valuationData.priceLow) ??
    asNumber(valuationData.price_low) ??
    asNumber(valuationData.valuationPriceLow) ??
    asNumber(valuationData.valuation_price_low);
  const valuationPriceHigh =
    asNumber(valuationData.priceHigh) ??
    asNumber(valuationData.price_high) ??
    asNumber(valuationData.valuationPriceHigh) ??
    asNumber(valuationData.valuation_price_high);

  return {
    addressAnalysisId: id,
    addressLabel: asString(data.addressLabel) ?? asString(data.address_label),
    cityName: asString(data.cityName) ?? asString(data.city_name),
    cityZipCode: asString(data.cityZipCode) ?? asString(data.city_zip_code),
    type: asString(data.type),
    state: asString(data.state),
    livingSpaceArea:
      asNumber(realEstate.livingSpaceArea) ?? asNumber(realEstate.living_space_area),
    rooms: asNumber(realEstate.rooms) ?? asNumber(realEstate.nb_rooms),
    floor: asString(realEstate.floor),
    valuationPrice,
    valuationPriceLow,
    valuationPriceHigh,
  };
};

const normalizeForMatch = (value: string | null | undefined) => {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const tokenizeAddress = (value: string | null | undefined) => {
  return normalizeForMatch(value)
    .split(" ")
    .filter((token) => token.length > 0 && !ADDRESS_NOISE_TOKENS.has(token));
};

const extractStreetNumber = (value: string | null | undefined) => {
  return tokenizeAddress(value).find((token) => /^\d+[a-z]?$/i.test(token)) ?? null;
};

const getSharedAddressTokenCount = (left: string | null | undefined, right: string | null | undefined) => {
  const leftTokens = tokenizeAddress(left);
  const rightTokens = new Set(tokenizeAddress(right));
  return leftTokens.filter((token) => rightTokens.has(token)).length;
};

const matchesRequestedAddress = (input: LoupeValuationInput, result: LoupeValuationResult) => {
  const expectedCity = normalizeForMatch(input.cityName);
  const candidateCity = normalizeForMatch(result.cityName);
  if (expectedCity && candidateCity && expectedCity !== candidateCity) {
    return false;
  }

  const expectedPostal = normalizeForMatch(input.cityZipCode);
  const candidatePostal = normalizeForMatch(result.cityZipCode);
  if (expectedPostal && candidatePostal && expectedPostal !== candidatePostal) {
    return false;
  }

  const expectedAddress = normalizeForMatch(input.addressLabel);
  const candidateAddress = normalizeForMatch(result.addressLabel);
  if (!expectedAddress || !candidateAddress) {
    return false;
  }

  if (candidateAddress.includes(expectedAddress) || expectedAddress.includes(candidateAddress)) {
    return true;
  }

  const expectedNumber = extractStreetNumber(input.addressLabel);
  const candidateNumber = extractStreetNumber(result.addressLabel);
  if (expectedNumber && candidateNumber && expectedNumber !== candidateNumber) {
    return false;
  }

  const sharedTokenCount = getSharedAddressTokenCount(input.addressLabel, result.addressLabel);
  if (sharedTokenCount >= 2) {
    return true;
  }

  return Boolean(sharedTokenCount >= 1 && expectedNumber && candidateNumber);
};

const hasAnyPrice = (valuation: LoupeValuationResult) => {
  return Boolean(
    valuation.valuationPrice !== null ||
      valuation.valuationPriceLow !== null ||
      valuation.valuationPriceHigh !== null
  );
};

export const computeLoupeValuation = async (
  input: LoupeValuationInput
): Promise<LoupeValuationResult> => {
  const payload = {
    addressLabel: input.addressLabel,
    cityName: input.cityName,
    cityZipCode: input.cityZipCode,
    type: mapPropertyType(input.propertyType),
    state: "old",
    realEstate: {
      livingSpaceArea: input.livingArea ?? undefined,
      rooms: input.rooms ?? undefined,
      floor: input.floor ?? undefined,
      description: input.message ?? undefined,
    },
  };

  const create = await loupeClient.createAddressAnalysis(payload);
  if (!create.response.ok) {
    throw new Error(
      `Loupe create address-analysis failed (${create.response.status}).`
    );
  }

  const id = extractId(create.payload);
  const createNormalized = normalize(id, create.payload);
  if (!id) {
    return createNormalized;
  }

  const detail = await loupeClient.getAddressAnalysisById(id);
  if (!detail.response.ok) return createNormalized;

  let normalized = normalize(id, detail.payload);
  if (!matchesRequestedAddress(input, normalized)) {
    return createNormalized;
  }
  if (hasAnyPrice(normalized)) {
    return normalized;
  }

  // Some providers compute the final valuation asynchronously.
  // Poll longer so the first user flow returns a price more often.
  for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
    await sleep(POLL_INTERVAL_MS);
    const next = await loupeClient.getAddressAnalysisById(id);
    if (!next.response.ok) continue;
    normalized = normalize(id, next.payload);
    if (!matchesRequestedAddress(input, normalized)) {
      return createNormalized;
    }
    if (hasAnyPrice(normalized)) return normalized;
  }

  return normalized;
};
