"use client";

import { useRef, useState } from "react";
import type { AppLocale } from "@/lib/i18n/config";
import { AddressAutocompleteInput } from "./address-autocomplete-input";
import { SellerPropertyMediaUpload } from "./seller-property-media-upload";
import { SELLER_PROJECT_FORM_COPY } from "./_copy/form-copy";
import {
  toOptionalInteger,
  type FlowForm,
  type Step,
  type UploadedPropertyMedia,
  type UpdateFlowForm,
} from "./seller-api-first-flow.shared";

type SellerProjectFormSectionProps = {
  locale?: AppLocale;
  form: FlowForm;
  loading: boolean;
  media: UploadedPropertyMedia[];
  mediaUploading: boolean;
  mediaUploadError: string | null;
  onUpdate: UpdateFlowForm;
  onUploadMedia: (kind: "image" | "video", files: File[]) => void;
  onRemoveMedia: (uploadId: string) => void;
  onSendOtp: () => void;
  /** Étape globale du flux (form → verify → result). Le parcours multi-étapes mobile
   *  n'est actif que pendant la saisie ("form"). */
  flowStep: Step;
};

// CRO : sur mobile on force une hauteur tactile >= 48px et un corps >= 16px
// (évite le zoom auto iOS au focus). Sur desktop (md+) on revient à l'apparence
// d'origine (text-sm, hauteur auto) pour ne rien changer.
const FIELD_CLASS =
  "mt-1 w-full rounded border px-3 py-2 text-base md:text-sm max-md:min-h-[48px]";

type MobileStep = 1 | 2 | 3;

export function SellerProjectFormSection({
  locale = "fr",
  form,
  loading,
  media,
  mediaUploading,
  mediaUploadError,
  onUpdate,
  onUploadMedia,
  onRemoveMedia,
  onSendOtp,
  flowStep,
}: SellerProjectFormSectionProps) {
  const copy = SELLER_PROJECT_FORM_COPY[locale];
  const sectionRef = useRef<HTMLElement | null>(null);
  const [mobileStep, setMobileStep] = useState<MobileStep>(1);

  const topFloorKnown =
    toOptionalInteger(form.floor) !== undefined &&
    toOptionalInteger(form.buildingTotalFloors) !== undefined;

  // Le stepping mobile n'est actif que pendant la saisie. Une fois l'OTP envoyé
  // (flowStep !== "form"), on révèle tout le formulaire en lecture/contexte.
  const stepping = flowStep === "form";

  // Condition de soumission finale : STRICTEMENT identique à l'existant.
  // (Ne pas modifier : gère la validation côté logique, mobile ET desktop.)
  const submitDisabled =
    loading ||
    mediaUploading ||
    !form.email ||
    !form.firstName ||
    !form.lastName ||
    !form.propertyAddress ||
    !form.terrace ||
    !form.balcony ||
    !form.elevator ||
    !form.apartmentCondition;

  // Gating par étape (affichage/UX uniquement : sous-ensembles du gate existant,
  // + ville/CP requis côté serveur pour éviter une 422 à l'envoi).
  const canLeaveStep1 =
    Boolean(form.firstName) &&
    Boolean(form.lastName) &&
    Boolean(form.email) &&
    Boolean(form.propertyAddress) &&
    Boolean(form.city) &&
    Boolean(form.postalCode);
  const canLeaveStep2 =
    Boolean(form.terrace) &&
    Boolean(form.balcony) &&
    Boolean(form.elevator) &&
    Boolean(form.apartmentCondition);

  const scrollToTop = () => {
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const goNext = () => {
    setMobileStep((prev) => {
      if (prev === 1 && !canLeaveStep1) return prev;
      if (prev === 2 && !canLeaveStep2) return prev;
      return (prev < 3 ? prev + 1 : prev) as MobileStep;
    });
    scrollToTop();
  };

  const goBack = () => {
    setMobileStep((prev) => (prev > 1 ? ((prev - 1) as MobileStep) : prev));
    scrollToTop();
  };

  // Groupe de champs : transparent sur desktop (md:contents => grille d'origine
  // inchangée) ; sur mobile, colonne unique affichée/masquée selon l'étape.
  const groupClass = (step: MobileStep) =>
    `${!stepping || mobileStep === step ? "flex" : "hidden"} flex-col gap-3 md:contents`;

  // Marqueur "facultatif" : mobile uniquement (desktop reste strictement inchangé).
  const optionalTag = (
    <span className="ml-1 text-xs font-normal opacity-55 md:hidden">({copy.optional})</span>
  );

  const stepTitles: Record<MobileStep, string> = {
    1: copy.step1Title,
    2: copy.step2Title,
    3: copy.step3Title,
  };

  const canContinue = mobileStep === 1 ? canLeaveStep1 : canLeaveStep2;

  return (
    <section
      ref={sectionRef}
      className="scroll-mt-4 rounded-2xl border border-[rgba(20,20,70,0.2)] bg-sand p-4 md:p-6 space-y-4 max-md:pb-28"
    >
      <h2 className="sillage-section-title">{copy.title}</h2>
      <p className="text-sm opacity-75">{copy.intro}</p>
      <p className="rounded-[16px] border-l-4 border-navy bg-white/70 px-4 py-3 text-sm italic text-navy/85 leading-relaxed">
        {copy.antiFriction}
      </p>

      {/* Barre de progression — mobile uniquement, pendant la saisie */}
      {stepping ? (
        <div className="md:hidden" aria-hidden={false}>
          <div className="flex items-center justify-between text-xs font-medium text-navy/70">
            <span>
              {copy.stepWord} {mobileStep}/3 — {stepTitles[mobileStep]}
            </span>
            <span>{Math.round((mobileStep / 3) * 100)}%</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-navy/10">
            <div
              className="h-full rounded-full bg-navy transition-all duration-300"
              style={{ width: `${(mobileStep / 3) * 100}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 text-sm">
        {/* ÉTAPE 1 — Contact + localisation (cœur de la lead, capturé en premier) */}
        <div className={groupClass(1)}>
          <p className="sm:col-span-2 text-xs uppercase tracking-wide opacity-70">
            {copy.contactDetails}
          </p>
          <label>
            {copy.firstName}
            <input
              className={FIELD_CLASS}
              value={form.firstName}
              onChange={(event) => onUpdate("firstName", event.target.value)}
              placeholder={copy.firstNamePlaceholder}
              autoComplete="given-name"
            />
          </label>
          <label>
            {copy.lastName}
            <input
              className={FIELD_CLASS}
              value={form.lastName}
              onChange={(event) => onUpdate("lastName", event.target.value)}
              placeholder={copy.lastNamePlaceholder}
              autoComplete="family-name"
            />
          </label>
          <label>
            {copy.email}
            <input
              className={FIELD_CLASS}
              type="email"
              inputMode="email"
              autoComplete="email"
              value={form.email}
              onChange={(event) => onUpdate("email", event.target.value)}
              placeholder={copy.emailPlaceholder}
            />
          </label>
          <label>
            {copy.phone}
            {optionalTag}
            <input
              className={FIELD_CLASS}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(event) => onUpdate("phone", event.target.value)}
              placeholder={copy.phonePlaceholder}
            />
          </label>

          <p className="sm:col-span-2 text-xs uppercase tracking-wide opacity-70">
            {copy.project}
          </p>
          <label className="sm:col-span-2">
            {copy.projectTimeline}
            <select
              className={FIELD_CLASS}
              value={form.timeline}
              onChange={(event) => onUpdate("timeline", event.target.value as FlowForm["timeline"])}
            >
              <option value="already_listed">{copy.timelineAlreadyListed}</option>
              <option value="list_now">{copy.timelineListNow}</option>
              <option value="list_within_6_months">{copy.timelineListWithin6Months}</option>
              <option value="self_sell_first">{copy.timelineSelfSellFirst}</option>
              <option value="early_reflection">{copy.timelineEarlyReflection}</option>
              <option value="personal_information_only">{copy.timelinePersonalInfoOnly}</option>
            </select>
          </label>

          <p className="sm:col-span-2 text-xs uppercase tracking-wide opacity-70">
            {copy.addressAndType}
          </p>
          <label>
            {copy.propertyType}
            <select
              className={FIELD_CLASS}
              value={form.propertyType}
              onChange={(event) =>
                onUpdate("propertyType", event.target.value as FlowForm["propertyType"])
              }
            >
              <option value="appartement">{copy.propertyTypeApartment}</option>
              <option value="maison">{copy.propertyTypeHouse}</option>
              <option value="villa">{copy.propertyTypeVilla}</option>
              <option value="autre">{copy.propertyTypeOther}</option>
            </select>
          </label>
          <AddressAutocompleteInput
            locale={locale}
            value={form.propertyAddress}
            cityValue={form.city}
            postalCodeValue={form.postalCode}
            onAddressChange={(value) => onUpdate("propertyAddress", value)}
            onAddressSelected={(data) => {
              onUpdate("propertyAddress", data.address);
              if (data.city) onUpdate("city", data.city);
              if (data.postalCode) onUpdate("postalCode", data.postalCode);
            }}
            disabled={loading}
          />
          <label>
            {copy.city}
            <input
              className={FIELD_CLASS}
              value={form.city}
              onChange={(event) => onUpdate("city", event.target.value)}
              placeholder={copy.cityPlaceholder}
              autoComplete="address-level2"
            />
          </label>
          <label>
            {copy.postalCode}
            <input
              className={FIELD_CLASS}
              inputMode="numeric"
              autoComplete="postal-code"
              value={form.postalCode}
              onChange={(event) => onUpdate("postalCode", event.target.value)}
              placeholder={copy.postalCodePlaceholder}
            />
          </label>
        </div>

        {/* ÉTAPE 2 — Caractéristiques (majoritairement facultatives, ton rassurant) */}
        <div className={groupClass(2)}>
          <p className="sm:col-span-2 text-xs uppercase tracking-wide opacity-70">
            {copy.characteristics}
          </p>
          <p className="sm:col-span-2 text-xs italic opacity-70 md:hidden">{copy.optionalNote}</p>
          <label>
            {copy.surface}
            {optionalTag}
            <input
              className={FIELD_CLASS}
              inputMode="numeric"
              value={form.livingArea}
              onChange={(event) => onUpdate("livingArea", event.target.value)}
              placeholder={copy.surfacePlaceholder}
            />
          </label>
          <label>
            {copy.rooms}
            {optionalTag}
            <input
              className={FIELD_CLASS}
              inputMode="numeric"
              value={form.rooms}
              onChange={(event) => onUpdate("rooms", event.target.value)}
              placeholder={copy.roomsPlaceholder}
            />
          </label>
          <label>
            {copy.floor}
            {optionalTag}
            <input
              className={FIELD_CLASS}
              inputMode="numeric"
              value={form.floor}
              onChange={(event) => onUpdate("floor", event.target.value)}
              placeholder={copy.floorPlaceholder}
            />
          </label>
          <label>
            {copy.buildingTotalFloors}
            {optionalTag}
            <input
              className={FIELD_CLASS}
              inputMode="numeric"
              value={form.buildingTotalFloors}
              onChange={(event) => onUpdate("buildingTotalFloors", event.target.value)}
              placeholder={copy.buildingTotalFloorsPlaceholder}
            />
          </label>
          <label>
            {copy.terrace}
            <select
              className={FIELD_CLASS}
              value={form.terrace}
              onChange={(event) => onUpdate("terrace", event.target.value as FlowForm["terrace"])}
            >
              <option value="">{copy.select}</option>
              <option value="yes">{copy.yes}</option>
              <option value="no">{copy.no}</option>
            </select>
          </label>
          {form.terrace === "yes" ? (
            <label>
              {copy.terraceArea}
              {optionalTag}
              <input
                className={FIELD_CLASS}
                inputMode="numeric"
                value={form.terraceArea}
                onChange={(event) => onUpdate("terraceArea", event.target.value)}
                placeholder={copy.terraceAreaPlaceholder}
              />
            </label>
          ) : null}
          <label>
            {copy.balcony}
            <select
              className={FIELD_CLASS}
              value={form.balcony}
              onChange={(event) => onUpdate("balcony", event.target.value as FlowForm["balcony"])}
            >
              <option value="">{copy.select}</option>
              <option value="yes">{copy.yes}</option>
              <option value="no">{copy.no}</option>
            </select>
          </label>
          {form.balcony === "yes" ? (
            <label>
              {copy.balconyArea}
              {optionalTag}
              <input
                className={FIELD_CLASS}
                inputMode="numeric"
                value={form.balconyArea}
                onChange={(event) => onUpdate("balconyArea", event.target.value)}
                placeholder={copy.balconyAreaPlaceholder}
              />
            </label>
          ) : null}
          <label>
            {copy.exposure}
            {optionalTag}
            <select
              className={FIELD_CLASS}
              value={form.livingExposure}
              onChange={(event) =>
                onUpdate("livingExposure", event.target.value as FlowForm["livingExposure"])
              }
            >
              <option value="">{copy.select}</option>
              <option value="north">{copy.exposureNorth}</option>
              <option value="north_east">{copy.exposureNorthEast}</option>
              <option value="east">{copy.exposureEast}</option>
              <option value="south_east">{copy.exposureSouthEast}</option>
              <option value="south">{copy.exposureSouth}</option>
              <option value="south_west">{copy.exposureSouthWest}</option>
              <option value="west">{copy.exposureWest}</option>
              <option value="north_west">{copy.exposureNorthWest}</option>
            </select>
          </label>
          <label>
            {copy.elevator}
            <select
              className={FIELD_CLASS}
              value={form.elevator}
              onChange={(event) => onUpdate("elevator", event.target.value as FlowForm["elevator"])}
            >
              <option value="">{copy.select}</option>
              <option value="yes">{copy.yes}</option>
              <option value="no">{copy.no}</option>
            </select>
          </label>
          <label>
            {copy.apartmentCondition}
            <select
              className={FIELD_CLASS}
              value={form.apartmentCondition}
              onChange={(event) =>
                onUpdate("apartmentCondition", event.target.value as FlowForm["apartmentCondition"])
              }
            >
              <option value="">{copy.select}</option>
              <option value="a_renover">{copy.apartmentConditionToRenovate}</option>
              <option value="renove_20_ans">{copy.apartmentConditionRenovated20}</option>
              <option value="renove_10_ans">{copy.apartmentConditionRenovated10}</option>
              <option value="renove_moins_5_ans">{copy.apartmentConditionRenovated5}</option>
              <option value="neuf">{copy.apartmentConditionNew}</option>
            </select>
          </label>
          <label>
            {copy.buildingAge}
            <select
              className={FIELD_CLASS}
              value={form.buildingAge}
              onChange={(event) =>
                onUpdate("buildingAge", event.target.value as FlowForm["buildingAge"])
              }
            >
              <option value="">{copy.notSpecified}</option>
              <option value="ancien_1950">{copy.buildingAgeOld}</option>
              <option value="recent_1950_1970">{copy.buildingAgeRecent}</option>
              <option value="moderne_1980_today">{copy.buildingAgeModern}</option>
            </select>
          </label>
          <label>
            {copy.seaView}
            {optionalTag}
            <select
              className={FIELD_CLASS}
              value={form.seaView}
              onChange={(event) => onUpdate("seaView", event.target.value as FlowForm["seaView"])}
            >
              <option value="">{copy.notSpecified}</option>
              <option value="none">{copy.no}</option>
              <option value="panoramic">{copy.seaViewPanoramic}</option>
              <option value="classic">{copy.seaViewClassic}</option>
              <option value="lateral">{copy.seaViewLateral}</option>
            </select>
          </label>
          {topFloorKnown ? (
            <p className="sm:col-span-2 text-xs opacity-70">
              {copy.topFloor} :{" "}
              <strong>
                {toOptionalInteger(form.floor) === toOptionalInteger(form.buildingTotalFloors)
                  ? copy.yes
                  : copy.no}
              </strong>
            </p>
          ) : null}
        </div>

        {/* ÉTAPE 3 — Médias (facultatif) + informations libres + validation finale */}
        <div className={groupClass(3)}>
          <label className="sm:col-span-2">
            {copy.usefulInfo}
            <textarea
              className={FIELD_CLASS}
              rows={3}
              value={form.message}
              onChange={(event) => onUpdate("message", event.target.value)}
              placeholder={copy.usefulInfoPlaceholder}
            />
          </label>
          <SellerPropertyMediaUpload
            locale={locale}
            loading={loading}
            uploading={mediaUploading}
            media={media}
            error={mediaUploadError}
            onUpload={onUploadMedia}
            onRemove={onRemoveMedia}
          />
        </div>
      </div>

      {/* Bouton d'envoi desktop — inchangé (masqué sur mobile, remplacé par la barre collante) */}
      <button
        className="sillage-btn rounded px-4 py-2 text-sm disabled:opacity-60 max-md:hidden"
        type="button"
        disabled={submitDisabled}
        onClick={onSendOtp}
      >
        {loading ? copy.sending : copy.send}
      </button>

      {/* Barre d'action collante — mobile uniquement, pendant la saisie */}
      {stepping ? (
        <div className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-navy/10 bg-sand/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
          {mobileStep === 3 ? (
            <p className="mb-2 text-center text-xs leading-snug text-navy/70">
              {copy.finalReassurance}
            </p>
          ) : null}
          <div className="flex items-center gap-3">
            {mobileStep > 1 ? (
              <button
                type="button"
                className="min-h-[48px] shrink-0 rounded-lg border border-navy/25 px-4 text-sm font-medium text-navy"
                onClick={goBack}
              >
                {copy.back}
              </button>
            ) : null}
            {mobileStep < 3 ? (
              <button
                type="button"
                className="min-h-[48px] flex-1 rounded-lg bg-navy px-4 text-sm font-semibold text-sand disabled:opacity-50"
                disabled={!canContinue}
                onClick={goNext}
              >
                {copy.continueLabel}
              </button>
            ) : (
              <button
                type="button"
                className="min-h-[48px] flex-1 rounded-lg bg-[#141446] px-4 text-sm font-semibold text-sand disabled:opacity-50"
                disabled={submitDisabled}
                onClick={onSendOtp}
              >
                {loading ? copy.sending : copy.send}
              </button>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
