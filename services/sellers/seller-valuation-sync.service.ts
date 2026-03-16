import { supabaseAdmin } from "@/lib/supabase/admin";
import { loupeClient } from "@/services/valuation/loupe-client";

type AddressAnalysisNormalized = {
  id: string | null;
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

type SellerValuationSyncResult = {
  synced: boolean;
  source: "search_email" | "search_phone" | "lead_id" | "lead_search";
  normalized: AddressAnalysisNormalized;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
};

const asString = (value: unknown) => (typeof value === "string" ? value : null);
const asNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const normalized = Number(value.replace(",", "."));
    return Number.isFinite(normalized) ? normalized : null;
  }
  return null;
};
const pickNumber = (...values: unknown[]) => {
  for (const value of values) {
    const n = asNumber(value);
    if (n !== null) return n;
  }
  return null;
};

const pickArray = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  if (!record) return [];

  const keys = [
    "data",
    "items",
    "results",
    "rows",
    "collection",
    "hydra:member",
    "member",
  ];
  for (const key of keys) {
    const candidate = record[key];
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
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

const computeAddressMatchScore = (
  expected: { address: string | null; city: string | null; postalCode: string | null },
  candidate: AddressAnalysisNormalized
) => {
  let score = 0;
  const expectedAddress = normalizeForMatch(expected.address);
  const candidateAddress = normalizeForMatch(candidate.addressLabel);
  const expectedCity = normalizeForMatch(expected.city);
  const candidateCity = normalizeForMatch(candidate.cityName);
  const expectedPostal = normalizeForMatch(expected.postalCode);
  const candidatePostal = normalizeForMatch(candidate.cityZipCode);

  if (expectedPostal && candidatePostal && expectedPostal === candidatePostal) score += 5;
  if (expectedCity && candidateCity && expectedCity === candidateCity) score += 3;
  if (
    expectedAddress &&
    candidateAddress &&
    (candidateAddress.includes(expectedAddress) || expectedAddress.includes(candidateAddress))
  ) {
    score += 6;
  }
  score += getSharedAddressTokenCount(expected.address, candidate.addressLabel) * 2;

  return score;
};

const isAddressMatchStrongEnough = (
  expected: { address: string | null; city: string | null; postalCode: string | null },
  candidate: AddressAnalysisNormalized
) => {
  const expectedCity = normalizeForMatch(expected.city);
  const candidateCity = normalizeForMatch(candidate.cityName);
  if (expectedCity && candidateCity && expectedCity !== candidateCity) {
    return false;
  }

  const expectedPostal = normalizeForMatch(expected.postalCode);
  const candidatePostal = normalizeForMatch(candidate.cityZipCode);
  if (expectedPostal && candidatePostal && expectedPostal !== candidatePostal) {
    return false;
  }

  const expectedAddress = normalizeForMatch(expected.address);
  const candidateAddress = normalizeForMatch(candidate.addressLabel);
  if (!expectedAddress || !candidateAddress) {
    return Boolean(expectedCity && candidateCity && expectedPostal && candidatePostal);
  }

  if (candidateAddress.includes(expectedAddress) || expectedAddress.includes(candidateAddress)) {
    return true;
  }

  const expectedNumber = extractStreetNumber(expected.address);
  const candidateNumber = extractStreetNumber(candidate.addressLabel);
  if (expectedNumber && candidateNumber && expectedNumber !== candidateNumber) {
    return false;
  }

  const sharedTokenCount = getSharedAddressTokenCount(expected.address, candidate.addressLabel);
  if (sharedTokenCount >= 2) {
    return true;
  }

  return Boolean(sharedTokenCount >= 1 && expectedNumber && candidateNumber);
};

const pickAddressAnalysisId = (candidate: Record<string, unknown>): string | null => {
  const direct = asString(candidate.id);
  if (direct) return direct;

  const nested = asRecord(candidate.addressAnalysis) ?? asRecord(candidate.address_analysis);
  if (nested) {
    const nestedId = asString(nested.id);
    if (nestedId) return nestedId;
  }
  return null;
};

const normalizeAddressAnalysis = (
  id: string | null,
  rawPayload: unknown
): AddressAnalysisNormalized => {
  const root = asRecord(rawPayload) ?? {};
  const realEstate = asRecord(root.realEstate) ?? asRecord(root.real_estate) ?? {};
  const valuation = asRecord(root.valuation) ?? {};

  return {
    id,
    addressLabel: asString(root.addressLabel) ?? asString(root.address_label),
    cityName: asString(root.cityName) ?? asString(root.city_name),
    cityZipCode: asString(root.cityZipCode) ?? asString(root.city_zip_code),
    type: asString(root.type),
    state: asString(root.state),
    livingSpaceArea:
      asNumber(realEstate.livingSpaceArea) ?? asNumber(realEstate.living_space_area),
    rooms: asNumber(realEstate.rooms),
    floor: asString(realEstate.floor),
    valuationPrice: asNumber(valuation.price),
    valuationPriceLow: asNumber(valuation.priceLow) ?? asNumber(valuation.price_low),
    valuationPriceHigh: asNumber(valuation.priceHigh) ?? asNumber(valuation.price_high),
  };
};

const fetchBestAddressAnalysis = async (
  searchString: string,
  expected: { address: string | null; city: string | null; postalCode: string | null }
) => {
  const search = await loupeClient.searchAddressAnalyses(searchString);
  if (!search.response.ok) {
    throw new Error(
      `Loupe address-analysis search failed (${search.response.status}).`
    );
  }

  const list = pickArray(search.payload);
  const first = asRecord(list[0]);
  if (!first) return null;

  const id = pickAddressAnalysisId(first);
  if (!id) {
    const normalized = normalizeAddressAnalysis(null, first);
    return isAddressMatchStrongEnough(expected, normalized) ? normalized : null;
  }

  const detail = await loupeClient.getAddressAnalysisById(id);
  if (!detail.response.ok) {
    const normalized = normalizeAddressAnalysis(id, first);
    return isAddressMatchStrongEnough(expected, normalized) ? normalized : null;
  }

  const normalized = normalizeAddressAnalysis(id, detail.payload);
  return isAddressMatchStrongEnough(expected, normalized) ? normalized : null;
};

const normalizeFromLoupeLead = (rawPayload: unknown): AddressAnalysisNormalized => {
  const root = asRecord(rawPayload) ?? {};
  const data = asRecord(root.data) ?? root;
  const referencedObjectDetails =
    asRecord(data.referencedObjectDetails) ??
    asRecord(data.referenced_object_details) ??
    {};
  const valuationResult =
    asRecord(referencedObjectDetails.valuationResult) ??
    asRecord(referencedObjectDetails.valuation_result) ??
    {};

  return {
    id:
      asString(data.id) ??
      (typeof data.id === "number" ? String(data.id) : null) ??
      asString(referencedObjectDetails.id),
    addressLabel:
      asString(referencedObjectDetails.addressLabel) ??
      asString(referencedObjectDetails.address_label) ??
      asString(referencedObjectDetails.address),
    cityName:
      asString(referencedObjectDetails.cityName) ??
      asString(referencedObjectDetails.city_name) ??
      asString(referencedObjectDetails.city),
    cityZipCode:
      asString(referencedObjectDetails.cityZipCode) ??
      asString(referencedObjectDetails.city_zip_code) ??
      asString(referencedObjectDetails.zipCode) ??
      asString(referencedObjectDetails.zip_code) ??
      asString(referencedObjectDetails.postalCode) ??
      asString(referencedObjectDetails.postal_code),
    type:
      asString(referencedObjectDetails.type) ??
      asString(referencedObjectDetails.propertyType) ??
      asString(referencedObjectDetails.property_type),
    state: asString(referencedObjectDetails.state),
    livingSpaceArea: pickNumber(
      referencedObjectDetails.livingSpaceArea,
      referencedObjectDetails.living_space_area,
      referencedObjectDetails.surface
    ),
    rooms: pickNumber(referencedObjectDetails.rooms, referencedObjectDetails.nb_rooms),
    floor: asString(referencedObjectDetails.floor),
    valuationPrice: pickNumber(
      valuationResult.price,
      valuationResult.valuationPrice,
      valuationResult.valuation_price,
      valuationResult.value
    ),
    valuationPriceLow: pickNumber(
      valuationResult.priceLow,
      valuationResult.price_low,
      valuationResult.valuationPriceLow,
      valuationResult.valuation_price_low,
      valuationResult.minPrice,
      valuationResult.min_price
    ),
    valuationPriceHigh: pickNumber(
      valuationResult.priceHigh,
      valuationResult.price_high,
      valuationResult.valuationPriceHigh,
      valuationResult.valuation_price_high,
      valuationResult.maxPrice,
      valuationResult.max_price
    ),
  };
};

const hasValuation = (value: AddressAnalysisNormalized) => {
  return Boolean(
    value.valuationPrice !== null ||
      value.valuationPriceLow !== null ||
      value.valuationPriceHigh !== null
  );
};

const fetchFromLoupeLeadById = async (loupeLeadId: string) => {
  const response = await loupeClient.getLeadById(loupeLeadId);
  if (!response.response.ok) {
    throw new Error(`Loupe lead fetch failed (${response.response.status}).`);
  }
  return normalizeFromLoupeLead(response.payload);
};

const fetchBestLoupeLeadBySearch = async (
  searchString: string,
  expected: { address: string | null; city: string | null; postalCode: string | null }
) => {
  const response = await loupeClient.searchLeads(searchString);
  if (!response.response.ok) {
    throw new Error(`Loupe lead search failed (${response.response.status}).`);
  }

  const list = pickArray(response.payload)
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => Boolean(item));

  if (list.length === 0) return null;

  const scored = list.map((item) => {
    const normalized = normalizeFromLoupeLead(item);
    const origin = asString(item.origin) ?? "";
    const addressMatchScore = computeAddressMatchScore(expected, normalized);
    const points =
      (origin === "wlv" ? 4 : 0) +
      (hasValuation(normalized) ? 3 : 0) +
      (normalized.addressLabel ? 1 : 0) +
      addressMatchScore;
    return { points, addressMatchScore, normalized };
  });

  scored.sort((a, b) => b.points - a.points);
  const best = scored[0];
  if (!best) return null;
  // Guardrail: avoid linking an unrelated historical lead.
  if (!isAddressMatchStrongEnough(expected, best.normalized)) return null;
  return best.normalized;
};

export const syncSellerValuationFromLoupe = async (
  sellerLeadId: string,
  options?: { loupeLeadId?: string }
): Promise<SellerValuationSyncResult> => {
  const { data: lead, error: leadError } = await supabaseAdmin
    .from("seller_leads")
    .select(
      "id, full_name, email, phone, property_type, property_address, city, postal_code, metadata"
    )
    .eq("id", sellerLeadId)
    .maybeSingle();

  if (leadError || !lead) {
    throw new Error(leadError?.message ?? "Lead vendeur introuvable.");
  }

  const searchCandidates: Array<{
    source: SellerValuationSyncResult["source"];
    query: string;
  }> = [];

  const pushCandidate = (
    source: SellerValuationSyncResult["source"],
    raw: string | null | undefined
  ) => {
    const query = (raw ?? "").trim();
    if (query.length >= 3) {
      searchCandidates.push({ source, query });
    }
  };

  pushCandidate("search_email", lead.email.toLowerCase());
  pushCandidate("search_phone", lead.phone);
  pushCandidate("search_email", lead.full_name);
  pushCandidate("search_email", lead.property_address);
  pushCandidate(
    "search_email",
    [lead.property_address, lead.postal_code, lead.city].filter(Boolean).join(" ")
  );

  let normalized: AddressAnalysisNormalized | null = null;
  let source: SellerValuationSyncResult["source"] = "search_email";

  const explicitLoupeLeadId = options?.loupeLeadId?.trim();
  if (explicitLoupeLeadId) {
    const byLead = await fetchFromLoupeLeadById(explicitLoupeLeadId);
    if (!hasValuation(byLead)) {
      throw new Error(
        "Le lead Loupe est trouve mais valuationResult est vide. Verifiez que ce lead provient du widget et que le calcul est termine."
      );
    }
    if (
      !isAddressMatchStrongEnough(
        {
          address: lead.property_address ?? null,
          city: lead.city ?? null,
          postalCode: lead.postal_code ?? null,
        },
        byLead
      )
    ) {
      throw new Error(
        "Le lead Loupe fourni ne correspond pas suffisamment a l'adresse du bien vendeur."
      );
    }
    normalized = byLead;
    source = "lead_id";
  }

  if (!normalized) {
    const leadSearchCandidates = [
      lead.email,
      lead.phone,
      lead.full_name,
      [lead.property_address, lead.postal_code, lead.city].filter(Boolean).join(" "),
    ].filter((value): value is string => Boolean(value && value.trim().length >= 3));

    for (const query of leadSearchCandidates) {
      const foundLead = await fetchBestLoupeLeadBySearch(query, {
        address: lead.property_address ?? null,
        city: lead.city ?? null,
        postalCode: lead.postal_code ?? null,
      });
      if (foundLead && hasValuation(foundLead)) {
        normalized = foundLead;
        source = "lead_search";
        break;
      }
    }
  }

  if (!normalized) {
    for (const candidate of searchCandidates) {
      const found = await fetchBestAddressAnalysis(candidate.query, {
        address: lead.property_address ?? null,
        city: lead.city ?? null,
        postalCode: lead.postal_code ?? null,
      });
      if (found) {
        normalized = found;
        source = candidate.source;
        break;
      }
    }
  }

  if (!normalized) {
    throw new Error("Aucune estimation Loupe trouvee pour ce lead.");
  }

  const currentMetadata =
    lead.metadata && typeof lead.metadata === "object"
      ? (lead.metadata as Record<string, unknown>)
      : {};

  const nextMetadata: Record<string, unknown> = {
    ...currentMetadata,
    valuation: {
      provider: "loupe",
      synced_at: new Date().toISOString(),
      source,
      normalized,
    },
  };

  const nextPropertyDetails: Record<string, unknown> = {
    living_area: normalized.livingSpaceArea,
    rooms: normalized.rooms,
    floor: normalized.floor,
    valuation_price: normalized.valuationPrice,
    valuation_low: normalized.valuationPriceLow,
    valuation_high: normalized.valuationPriceHigh,
  };

  const mergedPropertyDetails = {
    ...(asRecord(currentMetadata.property_details) ?? {}),
    ...Object.fromEntries(
      Object.entries(nextPropertyDetails).filter(([, value]) => value !== null)
    ),
    updated_at: new Date().toISOString(),
  };

  nextMetadata.property_details = mergedPropertyDetails;

  const { error: updateError } = await supabaseAdmin
    .from("seller_leads")
    .update({
      metadata: nextMetadata,
      property_type: lead.property_type ?? normalized.type ?? undefined,
      property_address: lead.property_address ?? normalized.addressLabel ?? undefined,
      city: lead.city ?? normalized.cityName ?? undefined,
      postal_code: lead.postal_code ?? normalized.cityZipCode ?? undefined,
    })
    .eq("id", sellerLeadId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return {
    synced: true,
    source,
    normalized,
  };
};
