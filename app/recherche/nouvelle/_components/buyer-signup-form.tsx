"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { track } from "@/lib/analytics/data-layer";
import type { AppLocale } from "@/lib/i18n/config";
import { localizePath } from "@/lib/i18n/routing";
import type { PropertyBusinessType } from "@/types/domain/properties";
import type { ZonePolygon } from "@/app/components/buyer-search-zone-map";
import { buyerSignupCopy } from "./buyer-signup-copy";
import { normalizeTerrace, parseBool, parseNumber } from "./buyer-signup-helpers";
import type { FormState, UiStatus } from "./buyer-signup-helpers";
import { BuyerSignupCriteriaStep } from "./buyer-signup-criteria-step";
import { BuyerSignupContactStep } from "./buyer-signup-contact-step";

type InitialFilters = {
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
  terrace: string;
  elevator: string;
};

type BuyerSignupFormProps = {
  locale: AppLocale;
  initialBusinessType: PropertyBusinessType;
  saleTypes: string[];
  rentalTypes: string[];
  initialFilters: InitialFilters;
};

export function BuyerSignupForm(props: BuyerSignupFormProps) {
  const copy = buyerSignupCopy[props.locale];

  const [step, setStep] = useState<1 | 2>(1);
  const [status, setStatus] = useState<UiStatus>({ kind: "idle" });
  const [form, setForm] = useState<FormState>({
    businessType: props.initialBusinessType,
    city: props.initialFilters.city,
    propertyType: props.initialFilters.type,
    minPrice: props.initialFilters.minPrice,
    maxPrice: props.initialFilters.maxPrice,
    minRooms: props.initialFilters.minRooms,
    maxRooms: props.initialFilters.maxRooms,
    minSurface: props.initialFilters.minSurface,
    maxSurface: props.initialFilters.maxSurface,
    minFloor: props.initialFilters.minFloor,
    maxFloor: props.initialFilters.maxFloor,
    terrace: normalizeTerrace(props.initialFilters.terrace),
    elevator: normalizeTerrace(props.initialFilters.elevator),
    zonePolygon: null,
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    rgpd: false,
  });

  const propertyTypes = useMemo(
    () => (form.businessType === "rental" ? props.rentalTypes : props.saleTypes),
    [form.businessType, props.rentalTypes, props.saleTypes]
  );

  useEffect(() => {
    track("buyer_search_started", {
      business_type: props.initialBusinessType,
      city: props.initialFilters.city ?? undefined,
      locale: props.locale,
    });
  }, [props.initialBusinessType, props.initialFilters.city, props.locale]);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (
        key === "zonePolygon" &&
        value &&
        Array.isArray(value) &&
        (value as ZonePolygon).length >= 3
      ) {
        track("buyer_search_zone_drawn", {
          vertices: (value as ZonePolygon).length,
          city: current.city ?? undefined,
        });
      }
      return next;
    });
  };

  const handleNext = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus({ kind: "idle" });
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
    setStatus({ kind: "idle" });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setStatus({ kind: "error", message: copy.validation.nameMissing });
      return;
    }
    const email = form.email.trim();
    if (!email.includes("@")) {
      setStatus({ kind: "error", message: copy.validation.emailInvalid });
      return;
    }
    if (!form.rgpd) {
      setStatus({ kind: "error", message: copy.validation.rgpdMissing });
      return;
    }

    setStatus({ kind: "submitting" });

    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email,
      phone: form.phone.trim() || null,
      rgpdAccepted: true,
      sourceUrl: typeof window !== "undefined" ? window.location.href : null,
      initialFilters: {
        businessType: form.businessType,
        city: form.city,
        propertyType: form.propertyType,
        minPrice: form.minPrice,
        maxPrice: form.maxPrice,
        minRooms: form.minRooms,
        maxRooms: form.maxRooms,
        minSurface: form.minSurface,
        maxSurface: form.maxSurface,
        minFloor: form.minFloor,
        maxFloor: form.maxFloor,
        terrace: form.terrace,
        elevator: form.elevator,
      },
      criteria: {
        businessType: form.businessType,
        cities: form.city.trim() ? [form.city.trim()] : [],
        propertyTypes: form.propertyType.trim() ? [form.propertyType.trim()] : [],
        locationText: form.city.trim() || null,
        budgetMin: parseNumber(form.minPrice),
        budgetMax: parseNumber(form.maxPrice),
        roomsMin: parseNumber(form.minRooms),
        roomsMax: parseNumber(form.maxRooms),
        bedroomsMin: null,
        livingAreaMin: parseNumber(form.minSurface),
        livingAreaMax: parseNumber(form.maxSurface),
        floorMin: parseNumber(form.minFloor),
        floorMax: parseNumber(form.maxFloor),
        requiresTerrace: parseBool(form.terrace),
        requiresElevator: parseBool(form.elevator),
        zonePolygon:
          form.zonePolygon && form.zonePolygon.length >= 3 ? form.zonePolygon : null,
      },
    };

    try {
      const response = await fetch("/api/buyer-searches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await response.json()) as {
        ok: boolean;
        code?: string;
        message?: string;
      };

      if (!response.ok || !json.ok) {
        setStatus({ kind: "error", message: json.message ?? copy.generic });
        return;
      }

      if (json.code === "signup_created_email_failed") {
        setStatus({ kind: "success_email_failed", email });
        track("buyer_search_saved", {
          source: "signup_form",
          email_sent: false,
          has_phone: Boolean(form.phone.trim()),
          has_zone: Boolean(form.zonePolygon && form.zonePolygon.length >= 3),
          business_type: form.businessType,
          city: form.city ?? undefined,
          property_type: form.propertyType ?? undefined,
          locale: props.locale,
        });
        return;
      }

      setStatus({ kind: "success", email });
      track("buyer_search_saved", {
        source: "signup_form",
        email_sent: true,
        has_phone: Boolean(form.phone.trim()),
        has_zone: Boolean(form.zonePolygon && form.zonePolygon.length >= 3),
        business_type: form.businessType,
        city: form.city ?? undefined,
        property_type: form.propertyType ?? undefined,
        locale: props.locale,
      });
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : copy.generic,
      });
    }
  };

  const loginHref = localizePath("/espace-client/login", props.locale);
  const homeHref = localizePath("/", props.locale);

  if (status.kind === "success") {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-[rgba(20,20,70,0.18)] bg-white/60 p-8 shadow-sm">
        <h2 className="sillage-section-title">{copy.success.title}</h2>
        <p className="sillage-editorial-text mt-3">{copy.success.body(status.email)}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={loginHref} className="sillage-btn-secondary rounded px-4 py-2 text-sm">
            {copy.success.goLogin}
          </Link>
          <Link href={homeHref} className="sillage-btn rounded px-4 py-2 text-sm">
            {copy.success.goHome}
          </Link>
        </div>
      </div>
    );
  }

  if (status.kind === "success_email_failed") {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-[rgba(20,20,70,0.18)] bg-white/60 p-8 shadow-sm">
        <h2 className="sillage-section-title">{copy.emailFail.title}</h2>
        <p className="sillage-editorial-text mt-3">{copy.emailFail.body}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={loginHref} className="sillage-btn rounded px-4 py-2 text-sm">
            {copy.emailFail.goLogin}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl max-md:pb-28">
      <ol className="mb-6 flex gap-2 text-xs uppercase tracking-[0.14em]">
        {copy.steps.map((label, index) => {
          const stepNumber = (index + 1) as 1 | 2;
          const isActive = step === stepNumber;
          return (
            <li
              key={label}
              className={`flex flex-1 items-center gap-2 rounded-full border px-3 py-1.5 ${
                isActive
                  ? "border-navy bg-navy text-sand"
                  : "border-[rgba(20,20,70,0.18)] bg-white/60 text-navy"
              }`}
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs font-semibold">
                {stepNumber}
              </span>
              <span className="truncate">{label}</span>
            </li>
          );
        })}
      </ol>

      {step === 1 ? (
        <BuyerSignupCriteriaStep
          copy={copy}
          locale={props.locale}
          form={form}
          propertyTypes={propertyTypes}
          updateField={updateField}
          onSubmit={handleNext}
        />
      ) : (
        <BuyerSignupContactStep
          copy={copy}
          form={form}
          status={status}
          updateField={updateField}
          onSubmit={handleSubmit}
          onBack={handleBack}
        />
      )}

      {/*
        Barre d'action collante — mobile uniquement (md:hidden, safe-area iOS).
        Le bouton pilote la soumission de l'étape courante via l'attribut `form`
        (soumission native du <form> concerné) : aucun changement de logique.
      */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-navy/10 bg-sand/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          {step === 2 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={status.kind === "submitting"}
              className="min-h-[48px] shrink-0 rounded-lg border border-navy/25 px-4 text-sm font-medium text-navy disabled:opacity-50"
            >
              {copy.buttons.back}
            </button>
          ) : null}
          {step === 1 ? (
            <button
              type="submit"
              form="buyer-criteria-form"
              className="min-h-[48px] flex-1 rounded-lg bg-navy px-4 text-sm font-semibold text-sand"
            >
              {copy.buttons.continue}
            </button>
          ) : (
            <button
              type="submit"
              form="buyer-contact-form"
              disabled={status.kind === "submitting"}
              className="min-h-[48px] flex-1 rounded-lg bg-[#141446] px-4 text-sm font-semibold text-sand disabled:opacity-50"
            >
              {status.kind === "submitting" ? "…" : copy.buttons.submit}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
