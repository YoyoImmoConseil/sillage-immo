"use client";

import { useEffect, useRef, useState } from "react";
import type { AppLocale } from "@/lib/i18n/config";

type Suggestion = {
  label: string;
  address: string;
  city: string;
  postalCode: string;
};

type AddressData = {
  address: string;
  city: string;
  postalCode: string;
};

type AddressAutocompleteInputProps = {
  value: string;
  cityValue: string;
  postalCodeValue: string;
  onAddressChange: (value: string) => void;
  onAddressSelected: (data: AddressData) => void;
  disabled?: boolean;
  label?: string;
  locale?: AppLocale;
};

const BAN_API_BASE_URL = "https://api-adresse.data.gouv.fr/search/";

export function AddressAutocompleteInput({
  value,
  cityValue,
  postalCodeValue,
  onAddressChange,
  onAddressSelected,
  disabled,
  label = "Adresse du bien *",
  locale = "fr",
}: AddressAutocompleteInputProps) {
  const copy = {
    fr: {
      label,
      apiError: "Autocomplete indisponible temporairement.",
      helper: "Autocomplete adresse via Base Adresse Nationale (gratuite).",
    },
    en: {
      label: label === "Adresse du bien *" ? "Property address *" : label,
      apiError: "Address autocomplete is temporarily unavailable.",
      helper: "Address autocomplete powered by the French national address database.",
    },
    es: {
      label: label === "Adresse du bien *" ? "Dirección del inmueble *" : label,
      apiError: "El autocompletado de direcciones no está disponible temporalmente.",
      helper: "Autocompletado de direcciones mediante la Base Adresse Nationale francesa.",
    },
    ru: {
      label: label === "Adresse du bien *" ? "Адрес объекта *" : label,
      apiError: "Автодополнение адреса временно недоступно.",
      helper: "Автодополнение адресов на базе французской национальной адресной базы.",
    },
  }[locale];
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("click", onClickOutside);
    return () => document.removeEventListener("click", onClickOutside);
  }, []);

  useEffect(() => {
    if (!value.trim() || value.trim().length < 3) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      const url = new URL(BAN_API_BASE_URL);
      url.searchParams.set("q", value.trim());
      url.searchParams.set("limit", "5");
      url.searchParams.set("autocomplete", "1");

      fetch(url.toString(), { signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error("Adresse API indisponible");
          const payload = (await response.json()) as {
            features?: Array<{
              properties?: {
                label?: string;
                name?: string;
                city?: string;
                postcode?: string;
              };
            }>;
          };
          const nextSuggestions =
            payload.features
              ?.map((feature) => {
                const properties = feature.properties ?? {};
                const name = (properties.name ?? "").trim();
                const city = (properties.city ?? "").trim();
                const postalCode = (properties.postcode ?? "").trim();
                const label = (properties.label ?? "").trim();

                if (!label) return null;
                return {
                  label,
                  address: name || label,
                  city,
                  postalCode,
                };
              })
              .filter((item): item is Suggestion => Boolean(item))
              .slice(0, 5) ?? [];
          setSuggestions(nextSuggestions);
        })
        .catch(() => {
          setSuggestions([]);
          setError(copy.apiError);
        });
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [copy.apiError, value]);

  const selectSuggestion = (suggestion: Suggestion) => {
    onAddressChange(suggestion.address);
    setIsOpen(false);
    setSuggestions([]);
    onAddressSelected({
      address: suggestion.address,
      city: suggestion.city || cityValue,
      postalCode: suggestion.postalCode || postalCodeValue,
    });
  };

  return (
    <label className="sm:col-span-2 text-sm">
      {copy.label}
      <div ref={wrapperRef} className="relative mt-1">
        <input
          className="w-full rounded border px-3 py-2"
          value={value}
          onChange={(event) => {
            setError(null);
            onAddressChange(event.target.value);
            if (event.target.value.trim().length >= 3) setIsOpen(true);
            if (event.target.value.trim().length < 3) setIsOpen(false);
          }}
          disabled={disabled}
          autoComplete="off"
        />
        {isOpen && value.trim().length >= 3 && suggestions.length > 0 ? (
          <div className="absolute z-20 mt-1 w-full rounded border bg-[#f4ece4] shadow">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.label}
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-[rgba(20,20,70,0.08)]"
                onClick={() => selectSuggestion(suggestion)}
              >
                {suggestion.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {error ? <p className="mt-1 text-xs text-amber-700">{error}</p> : null}
      <p className="mt-1 text-xs opacity-60">
        {copy.helper}
      </p>
    </label>
  );
}
