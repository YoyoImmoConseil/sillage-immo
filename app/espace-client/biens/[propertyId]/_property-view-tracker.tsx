"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics/data-layer";

export function PropertyViewTracker({
  propertyId,
  businessType,
  city,
}: {
  propertyId: string;
  businessType?: string | null;
  city?: string | null;
}) {
  useEffect(() => {
    track("client_property_viewed", {
      property_id: propertyId,
      business_type: businessType ?? undefined,
      city: city ?? undefined,
    });
  }, [propertyId, businessType, city]);
  return null;
}
