"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { AppLocale } from "@/lib/i18n/config";
import { localizePath } from "@/lib/i18n/routing";
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
  locale: AppLocale;
  businessType: PropertyBusinessType;
  initialListings: PublicPropertyListingSummary[];
  initialPropertyTypes: string[];
  initialFilters: ListingFilters;
};

const filterEntries = (filters: ListingFilters) =>
  Object.entries(filters).filter(([, value]) => typeof value === "string" && value.trim().length > 0);

export function PublicListingsSearch(props: PublicListingsSearchProps) {
  const copy = {
    fr: {
      loadError: "Impossible de charger les biens avec ces filtres.",
      searchError: "Erreur de recherche.",
      city: "Ville",
      propertyType: "Type de bien",
      allTypes: "Tous les types",
      minBudget: "Budget min",
      maxBudget: "Budget max",
      minRooms: "Nb de pièces min",
      maxRooms: "Nb de pièces max",
      minSurface: "Surface min (m²)",
      maxSurface: "Surface max (m²)",
      minFloor: "Étage min",
      maxFloor: "Étage max",
      terrace: "Terrasse",
      elevator: "Ascenseur",
      indifferent: "Indifférent",
      yes: "Oui",
      no: "Non",
      reset: "Réinitialiser",
      saveSearch: "Sauvegarder cette recherche",
      saveSearchHint:
        "Recevez une alerte dès qu'un bien correspondant est publié et retrouvez-la dans Mon Espace Sillage.",
      updating: "Mise à jour des résultats...",
      available: "disponible",
      availablePlural: "disponibles",
      noResultsTitle: "Aucun bien ne correspond à ces critères",
      noResultsBody: "Ajustez vos filtres ou contactez Sillage Immo pour nous partager votre recherche.",
    },
    en: {
      loadError: "Unable to load properties with these filters.",
      searchError: "Search error.",
      city: "City",
      propertyType: "Property type",
      allTypes: "All types",
      minBudget: "Min budget",
      maxBudget: "Max budget",
      minRooms: "Min rooms",
      maxRooms: "Max rooms",
      minSurface: "Min surface (sqm)",
      maxSurface: "Max surface (sqm)",
      minFloor: "Min floor",
      maxFloor: "Max floor",
      terrace: "Terrace",
      elevator: "Elevator",
      indifferent: "Any",
      yes: "Yes",
      no: "No",
      reset: "Reset",
      saveSearch: "Save this search",
      saveSearchHint:
        "Get instant email alerts when a matching property is listed and keep it safe in your Sillage account.",
      updating: "Updating results...",
      available: "available",
      availablePlural: "available",
      noResultsTitle: "No property matches these criteria",
      noResultsBody: "Adjust your filters or contact Sillage Immo to share your search with us.",
    },
    es: {
      loadError: "No se pudieron cargar los inmuebles con estos filtros.",
      searchError: "Error de búsqueda.",
      city: "Ciudad",
      propertyType: "Tipo de inmueble",
      allTypes: "Todos los tipos",
      minBudget: "Presupuesto mínimo",
      maxBudget: "Presupuesto máximo",
      minRooms: "Mín. habitaciones",
      maxRooms: "Máx. habitaciones",
      minSurface: "Superficie mín. (m²)",
      maxSurface: "Superficie máx. (m²)",
      minFloor: "Planta mín.",
      maxFloor: "Planta máx.",
      terrace: "Terraza",
      elevator: "Ascensor",
      indifferent: "Indiferente",
      yes: "Sí",
      no: "No",
      reset: "Restablecer",
      saveSearch: "Guardar esta búsqueda",
      saveSearchHint:
        "Reciba alertas por email cuando se publique un inmueble que le encaje y consérvela en su espacio Sillage.",
      updating: "Actualizando resultados...",
      available: "disponible",
      availablePlural: "disponibles",
      noResultsTitle: "Ningún inmueble coincide con estos criterios",
      noResultsBody: "Ajuste sus filtros o contacte con Sillage Immo para compartirnos su búsqueda.",
    },
    ru: {
      loadError: "Не удалось загрузить объекты с такими фильтрами.",
      searchError: "Ошибка поиска.",
      city: "Город",
      propertyType: "Тип объекта",
      allTypes: "Все типы",
      minBudget: "Бюджет от",
      maxBudget: "Бюджет до",
      minRooms: "Мин. комнат",
      maxRooms: "Макс. комнат",
      minSurface: "Мин. площадь (м²)",
      maxSurface: "Макс. площадь (м²)",
      minFloor: "Этаж от",
      maxFloor: "Этаж до",
      terrace: "Терраса",
      elevator: "Лифт",
      indifferent: "Неважно",
      yes: "Да",
      no: "Нет",
      reset: "Сбросить",
      saveSearch: "Сохранить этот запрос",
      saveSearchHint:
        "Получайте моментальные уведомления по email о новых объектах и сохраняйте запрос в кабинете Sillage.",
      updating: "Обновление результатов...",
      available: "доступен",
      availablePlural: "доступно",
      noResultsTitle: "По этим критериям ничего не найдено",
      noResultsBody: "Измените фильтры или свяжитесь с Sillage Immo, чтобы поделиться вашим запросом.",
    },
  }[props.locale];
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

  const saveSearchHref = useMemo(() => {
    const params = new URLSearchParams();
    params.set("businessType", props.businessType);
    for (const [key, value] of filterEntries(filters)) {
      params.set(key, value);
    }
    const query = params.toString();
    const path = localizePath("/recherche/nouvelle", props.locale);
    return query ? `${path}?${query}` : path;
  }, [filters, props.businessType, props.locale]);

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
          throw new Error(copy.loadError);
        }

        const payload = (await response.json()) as {
          ok: boolean;
          listings?: PublicPropertyListingSummary[];
          propertyTypes?: string[];
          message?: string;
        };

        if (!payload.ok) {
          throw new Error(payload.message ?? copy.searchError);
        }

        setListings(payload.listings ?? []);
        if (Array.isArray(payload.propertyTypes)) {
          setPropertyTypes(payload.propertyTypes);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : copy.searchError;
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
  }, [copy.loadError, copy.searchError, queryString]);

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
          {copy.city}
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={filters.city}
            onChange={(event) => onFilterChange("city", event.target.value)}
            placeholder="Nice, Cannes..."
          />
        </label>
        <label className="text-sm">
          {copy.propertyType}
          <select
            className="mt-1 w-full rounded border px-3 py-2"
            value={filters.type}
            onChange={(event) => onFilterChange("type", event.target.value)}
          >
            <option value="">{copy.allTypes}</option>
            {propertyTypes.map((type) => (
              <option key={type} value={type}>
                {formatPropertyTypeLabel(type, props.locale) ?? type}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          {copy.minBudget}
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={filters.minPrice}
            onChange={(event) => onFilterChange("minPrice", event.target.value)}
            inputMode="numeric"
            placeholder="300000"
          />
        </label>
        <label className="text-sm">
          {copy.maxBudget}
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={filters.maxPrice}
            onChange={(event) => onFilterChange("maxPrice", event.target.value)}
            inputMode="numeric"
            placeholder="1200000"
          />
        </label>

        <label className="text-sm">
          {copy.minRooms}
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={filters.minRooms}
            onChange={(event) => onFilterChange("minRooms", event.target.value)}
            inputMode="numeric"
            placeholder="2"
          />
        </label>
        <label className="text-sm">
          {copy.maxRooms}
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={filters.maxRooms}
            onChange={(event) => onFilterChange("maxRooms", event.target.value)}
            inputMode="numeric"
            placeholder="6"
          />
        </label>
        <label className="text-sm">
          {copy.minSurface}
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={filters.minSurface}
            onChange={(event) => onFilterChange("minSurface", event.target.value)}
            inputMode="numeric"
            placeholder="50"
          />
        </label>
        <label className="text-sm">
          {copy.maxSurface}
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={filters.maxSurface}
            onChange={(event) => onFilterChange("maxSurface", event.target.value)}
            inputMode="numeric"
            placeholder="180"
          />
        </label>

        <label className="text-sm">
          {copy.minFloor}
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={filters.minFloor}
            onChange={(event) => onFilterChange("minFloor", event.target.value)}
            inputMode="numeric"
            placeholder="0"
          />
        </label>
        <label className="text-sm">
          {copy.maxFloor}
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={filters.maxFloor}
            onChange={(event) => onFilterChange("maxFloor", event.target.value)}
            inputMode="numeric"
            placeholder="10"
          />
        </label>
        <label className="text-sm">
          {copy.terrace}
          <select
            className="mt-1 w-full rounded border px-3 py-2"
            value={filters.terrace}
            onChange={(event) => onFilterChange("terrace", event.target.value)}
          >
            <option value="">{copy.indifferent}</option>
            <option value="true">{copy.yes}</option>
            <option value="false">{copy.no}</option>
          </select>
        </label>
        <label className="text-sm">
          {copy.elevator}
          <select
            className="mt-1 w-full rounded border px-3 py-2"
            value={filters.elevator}
            onChange={(event) => onFilterChange("elevator", event.target.value)}
          >
            <option value="">{copy.indifferent}</option>
            <option value="true">{copy.yes}</option>
            <option value="false">{copy.no}</option>
          </select>
        </label>

        <div className="md:col-span-4 flex flex-wrap items-center gap-3">
          <button type="button" className="sillage-btn-secondary rounded px-4 py-2 text-sm" onClick={resetFilters}>
            {copy.reset}
          </button>
          <Link
            href={saveSearchHref}
            className="sillage-btn rounded px-4 py-2 text-sm"
            data-testid="save-search-cta"
          >
            {copy.saveSearch}
          </Link>
          <p className="text-xs opacity-70 md:ml-2 md:max-w-xl">{copy.saveSearchHint}</p>
          {isLoading ? <p className="text-sm opacity-70">{copy.updating}</p> : null}
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm opacity-75">
          {listings.length}{" "}
          {props.locale === "fr"
            ? `bien${listings.length > 1 ? "s" : ""} ${listings.length > 1 ? copy.availablePlural : copy.available}`
            : props.locale === "es"
              ? `inmueble${listings.length > 1 ? "s" : ""} ${listings.length > 1 ? copy.availablePlural : copy.available}`
              : props.locale === "ru"
                ? `объект${listings.length > 1 ? "а" : ""} ${copy.availablePlural}`
                : `properties ${copy.available}`}
        </p>
      </div>

      {listings.length === 0 ? (
        <section className="rounded-2xl border border-[rgba(20,20,70,0.18)] p-6">
          <h2 className="text-xl font-semibold">{copy.noResultsTitle}</h2>
          <p className="mt-2 max-w-2xl text-sm opacity-75">
            {copy.noResultsBody}
          </p>
        </section>
      ) : (
        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {listings.map((listing) => (
            <PropertyCard key={listing.id} listing={listing} locale={props.locale} />
          ))}
        </section>
      )}
    </div>
  );
}
