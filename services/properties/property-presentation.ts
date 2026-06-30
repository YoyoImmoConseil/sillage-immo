import type { Database } from "@/types/db/supabase";
import type {
  PropertyCondoSnapshot,
  PropertyEnergySnapshot,
  PropertyFeeChargeBearer,
  PropertySaleSnapshot,
} from "@/types/domain/properties";

type PropertyRow = Database["public"]["Tables"]["properties"]["Row"];

const asRecord = (value: unknown): Record<string, unknown> | null => {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
};

const asString = (value: unknown) => {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
};

const asNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const asBoolean = (value: unknown) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1 ? true : value === 0 ? false : null;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "oui"].includes(normalized)) return true;
    if (["false", "0", "no", "non"].includes(normalized)) return false;
  }
  return null;
};

const normalizeOrientation = (value: string | null) => {
  const normalized = value?.trim().toUpperCase() ?? null;
  switch (normalized) {
    case "N":
      return "Nord";
    case "NE":
      return "Nord-Est";
    case "E":
      return "Est";
    case "SE":
      return "Sud-Est";
    case "S":
      return "Sud";
    case "SO":
    case "SW":
      return "Sud-Ouest";
    case "O":
    case "W":
      return "Ouest";
    case "NO":
    case "NW":
      return "Nord-Ouest";
    default:
      return value;
  }
};

const getNestedNumber = (root: Record<string, unknown> | null, path: string[]) => {
  let current: unknown = root;
  for (const key of path) {
    current = asRecord(current)?.[key];
  }
  return asNumber(current);
};

const countAmenitiesMatch = (root: Record<string, unknown> | null, tokens: string[]) => {
  const amenities = Array.isArray(root?.amenities)
    ? root?.amenities.filter((value): value is string => typeof value === "string")
    : [];
  return amenities.some((item) => {
    const normalized = item.trim().toLowerCase();
    return tokens.some((token) => normalized.includes(token));
  });
};

const inferFeeChargeBearer = (rawPayload: Record<string, unknown> | null): PropertyFeeChargeBearer => {
  const buyerFixedFee = asNumber(rawPayload?.buyer_fixed_fee);
  const buyerPercentage = asNumber(rawPayload?.buyer_percentage);
  if ((buyerFixedFee ?? 0) > 0 || (buyerPercentage ?? 0) > 0) {
    return "buyer";
  }

  const vendorFixedFee = asNumber(rawPayload?.vendor_fixed_fee);
  const vendorPercentage = asNumber(rawPayload?.vendor_percentage);
  if ((vendorFixedFee ?? 0) > 0 || (vendorPercentage ?? 0) > 0) {
    return "vendor";
  }

  return null;
};

const computeFeeAmount = (
  rawPayload: Record<string, unknown> | null,
  priceAmount: number | null,
  feeChargeBearer: PropertyFeeChargeBearer
) => {
  if (!rawPayload || feeChargeBearer === null) return null;

  const fixedFee =
    feeChargeBearer === "buyer"
      ? asNumber(rawPayload.buyer_fixed_fee)
      : asNumber(rawPayload.vendor_fixed_fee);
  if ((fixedFee ?? 0) > 0) {
    return Math.round(fixedFee as number);
  }

  const percentage =
    feeChargeBearer === "buyer"
      ? asNumber(rawPayload.buyer_percentage)
      : asNumber(rawPayload.vendor_percentage);
  if ((percentage ?? 0) > 0 && (priceAmount ?? 0) > 0) {
    return Math.round((priceAmount as number) * ((percentage as number) / 100));
  }

  const agencyCommission = asRecord(rawPayload.agency_commission);
  const fallbackFixedFee = asNumber(agencyCommission?.fixed_fee);
  if ((fallbackFixedFee ?? 0) > 0) {
    return Math.round(fallbackFixedFee as number);
  }

  const fallbackPercentage = asNumber(agencyCommission?.percentage);
  if ((fallbackPercentage ?? 0) > 0 && (priceAmount ?? 0) > 0) {
    return Math.round((priceAmount as number) * ((fallbackPercentage as number) / 100));
  }

  return null;
};

export const buildPropertySaleSnapshot = (property: PropertyRow, priceAmount: number | null): PropertySaleSnapshot => {
  const rawPayload = asRecord(property.raw_payload);
  const feeChargeBearer = inferFeeChargeBearer(rawPayload);
  return {
    feeChargeBearer,
    feeAmount: computeFeeAmount(rawPayload, priceAmount, feeChargeBearer),
    priceIncludesFees: true,
  };
};

export const buildPropertyEnergySnapshot = (property: PropertyRow): PropertyEnergySnapshot => {
  const energy = asRecord(asRecord(property.legal)?.energy);
  return {
    dpeValue: asNumber(energy?.epc_value) ?? asNumber(energy?.epc_score),
    dpeLabel:
      asString(energy?.dpe) ??
      asString(energy?.energy_dpe) ??
      asString(energy?.epc_category) ??
      null,
    gesValue: asNumber(energy?.co2_emissions),
    gesLabel: asString(energy?.greenhouse_emissions) ?? null,
  };
};

export const buildPropertyCondoSnapshot = (property: PropertyRow): PropertyCondoSnapshot => {
  const rawPayload = asRecord(property.raw_payload);
  return {
    lotCount:
      getNestedNumber(rawPayload, ["building", "construction", "residential_lots"]) ??
      getNestedNumber(rawPayload, ["building", "units_of_building"]),
    annualCharges: getNestedNumber(rawPayload, ["price_yearly_budgeted_building_costs", "amount"]),
  };
};

export const buildPropertyDerivedFields = (property: PropertyRow, priceAmount: number | null) => {
  const rawPayload = asRecord(property.raw_payload);
  const explicitLivingRooms = asNumber(rawPayload?.living_rooms);
  const explicitBedrooms = asNumber(rawPayload?.bedrooms);
  const bedrooms = explicitBedrooms ?? property.bedrooms;
  const hasExplicitRoomInputs =
    typeof explicitBedrooms === "number" || typeof explicitLivingRooms === "number";
  const roomCount = hasExplicitRoomInputs
    ? (explicitBedrooms ?? 0) + (explicitLivingRooms ?? 0)
    : property.rooms ?? null;
  const livingRooms =
    explicitLivingRooms ??
    (typeof roomCount === "number" && typeof bedrooms === "number" && roomCount >= bedrooms
      ? roomCount - bedrooms
      : null);
  const floor = property.floor;
  const totalFloors =
    getNestedNumber(rawPayload, ["building", "number_of_floor_building"]) ?? asNumber(rawPayload?.floors);
  const isTopFloor =
    typeof floor === "number" && typeof totalFloors === "number" ? floor === totalFloors : null;

  // SweepBright exposes equipment as an explicit `amenities` checklist: a token
  // is present only when the corresponding box is ticked in SweepBright. When the
  // list exists, the ABSENCE of a token therefore means "no" (false), not
  // "unknown". Manual properties carry no amenities array, so we fall back to the
  // stored boolean columns instead.
  const hasAmenitiesList = Array.isArray(rawPayload?.amenities);

  // Surfaces can be carried either under `sizes.*` or as typed entries in the
  // `rooms` array (e.g. { type: "balcony", size: 4.15 }).
  const roomsArray = Array.isArray(rawPayload?.rooms) ? rawPayload.rooms : [];
  const sumRoomAreaByType = (type: string) =>
    roomsArray
      .map((item) => asRecord(item))
      .filter((item) => item?.type === type)
      .reduce((sum, item) => sum + (asNumber(item?.size) ?? 0), 0);
  const livingRoomArea = sumRoomAreaByType("living_room");
  const terraceRoomArea = sumRoomAreaByType("terrace");
  const balconyRoomArea = sumRoomAreaByType("balcony");
  const terraceArea =
    getNestedNumber(rawPayload, ["sizes", "terrace_area", "size"]) ??
    (terraceRoomArea > 0 ? terraceRoomArea : null);
  const balconyArea =
    getNestedNumber(rawPayload, ["sizes", "balcony_area", "size"]) ??
    (balconyRoomArea > 0 ? balconyRoomArea : null);

  // Balcony and terrace are two independent SweepBright checkboxes. Never infer
  // one from the other.
  const hasBalcony = hasAmenitiesList
    ? countAmenitiesMatch(rawPayload, ["balcony", "balcon"]) || Boolean(balconyArea)
    : Boolean(balconyArea) || null;
  const hasTerrace = hasAmenitiesList
    ? countAmenitiesMatch(rawPayload, ["terrace", "terrasse"]) || Boolean(terraceArea)
    : property.has_terrace;

  const building = asRecord(rawPayload?.building);
  const hasElevator = hasAmenitiesList
    ? countAmenitiesMatch(rawPayload, ["elevator", "lift", "ascenseur"]) ||
      asBoolean(building?.elevator ?? building?.lift) === true
    : property.has_elevator;

  // A French "box" is a closed garage, covered by the garage / closed_parking
  // tokens; tokens like exterior_parking / interior_parking all contain "parking".
  const hasParking = hasAmenitiesList
    ? countAmenitiesMatch(rawPayload, ["parking", "garage", "carport"]) || null
    : null;

  const storageRoomsCount = asNumber(rawPayload?.storage_rooms);
  const cellarCount = asNumber(rawPayload?.cellars);
  const hasCellar =
    countAmenitiesMatch(rawPayload, ["cave", "cellar", "storage", "basement"]) ||
    asBoolean(rawPayload?.cellar) === true ||
    asBoolean(rawPayload?.cave) === true ||
    asBoolean(rawPayload?.basement) === true ||
    asBoolean(rawPayload?.has_cellar) === true ||
    asBoolean(rawPayload?.has_basement) === true ||
    (typeof storageRoomsCount === "number" && storageRoomsCount > 0) ||
    (typeof cellarCount === "number" && cellarCount > 0) ||
    Boolean(getNestedNumber(rawPayload, ["sizes", "cellar_area", "size"])) ||
    Boolean(getNestedNumber(rawPayload, ["sizes", "basement_area", "size"])) ||
    Boolean(getNestedNumber(rawPayload, ["sizes", "storage_area", "size"]));
  const seaViewFeature = asBoolean(
    asRecord(asRecord(rawPayload?.features)?.comfort)?.seaside_view
  );
  const seaView =
    asString(rawPayload?.sea_view) ??
    asString(rawPayload?.view) ??
    (seaViewFeature === true ||
    countAmenitiesMatch(rawPayload, ["sea view", "vue mer", "mer"])
      ? "classic"
      : null);
  const exposure =
    normalizeOrientation(
      asString(rawPayload?.exposure) ??
        asString(rawPayload?.orientation) ??
        asString(rawPayload?.living_room_orientation) ??
        asString(rawPayload?.balcony_orientation) ??
        asString(rawPayload?.terrace_orientation) ??
        asString(rawPayload?.garden_orientation)
    ) ?? null;

  return {
    sale: buildPropertySaleSnapshot(property, priceAmount),
    energy: buildPropertyEnergySnapshot(property),
    condo: buildPropertyCondoSnapshot(property),
    surfaces: {
      livingArea: property.living_area,
      plotArea: property.plot_area,
      loiCarrezArea: getNestedNumber(rawPayload, ["sizes", "loi_carrez_area", "size"]),
      livingRoomArea: livingRoomArea > 0 ? livingRoomArea : null,
      terraceArea,
      balconyArea,
    },
    rooms: {
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      livingRooms,
      roomCount,
      floor,
      totalFloors,
      isTopFloor,
    },
    amenities: {
      hasTerrace,
      hasBalcony,
      hasElevator,
      hasParking,
      hasCellar: hasCellar || null,
      seaView,
      exposure,
    },
  };
};
