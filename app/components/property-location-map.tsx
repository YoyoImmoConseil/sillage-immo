"use client";

import { useEffect, useRef } from "react";

type PropertyLocationMapProps = {
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  title: string;
};

const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';

export function PropertyLocationMap({
  latitude,
  longitude,
  address,
  title,
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

      L.tileLayer("https://tiles.openfreemap.org/styles/liberty/{z}/{x}/{y}.png", {
        attribution: ATTRIBUTION,
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

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-[rgba(20,20,70,0.14)]">
        <div ref={mapRef} className="aspect-[16/9] w-full bg-[#e9e1d8]" />
      </div>
      {address ? <p className="text-sm opacity-70">{address}</p> : null}
    </div>
  );
}
