import type { BuyerSearchProfileSnapshot } from "@/types/domain/buyers";

export type SweepBrightBuyerPreferences = {
  preferences: Record<string, unknown>;
  locationPreference: Record<string, unknown> | undefined;
};

export const mapBuyerSearchProfileToSweepBrightPreferences = (
  profile: BuyerSearchProfileSnapshot
): SweepBrightBuyerPreferences => {
  const negotiation = profile.businessType === "rental" ? "let" : "sale";

  const preferences: Record<string, unknown> = {
    negotiation,
  };

  if (profile.propertyTypes.length > 0) {
    preferences.property_types = profile.propertyTypes;
  }

  if (profile.budgetMin !== null || profile.budgetMax !== null) {
    preferences.price = {
      ...(profile.budgetMin !== null ? { min: profile.budgetMin } : {}),
      ...(profile.budgetMax !== null ? { max: profile.budgetMax } : {}),
    };
  }

  if (profile.roomsMin !== null || profile.roomsMax !== null) {
    preferences.rooms = {
      ...(profile.roomsMin !== null ? { min: profile.roomsMin } : {}),
      ...(profile.roomsMax !== null ? { max: profile.roomsMax } : {}),
    };
  }

  if (profile.bedroomsMin !== null) {
    preferences.bedrooms = { min: profile.bedroomsMin };
  }

  if (profile.livingAreaMin !== null || profile.livingAreaMax !== null) {
    preferences.living_area = {
      ...(profile.livingAreaMin !== null ? { min: profile.livingAreaMin } : {}),
      ...(profile.livingAreaMax !== null ? { max: profile.livingAreaMax } : {}),
    };
  }

  if (profile.floorMin !== null || profile.floorMax !== null) {
    preferences.floor = {
      ...(profile.floorMin !== null ? { min: profile.floorMin } : {}),
      ...(profile.floorMax !== null ? { max: profile.floorMax } : {}),
    };
  }

  const features: string[] = [];
  if (profile.requiresTerrace) features.push("terrace");
  if (profile.requiresElevator) features.push("elevator");
  if (features.length > 0) {
    preferences.features = features;
  }

  const rawZone = (profile.criteria as Record<string, unknown> | null)?.zonePolygon;
  const zonePolygon = (() => {
    if (!Array.isArray(rawZone)) return null;
    const polygon: Array<[number, number]> = [];
    for (const point of rawZone) {
      if (
        Array.isArray(point) &&
        point.length === 2 &&
        typeof point[0] === "number" &&
        typeof point[1] === "number"
      ) {
        polygon.push([point[0], point[1]]);
      } else {
        return null;
      }
    }
    return polygon.length >= 3 ? polygon : null;
  })();

  const zoneNote = zonePolygon
    ? `Zone dessinée sur carte (${zonePolygon.length} points). GeoJSON disponible.`
    : null;
  const geoJsonPolygon = zonePolygon
    ? {
        type: "Polygon" as const,
        // GeoJSON expects [lng, lat] order; we store [lat, lng] internally.
        coordinates: [
          [
            ...zonePolygon.map(([lat, lng]) => [lng, lat] as [number, number]),
            [zonePolygon[0][1], zonePolygon[0][0]] as [number, number],
          ],
        ],
      }
    : null;

  let locationPreference: Record<string, unknown> | undefined;
  if (profile.cities.length > 0) {
    locationPreference = {
      cities: profile.cities,
      ...(profile.locationText ? { note: profile.locationText } : {}),
    };
  } else if (profile.locationText) {
    locationPreference = {
      note: profile.locationText,
    };
  }

  if (zonePolygon) {
    locationPreference = {
      ...(locationPreference ?? {}),
      custom_zone: {
        points: zonePolygon.map(([lat, lng]) => ({ lat, lng })),
        polygon: zonePolygon,
        geojson: geoJsonPolygon,
      },
      note: [locationPreference?.note, zoneNote].filter(Boolean).join(" — ") || zoneNote,
    };
  }

  return { preferences, locationPreference };
};
