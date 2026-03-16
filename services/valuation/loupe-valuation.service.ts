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

type PlaceSearchItem = {
  code: string;
  name: string;
  type: string;
  data: {
    cityName?: string;
    cityZipCode?: string;
  };
};

const normalizePlaces = (payload: unknown) => {
  const root = asRecord(payload) ?? {};
  const data = Array.isArray(root.data) ? root.data : [];
  const out: PlaceSearchItem[] = [];
  for (const item of data) {
    const row = asRecord(item);
    if (!row) continue;
    const code = asString(row.code);
    const name = asString(row.name);
    const type = asString(row.type);
    const nested = asRecord(row.data) ?? {};
    if (!code || !name || !type) continue;
    out.push({
      code,
      name,
      type,
      data: {
        cityName: asString(nested.cityName) ?? undefined,
        cityZipCode: asString(nested.cityZipCode) ?? undefined,
      },
    });
  }
  return out;
};

const selectBestAddressPlace = (input: LoupeValuationInput, places: PlaceSearchItem[]) => {
  const expectedAddress = normalizeForMatch(input.addressLabel);
  const expectedCity = normalizeForMatch(input.cityName);
  const expectedPostal = normalizeForMatch(input.cityZipCode);
  const scored = places
    .filter((item) => item.type === "address")
    .map((item) => {
      const city = normalizeForMatch(item.data.cityName ?? null);
      const postal = normalizeForMatch(item.data.cityZipCode ?? null);
      const name = normalizeForMatch(item.name);
      let points = 0;
      if (expectedCity && city && expectedCity === city) points += 3;
      if (expectedPostal && postal && expectedPostal === postal) points += 5;
      if (expectedAddress && name && (name.includes(expectedAddress) || expectedAddress.includes(name))) {
        points += 6;
      }
      points += getSharedAddressTokenCount(input.addressLabel, item.name) * 2;
      return { points, item };
    });

  scored.sort((left, right) => right.points - left.points);
  return scored[0]?.item ?? null;
};

type PlaceTreeAddress = {
  addressLabel: string | null;
  cityName: string | null;
  cityZipCode: string | null;
  cadastreCode: string | null;
};

const normalizePlaceTreeAddress = (payload: unknown): PlaceTreeAddress => {
  const root = asRecord(payload) ?? {};
  const data = asRecord(root.data) ?? {};
  const address = asRecord(data.address) ?? {};
  return {
    addressLabel: asString(address.label),
    cityName: asString(address.cityName),
    cityZipCode: asString(address.cityZipCode),
    cadastreCode: asString(address.cadastreCode),
  };
};

type WhiteLabelConfig = {
  slug: string;
  priceCentil: number;
  priceLowCentil: number;
  priceHighCentil: number;
};

const getWhiteLabelConfig = async (): Promise<WhiteLabelConfig> => {
  const fallbackSlug = process.env.NEXT_PUBLIC_WLV_WIDGET_KEY ?? "Y2MtMjg0MA==";
  const fallback: WhiteLabelConfig = {
    slug: fallbackSlug,
    priceCentil: 50,
    priceLowCentil: 35,
    priceHighCentil: 65,
  };
  const result = await loupeClient.getWhiteLabelValuationConfig(fallbackSlug);
  if (!result.response.ok) {
    return fallback;
  }
  const root = asRecord(result.payload) ?? {};
  const data = asRecord(root.data) ?? {};
  return {
    slug: asString(data.slug) ?? fallback.slug,
    priceCentil: asNumber(data.priceCentil) ?? fallback.priceCentil,
    priceLowCentil: asNumber(data.priceLowCentil) ?? fallback.priceLowCentil,
    priceHighCentil: asNumber(data.priceHighCentil) ?? fallback.priceHighCentil,
  };
};

const buildSaleProjectPayload = (
  input: LoupeValuationInput,
  address: PlaceTreeAddress,
  config: WhiteLabelConfig
) => {
  const refererBase = process.env.PUBLIC_SITE_URL || "https://www.sillage-immo.com";
  const payload: Record<string, unknown> = {
    whiteLabelValuationConfig: config.slug,
    priceCentil: config.priceCentil,
    priceLowCentil: config.priceLowCentil,
    priceHighCentil: config.priceHighCentil,
    allowShare: true,
    referer: `${refererBase.replace(/\/$/, "")}/estimation`,
    addressLabel: address.addressLabel ?? input.addressLabel,
    cityName: address.cityName ?? input.cityName,
    cityZipCode: address.cityZipCode ?? input.cityZipCode,
    type: mapPropertyType(input.propertyType),
    state: "old",
    surface: input.livingArea ?? undefined,
    rooms:
      typeof input.rooms === "number" && Number.isFinite(input.rooms)
        ? String(Math.round(input.rooms))
        : undefined,
    floor: input.floor ?? undefined,
  };

  if (address.cadastreCode) {
    payload.cadastreCode = address.cadastreCode;
  }
  return payload;
};

const normalizeSaleProjectEstimate = (
  input: LoupeValuationInput,
  address: PlaceTreeAddress,
  payload: unknown
): LoupeValuationResult => {
  const root = asRecord(payload) ?? {};
  const data = asRecord(root.data) ?? root;
  return {
    addressAnalysisId: null,
    addressLabel: address.addressLabel ?? input.addressLabel,
    cityName: address.cityName ?? input.cityName,
    cityZipCode: address.cityZipCode ?? input.cityZipCode,
    type: mapPropertyType(input.propertyType),
    state: "old",
    livingSpaceArea: input.livingArea ?? null,
    rooms: input.rooms ?? null,
    floor: input.floor ?? null,
    valuationPrice: asNumber(data.price),
    valuationPriceLow: asNumber(data.priceLow) ?? asNumber(data.price_low),
    valuationPriceHigh: asNumber(data.priceHigh) ?? asNumber(data.price_high),
  };
};

const computeViaSaleProjectEstimate = async (
  input: LoupeValuationInput
): Promise<LoupeValuationResult | null> => {
  const query = [input.addressLabel, input.cityZipCode, input.cityName].filter(Boolean).join(" ");
  const placesResult = await loupeClient.searchPlaces(query);
  if (!placesResult.response.ok) return null;

  const places = normalizePlaces(placesResult.payload);
  const bestAddress = selectBestAddressPlace(input, places);
  if (!bestAddress?.code) return null;

  const placeTreeResult = await loupeClient.getPlaceTree(bestAddress.code, true);
  if (!placeTreeResult.response.ok) return null;
  const address = normalizePlaceTreeAddress(placeTreeResult.payload);
  if (!matchesRequestedAddress(input, { ...address, addressAnalysisId: null, type: null, state: null, livingSpaceArea: null, rooms: null, floor: null, valuationPrice: null, valuationPriceLow: null, valuationPriceHigh: null })) {
    return null;
  }

  const config = await getWhiteLabelConfig();
  const estimatePayload = buildSaleProjectPayload(input, address, config);
  const estimateResult = await loupeClient.estimateSaleProject(estimatePayload);
  if (!estimateResult.response.ok) return null;

  return normalizeSaleProjectEstimate(input, address, estimateResult.payload);
};

const computeViaLegacyAddressAnalysis = async (
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

export const computeLoupeValuation = async (
  input: LoupeValuationInput
): Promise<LoupeValuationResult> => {
  try {
    const result = await computeViaSaleProjectEstimate(input);
    if (result) return result;
  } catch {
    // fallback on legacy endpoint below
  }

  return computeViaLegacyAddressAnalysis(input);
};
