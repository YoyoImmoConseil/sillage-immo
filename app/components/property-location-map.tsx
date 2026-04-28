"use client";

import { useEffect, useRef } from "react";

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
};

const TILE_URL =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const TILE_SUBDOMAINS = "abcd";
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>';

export function PropertyLocationMap({
  latitude,
  longitude,
  address,
  title,
  size = "default",
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

      mapInstance = L.map(mapRef.current, {
        center: [latitude, longitude],
        zoom: 16,
        scrollWheelZoom: false,
      });

      L.tileLayer(TILE_URL, {
        attribution: ATTRIBUTION,
        subdomains: TILE_SUBDOMAINS,
        maxZoom: 19,
      }).addTo(mapInstance);

      const marker = L.divIcon({
        className: "sillage-map-pin-wrapper",
        html: '<span class="sillage-map-pin"></span>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      L.marker([latitude, longitude], { icon: marker, title }).addTo(mapInstance);
      mapInstance.attributionControl.setPrefix(false);
      mapInstance.invalidateSize();
    })();

    return () => {
      isDisposed = true;
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, [latitude, longitude, title]);

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
