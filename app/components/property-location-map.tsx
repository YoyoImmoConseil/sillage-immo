"use client";

import { useEffect, useRef } from "react";
import {
  MAP_TILE_ATTRIBUTION,
  MAP_TILE_MAX_ZOOM,
  MAP_TILE_URL,
} from "@/lib/maps/tiles";

type PropertyLocationMapProps = {
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  title: string;
  /**
   * Visual footprint of the map.
   * - `default` (16/9, full width) for public detail pages.
   * - `compact` (smaller fixed height, capped width) for admin / dense layouts.
   */
  size?: "default" | "compact";
  /**
   * Localisation approximative (pages publiques) : un cercle de ~300 m,
   * légèrement décalé de façon déterministe, à la place du repère exact.
   * L'adresse exacte reste réservée à l'admin et à l'espace client.
   */
  approximate?: boolean;
};

const APPROXIMATE_RADIUS_METERS = 300;

/** Décalage déterministe (≈ ±120 m) pour ne pas centrer le cercle sur le bien. */
const approximateCenter = (latitude: number, longitude: number): [number, number] => {
  const seed = Math.abs(Math.sin(latitude * 1000 + longitude * 1000));
  const angle = seed * Math.PI * 2;
  const meters = 60 + seed * 60;
  const dLat = (meters * Math.cos(angle)) / 111_320;
  const dLng = (meters * Math.sin(angle)) / (111_320 * Math.cos((latitude * Math.PI) / 180));
  return [latitude + dLat, longitude + dLng];
};


export function PropertyLocationMap({
  latitude,
  longitude,
  address,
  title,
  size = "default",
  approximate = false,
}: PropertyLocationMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mapRef.current || typeof latitude !== "number" || typeof longitude !== "number") {
      return;
    }

    let isDisposed = false;
    let mapInstance: import("leaflet").Map | null = null;

    void (async () => {
      const L = await import("leaflet");
      if (isDisposed || !mapRef.current) return;

      const center: [number, number] = approximate
        ? approximateCenter(latitude, longitude)
        : [latitude, longitude];

      mapInstance = L.map(mapRef.current, {
        center,
        zoom: approximate ? 15 : 16,
        scrollWheelZoom: false,
      });

      L.tileLayer(MAP_TILE_URL, {
        attribution: MAP_TILE_ATTRIBUTION,
        maxZoom: MAP_TILE_MAX_ZOOM,
      }).addTo(mapInstance);

      if (approximate) {
        L.circle(center, {
          radius: APPROXIMATE_RADIUS_METERS,
          color: "#1c1e4a",
          weight: 2,
          fillColor: "#1c1e4a",
          fillOpacity: 0.16,
        }).addTo(mapInstance);
      } else {
        const marker = L.divIcon({
          className: "sillage-map-pin-wrapper",
          html: '<span class="sillage-map-pin"></span>',
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });
        L.marker([latitude, longitude], { icon: marker, title }).addTo(mapInstance);
      }
      mapInstance.attributionControl.setPrefix(false);
      mapInstance.invalidateSize();
    })();

    return () => {
      isDisposed = true;
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, [latitude, longitude, title, approximate]);

  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return null;
  }

  const containerClass =
    size === "compact"
      ? "relative isolate overflow-hidden rounded-xl border border-[rgba(20,20,70,0.14)] max-w-2xl"
      : "relative isolate overflow-hidden rounded-xl border border-[rgba(20,20,70,0.14)]";
  const mapClass =
    size === "compact"
      ? "h-64 w-full bg-[#e9e1d8]"
      : "aspect-[16/9] w-full bg-[#e9e1d8]";

  return (
    <div className="space-y-3">
      <div className={containerClass}>
        <div ref={mapRef} className={mapClass} />
      </div>
      {address ? <p className="text-sm opacity-70">{address}</p> : null}
    </div>
  );
}
