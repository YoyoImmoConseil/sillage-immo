"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { AppLocale } from "@/lib/i18n/config";
import { localizePath } from "@/lib/i18n/routing";
import { formatPropertyTypeLabel } from "@/lib/properties/property-type-label";
import { PropertyCard } from "./property-card";
import type { PropertyBusinessType, PublicPropertyListingSummary } from "@/types/domain/properties";

// CRO : hauteur tactile >= 48px et corps >= 16px sur mobile (évite le zoom iOS au focus) ;
// desktop inchangé (text-sm, hauteur auto).
const FILTER_FIELD = "mt-1 w-full rounded border px-3 py-2 text-base md:text-sm max-md:min-h-[48px]";

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
      cityPlaceholder: "Nice, Cannes...",
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
      countAvailable: (count: number) =>
        count > 1 ? `${count} biens disponibles` : `${count} bien disponible`,
      noResultsTitle: "Aucun bien ne correspond à ces critères",
      noResultsBody: "Ajustez vos filtres ou contactez Sillage Immo pour nous partager votre recherche.",
      filter: "Filtrer",
      closeFilters: "Fermer les filtres",
      createAlert: "Créer une alerte",
    },
    en: {
      loadError: "Unable to load properties with these filters.",
      searchError: "Search error.",
      city: "City",
      cityPlaceholder: "Nice, Cannes...",
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
      countAvailable: (count: number) =>
        count > 1 ? `${count} properties available` : `${count} property available`,
      noResultsTitle: "No property matches these criteria",
      noResultsBody: "Adjust your filters or contact Sillage Immo to share your search with us.",
      filter: "Filter",
      closeFilters: "Close filters",
      createAlert: "Create an alert",
    },
    es: {
      loadError: "No se pudieron cargar los inmuebles con estos filtros.",
      searchError: "Error de búsqueda.",
      city: "Ciudad",
      cityPlaceholder: "Niza, Cannes...",
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
      countAvailable: (count: number) =>
        count > 1 ? `${count} inmuebles disponibles` : `${count} inmueble disponible`,
      noResultsTitle: "Ningún inmueble coincide con estos criterios",
      noResultsBody: "Ajuste sus filtros o contacte con Sillage Immo para compartirnos su búsqueda.",
      filter: "Filtrar",
      closeFilters: "Cerrar filtros",
      createAlert: "Crear una alerta",
    },
    ru: {
      loadError: "Не удалось загрузить объекты с такими фильтрами.",
      searchError: "Ошибка поиска.",
      city: "Город",
      cityPlaceholder: "Ницца, Канны...",
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
      countAvailable: (count: number) => {
        // Russian plural rules: 1 → singular nominative; 2-4 → genitive singular;
        // 5+ and 0 → genitive plural. Tens 11-14 always take genitive plural.
        const mod10 = count % 10;
        const mod100 = count % 100;
        if (mod10 === 1 && mod100 !== 11) return `${count} объект доступен`;
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} объекта доступно`;
        return `${count} объектов доступно`;
      },
      noResultsTitle: "По этим критериям ничего не найдено",
      noResultsBody: "Измените фильтры или свяжитесь с Sillage Immo, чтобы поделиться вашим запросом.",
      filter: "Фильтры",
      closeFilters: "Закрыть фильтры",
      createAlert: "Создать оповещение",
    },
  }[props.locale];
  const [filters, setFilters] = useState<ListingFilters>(props.initialFilters);
  const [listings, setListings] = useState<PublicPropertyListingSummary[]>(props.initialListings);
  const [propertyTypes, setPropertyTypes] = useState<string[]>(props.initialPropertyTypes);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Mobile : panneau de filtres repliable (fermé par défaut pour dégager les résultats).
  // Sur desktop, le panneau reste toujours visible (md:).
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilterCount = filterEntries(filters).length;

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
    <div className="space-y-8 max-md:pb-24">
      {/* Panneau de filtres : replié sur mobile (contrôlé par la barre collante), toujours visible sur desktop. */}
      <div
        className={`grid gap-3 rounded-2xl border border-[rgba(20,20,70,0.18)] p-5 md:grid-cols-4 ${
          filtersOpen ? "" : "max-md:hidden"
        }`}
      >
        <label className="text-sm">
          {copy.city}
          <input
            className={FILTER_FIELD}
            value={filters.city}
            onChange={(event) => onFilterChange("city", event.target.value)}
            placeholder={copy.cityPlaceholder}
          />
        </label>
        <label className="text-sm">
          {copy.propertyType}
          <select
            className={FILTER_FIELD}
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
            className={FILTER_FIELD}
            value={filters.minPrice}
            onChange={(event) => onFilterChange("minPrice", event.target.value)}
            inputMode="numeric"
            placeholder="300000"
          />
        </label>
        <label className="text-sm">
          {copy.maxBudget}
          <input
            className={FILTER_FIELD}
            value={filters.maxPrice}
            onChange={(event) => onFilterChange("maxPrice", event.target.value)}
            inputMode="numeric"
            placeholder="1200000"
          />
        </label>

        <label className="text-sm">
          {copy.minRooms}
          <input
            className={FILTER_FIELD}
            value={filters.minRooms}
            onChange={(event) => onFilterChange("minRooms", event.target.value)}
            inputMode="numeric"
            placeholder="2"
          />
        </label>
        <label className="text-sm">
          {copy.maxRooms}
          <input
            className={FILTER_FIELD}
            value={filters.maxRooms}
            onChange={(event) => onFilterChange("maxRooms", event.target.value)}
            inputMode="numeric"
            placeholder="6"
          />
        </label>
        <label className="text-sm">
          {copy.minSurface}
          <input
            className={FILTER_FIELD}
            value={filters.minSurface}
            onChange={(event) => onFilterChange("minSurface", event.target.value)}
            inputMode="numeric"
            placeholder="50"
          />
        </label>
        <label className="text-sm">
          {copy.maxSurface}
          <input
            className={FILTER_FIELD}
            value={filters.maxSurface}
            onChange={(event) => onFilterChange("maxSurface", event.target.value)}
            inputMode="numeric"
            placeholder="180"
          />
        </label>

        <label className="text-sm">
          {copy.minFloor}
          <input
            className={FILTER_FIELD}
            value={filters.minFloor}
            onChange={(event) => onFilterChange("minFloor", event.target.value)}
            inputMode="numeric"
            placeholder="0"
          />
        </label>
        <label className="text-sm">
          {copy.maxFloor}
          <input
            className={FILTER_FIELD}
            value={filters.maxFloor}
            onChange={(event) => onFilterChange("maxFloor", event.target.value)}
            inputMode="numeric"
            placeholder="10"
          />
        </label>
        <label className="text-sm">
          {copy.terrace}
          <select
            className={FILTER_FIELD}
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
            className={FILTER_FIELD}
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
          {/* Mobile : refermer le panneau après réglage des filtres. */}
          <button
            type="button"
            className="rounded border border-navy/25 px-4 py-2 text-sm font-medium text-navy md:hidden"
            onClick={() => setFiltersOpen(false)}
          >
            {copy.closeFilters}
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
        <p className="text-sm opacity-75">{copy.countAvailable(listings.length)}</p>
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
            <PropertyCard
              key={listing.id}
              listing={listing}
              locale={props.locale}
              businessType={props.businessType}
            />
          ))}
        </section>
      )}

      {/*
        Barre d'action collante — mobile uniquement (md:hidden, safe-area iOS).
        Accès tri/filtre + CTA principal « Créer une alerte » orienté selon le
        type de transaction (saveSearchHref conserve déjà businessType + filtres).
      */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-navy/10 bg-sand/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur md:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            className="min-h-[48px] shrink-0 rounded-lg border border-navy/25 px-4 text-sm font-medium text-navy"
          >
            {copy.filter}
            {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </button>
          <Link
            href={saveSearchHref}
            className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-lg bg-[#141446] px-4 text-sm font-semibold text-sand"
            data-testid="sticky-create-alert-cta"
          >
            {copy.createAlert}
          </Link>
        </div>
      </div>
    </div>
  );
}
