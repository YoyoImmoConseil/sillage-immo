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

  return { preferences, locationPreference };
};
