"use client";

import dynamic from "next/dynamic";
import type { AppLocale } from "@/lib/i18n/config";
import { formatPropertyTypeLabel } from "@/lib/properties/property-type-label";
import type { BuyerSignupCopy } from "./buyer-signup-copy";
import { normalizeTerrace, type FormState } from "./buyer-signup-helpers";

const BuyerSearchZoneMap = dynamic(
  () =>
    import("@/app/components/buyer-search-zone-map").then(
      (mod) => mod.BuyerSearchZoneMap
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[55vh] min-h-[340px] w-full animate-pulse rounded-xl border border-[rgba(20,20,70,0.18)] bg-[#e9e1d8] md:h-[360px]" />
    ),
  }
);

// CRO : hauteur tactile >= 48px et corps >= 16px sur mobile (évite le zoom iOS),
// retour à l'apparence d'origine (text-sm, hauteur auto) sur desktop.
const FIELD_CLASS =
  "mt-1 w-full rounded border bg-white/80 px-3 py-2 text-base md:text-sm max-md:min-h-[48px]";

type BuyerSignupCriteriaStepProps = {
  copy: BuyerSignupCopy;
  locale: AppLocale;
  form: FormState;
  propertyTypes: string[];
  updateField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function BuyerSignupCriteriaStep({
  copy,
  locale,
  form,
  propertyTypes,
  updateField,
  onSubmit,
}: BuyerSignupCriteriaStepProps) {
  return (
    <form id="buyer-criteria-form" className="space-y-6" onSubmit={onSubmit}>
      <h2 className="text-xl font-semibold">{copy.sections.criteria}</h2>
      <p className="rounded-[16px] border-l-4 border-navy bg-white/70 px-4 py-3 text-sm italic text-navy/85 leading-relaxed">
        {copy.sections.criteriaIntro}
      </p>
      {/* Achat / Location en premier : gros segments tactiles sur mobile (pills sur desktop). */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{copy.fields.businessType}</legend>
        <div className="grid grid-cols-2 gap-2 md:flex">
          {(["sale", "rental"] as const).map((bt) => (
            <button
              key={bt}
              type="button"
              className={`rounded-full border px-4 py-2 text-base max-md:min-h-[48px] max-md:font-medium md:text-sm ${
                form.businessType === bt
                  ? "border-navy bg-navy text-sand"
                  : "border-[rgba(20,20,70,0.18)] bg-white/70 text-navy"
              }`}
              onClick={() => updateField("businessType", bt)}
            >
              {bt === "sale" ? copy.fields.sale : copy.fields.rental}
            </button>
          ))}
        </div>
      </fieldset>

      {/*
        Mobile : ville & type en pleine largeur, puis chaque paire min/max sur une
        seule ligne à 2 colonnes. Desktop : `md:col-span-1` rétablit la grille
        2 colonnes d'origine (agencement inchangé).
      */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-2 md:gap-4">
        <label className="col-span-2 text-sm md:col-span-1">
          {copy.fields.city}
          <input
            className={FIELD_CLASS}
            value={form.city}
            onChange={(event) => updateField("city", event.target.value)}
            placeholder={copy.fields.cityPlaceholder}
          />
        </label>
        <label className="col-span-2 text-sm md:col-span-1">
          {copy.fields.propertyType}
          <select
            className={FIELD_CLASS}
            value={form.propertyType}
            onChange={(event) => updateField("propertyType", event.target.value)}
          >
            <option value="">{copy.fields.allTypes}</option>
            {propertyTypes.map((type) => (
              <option key={type} value={type}>
                {formatPropertyTypeLabel(type, locale) ?? type}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          {copy.fields.minBudget}
          <input
            className={FIELD_CLASS}
            inputMode="numeric"
            value={form.minPrice}
            onChange={(event) => updateField("minPrice", event.target.value)}
          />
        </label>
        <label className="text-sm">
          {copy.fields.maxBudget}
          <input
            className={FIELD_CLASS}
            inputMode="numeric"
            value={form.maxPrice}
            onChange={(event) => updateField("maxPrice", event.target.value)}
          />
        </label>
        <label className="text-sm">
          {copy.fields.minRooms}
          <input
            className={FIELD_CLASS}
            inputMode="numeric"
            value={form.minRooms}
            onChange={(event) => updateField("minRooms", event.target.value)}
          />
        </label>
        <label className="text-sm">
          {copy.fields.maxRooms}
          <input
            className={FIELD_CLASS}
            inputMode="numeric"
            value={form.maxRooms}
            onChange={(event) => updateField("maxRooms", event.target.value)}
          />
        </label>
        <label className="text-sm">
          {copy.fields.minSurface}
          <input
            className={FIELD_CLASS}
            inputMode="numeric"
            value={form.minSurface}
            onChange={(event) => updateField("minSurface", event.target.value)}
          />
        </label>
        <label className="text-sm">
          {copy.fields.maxSurface}
          <input
            className={FIELD_CLASS}
            inputMode="numeric"
            value={form.maxSurface}
            onChange={(event) => updateField("maxSurface", event.target.value)}
          />
        </label>
        <label className="text-sm">
          {copy.fields.minFloor}
          <input
            className={FIELD_CLASS}
            inputMode="numeric"
            value={form.minFloor}
            onChange={(event) => updateField("minFloor", event.target.value)}
          />
        </label>
        <label className="text-sm">
          {copy.fields.maxFloor}
          <input
            className={FIELD_CLASS}
            inputMode="numeric"
            value={form.maxFloor}
            onChange={(event) => updateField("maxFloor", event.target.value)}
          />
        </label>
        <label className="col-span-2 text-sm md:col-span-1">
          {copy.fields.terrace}
          <select
            className={FIELD_CLASS}
            value={form.terrace}
            onChange={(event) =>
              updateField("terrace", normalizeTerrace(event.target.value))
            }
          >
            <option value="">{copy.fields.indifferent}</option>
            <option value="true">{copy.fields.yes}</option>
            <option value="false">{copy.fields.no}</option>
          </select>
        </label>
        <label className="col-span-2 text-sm md:col-span-1">
          {copy.fields.elevator}
          <select
            className={FIELD_CLASS}
            value={form.elevator}
            onChange={(event) =>
              updateField("elevator", normalizeTerrace(event.target.value))
            }
          >
            <option value="">{copy.fields.indifferent}</option>
            <option value="true">{copy.fields.yes}</option>
            <option value="false">{copy.fields.no}</option>
          </select>
        </label>
      </div>

      <div className="mt-8 space-y-3 rounded-2xl border border-[rgba(20,20,70,0.18)] bg-white/60 p-5">
        <div>
          <h3 className="text-lg font-semibold">{copy.sections.zone}</h3>
          <p className="mt-1 text-xs opacity-75">{copy.sections.zoneHint}</p>
        </div>
        <BuyerSearchZoneMap
          locale={locale}
          value={form.zonePolygon}
          onChange={(polygon) => updateField("zonePolygon", polygon)}
        />
        <p className="text-xs italic opacity-70">{copy.sections.zoneReassurance}</p>
      </div>

      {/* Bouton desktop inchangé ; sur mobile, action déportée dans la barre collante. */}
      <div className="flex justify-end max-md:hidden">
        <button type="submit" className="sillage-btn rounded px-5 py-2 text-sm">
          {copy.buttons.next}
        </button>
      </div>
    </form>
  );
}
