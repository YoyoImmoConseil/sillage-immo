"use client";

import { useEffect, useMemo, useState } from "react";
import { formatPropertyTypeLabel } from "@/lib/properties/property-type-label";
import { PropertyCard } from "./property-card";
import type { PropertyBusinessType, PublicPropertyListingSummary } from "@/types/domain/properties";

type ListingFilters = {
  city: string;
  type: string;
  minPrice: string;
  maxPrice: string;
  minRooms: string;
  maxRooms: string;
  minSurface: string;
  maxSurface: string;
  minFloor: string;
  maxFloor: string;
  terrace: "true" | "false" | "";
  elevator: "true" | "false" | "";
};

type PublicListingsSearchProps = {
  businessType: PropertyBusinessType;
  initialListings: PublicPropertyListingSummary[];
  initialPropertyTypes: string[];
  initialFilters: ListingFilters;
};

const filterEntries = (filters: ListingFilters) =>
  Object.entries(filters).filter(([, value]) => typeof value === "string" && value.trim().length > 0);

export function PublicListingsSearch(props: PublicListingsSearchProps) {
  const [filters, setFilters] = useState<ListingFilters>(props.initialFilters);
  const [listings, setListings] = useState<PublicPropertyListingSummary[]>(props.initialListings);
  const [propertyTypes, setPropertyTypes] = useState<string[]>(props.initialPropertyTypes);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("businessType", props.businessType);
    for (const [key, value] of filterEntries(filters)) {
      params.set(key, value);
    }
    return params.toString();
  }, [filters, props.businessType]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch(`/api/public/property-listings?${queryString}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Impossible de charger les biens avec ces filtres.");
        }

        const payload = (await response.json()) as {
          ok: boolean;
          listings?: PublicPropertyListingSummary[];
          propertyTypes?: string[];
          message?: string;
        };

        if (!payload.ok) {
          throw new Error(payload.message ?? "Erreur de recherche.");
        }

        setListings(payload.listings ?? []);
        if (Array.isArray(payload.propertyTypes)) {
          setPropertyTypes(payload.propertyTypes);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : "Erreur de recherche.";
        setError(message);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [queryString]);

  const onFilterChange = (key: keyof ListingFilters, value: string) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const resetFilters = () => {
    setFilters({
      city: "",
      type: "",
      minPrice: "",
      maxPrice: "",
      minRooms: "",
      maxRooms: "",
      minSurface: "",
      maxSurface: "",
      minFloor: "",
      maxFloor: "",
      terrace: "",
      elevator: "",
    });
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-3 rounded-2xl border border-[rgba(20,20,70,0.18)] p-5 md:grid-cols-4">
        <label className="text-sm">
          Ville
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={filters.city}
            onChange={(event) => onFilterChange("city", event.target.value)}
            placeholder="Nice, Cannes..."
          />
        </label>
        <label className="text-sm">
          Type de bien
          <select
            className="mt-1 w-full rounded border px-3 py-2"
            value={filters.type}
            onChange={(event) => onFilterChange("type", event.target.value)}
          >
            <option value="">Tous les types</option>
            {propertyTypes.map((type) => (
              <option key={type} value={type}>
                {formatPropertyTypeLabel(type) ?? type}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Budget min
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={filters.minPrice}
            onChange={(event) => onFilterChange("minPrice", event.target.value)}
            inputMode="numeric"
            placeholder="300000"
          />
        </label>
        <label className="text-sm">
          Budget max
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={filters.maxPrice}
            onChange={(event) => onFilterChange("maxPrice", event.target.value)}
            inputMode="numeric"
            placeholder="1200000"
          />
        </label>

        <label className="text-sm">
          Nb de pièces min
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={filters.minRooms}
            onChange={(event) => onFilterChange("minRooms", event.target.value)}
            inputMode="numeric"
            placeholder="2"
          />
        </label>
        <label className="text-sm">
          Nb de pièces max
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={filters.maxRooms}
            onChange={(event) => onFilterChange("maxRooms", event.target.value)}
            inputMode="numeric"
            placeholder="6"
          />
        </label>
        <label className="text-sm">
          Surface min (m²)
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={filters.minSurface}
            onChange={(event) => onFilterChange("minSurface", event.target.value)}
            inputMode="numeric"
            placeholder="50"
          />
        </label>
        <label className="text-sm">
          Surface max (m²)
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={filters.maxSurface}
            onChange={(event) => onFilterChange("maxSurface", event.target.value)}
            inputMode="numeric"
            placeholder="180"
          />
        </label>

        <label className="text-sm">
          Étage min
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={filters.minFloor}
            onChange={(event) => onFilterChange("minFloor", event.target.value)}
            inputMode="numeric"
            placeholder="0"
          />
        </label>
        <label className="text-sm">
          Étage max
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={filters.maxFloor}
            onChange={(event) => onFilterChange("maxFloor", event.target.value)}
            inputMode="numeric"
            placeholder="10"
          />
        </label>
        <label className="text-sm">
          Terrasse
          <select
            className="mt-1 w-full rounded border px-3 py-2"
            value={filters.terrace}
            onChange={(event) => onFilterChange("terrace", event.target.value)}
          >
            <option value="">Indifférent</option>
            <option value="true">Oui</option>
            <option value="false">Non</option>
          </select>
        </label>
        <label className="text-sm">
          Ascenseur
          <select
            className="mt-1 w-full rounded border px-3 py-2"
            value={filters.elevator}
            onChange={(event) => onFilterChange("elevator", event.target.value)}
          >
            <option value="">Indifférent</option>
            <option value="true">Oui</option>
            <option value="false">Non</option>
          </select>
        </label>

        <div className="md:col-span-4 flex flex-wrap items-center gap-3">
          <button type="button" className="sillage-btn rounded px-4 py-2 text-sm" onClick={resetFilters}>
            Réinitialiser
          </button>
          {isLoading ? <p className="text-sm opacity-70">Mise à jour des résultats...</p> : null}
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm opacity-75">
          {listings.length} bien{listings.length > 1 ? "s" : ""} disponible{listings.length > 1 ? "s" : ""}
        </p>
      </div>

      {listings.length === 0 ? (
        <section className="rounded-2xl border border-[rgba(20,20,70,0.18)] p-6">
          <h2 className="text-xl font-semibold">Aucun bien ne correspond à ces critères</h2>
          <p className="mt-2 max-w-2xl text-sm opacity-75">
            Ajustez vos filtres ou contactez Sillage Immo pour nous partager votre recherche.
          </p>
        </section>
      ) : (
        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {listings.map((listing) => (
            <PropertyCard key={listing.id} listing={listing} />
          ))}
        </section>
      )}
    </div>
  );
}
