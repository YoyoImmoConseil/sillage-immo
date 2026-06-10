"use client";

import type { AppLocale } from "@/lib/i18n/config";
import { AddressAutocompleteInput } from "./address-autocomplete-input";
import { SellerPropertyMediaUpload } from "./seller-property-media-upload";
import { SELLER_PROJECT_FORM_COPY } from "./_copy/form-copy";
import {
  toOptionalInteger,
  type FlowForm,
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
};

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
}: SellerProjectFormSectionProps) {
  const copy = SELLER_PROJECT_FORM_COPY[locale];
  const topFloorKnown =
    toOptionalInteger(form.floor) !== undefined &&
    toOptionalInteger(form.buildingTotalFloors) !== undefined;

  return (
    <section className="rounded-2xl border border-[rgba(20,20,70,0.2)] bg-sand p-6 space-y-4">
      <h2 className="sillage-section-title">{copy.title}</h2>
      <p className="text-sm opacity-75">{copy.intro}</p>
      <p className="rounded-[16px] border-l-4 border-navy bg-white/70 px-4 py-3 text-sm italic text-navy/85 leading-relaxed">
        {copy.antiFriction}
      </p>
      <div className="grid gap-3 sm:grid-cols-2 text-sm">
        <p className="sm:col-span-2 text-xs uppercase tracking-wide opacity-70">
          {copy.contactDetails}
        </p>
        <label>
          {copy.firstName}
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.firstName}
            onChange={(event) => onUpdate("firstName", event.target.value)}
            placeholder={copy.firstNamePlaceholder}
          />
        </label>
        <label>
          {copy.lastName}
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.lastName}
            onChange={(event) => onUpdate("lastName", event.target.value)}
            placeholder={copy.lastNamePlaceholder}
          />
        </label>
        <label>
          {copy.email}
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            type="email"
            value={form.email}
            onChange={(event) => onUpdate("email", event.target.value)}
            placeholder={copy.emailPlaceholder}
          />
        </label>
        <label>
          {copy.phone}
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.phone}
            onChange={(event) => onUpdate("phone", event.target.value)}
            placeholder={copy.phonePlaceholder}
          />
        </label>

        <p className="sm:col-span-2 text-xs uppercase tracking-wide opacity-70">{copy.project}</p>
        <label className="sm:col-span-2">
          {copy.projectTimeline}
          <select
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.timeline}
            onChange={(event) => onUpdate("timeline", event.target.value as FlowForm["timeline"])}
          >
            <option value="already_listed">{copy.timelineAlreadyListed}</option>
            <option value="list_now">{copy.timelineListNow}</option>
            <option value="list_within_6_months">{copy.timelineListWithin6Months}</option>
            <option value="self_sell_first">
              {copy.timelineSelfSellFirst}
            </option>
            <option value="early_reflection">{copy.timelineEarlyReflection}</option>
            <option value="personal_information_only">
              {copy.timelinePersonalInfoOnly}
            </option>
          </select>
        </label>

        <p className="sm:col-span-2 text-xs uppercase tracking-wide opacity-70">
          {copy.addressAndType}
        </p>
        <label>
          {copy.propertyType}
          <select
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.propertyType}
            onChange={(event) => onUpdate("propertyType", event.target.value as FlowForm["propertyType"])}
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
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.city}
            onChange={(event) => onUpdate("city", event.target.value)}
            placeholder={copy.cityPlaceholder}
          />
        </label>
        <label>
          {copy.postalCode}
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.postalCode}
            onChange={(event) => onUpdate("postalCode", event.target.value)}
            placeholder={copy.postalCodePlaceholder}
          />
        </label>

        <p className="sm:col-span-2 text-xs uppercase tracking-wide opacity-70">
          {copy.characteristics}
        </p>
        <label>
          {copy.surface}
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.livingArea}
            onChange={(event) => onUpdate("livingArea", event.target.value)}
            placeholder={copy.surfacePlaceholder}
          />
        </label>
        <label>
          {copy.rooms}
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.rooms}
            onChange={(event) => onUpdate("rooms", event.target.value)}
            placeholder={copy.roomsPlaceholder}
          />
        </label>
        <label>
          {copy.floor}
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.floor}
            onChange={(event) => onUpdate("floor", event.target.value)}
            placeholder={copy.floorPlaceholder}
          />
        </label>
        <label>
          {copy.buildingTotalFloors}
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.buildingTotalFloors}
            onChange={(event) => onUpdate("buildingTotalFloors", event.target.value)}
            placeholder={copy.buildingTotalFloorsPlaceholder}
          />
        </label>
        <label>
          {copy.terrace}
          <select
            className="mt-1 w-full rounded border px-3 py-2"
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
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={form.terraceArea}
              onChange={(event) => onUpdate("terraceArea", event.target.value)}
              placeholder={copy.terraceAreaPlaceholder}
            />
          </label>
        ) : null}
        <label>
          {copy.balcony}
          <select
            className="mt-1 w-full rounded border px-3 py-2"
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
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={form.balconyArea}
              onChange={(event) => onUpdate("balconyArea", event.target.value)}
              placeholder={copy.balconyAreaPlaceholder}
            />
          </label>
        ) : null}
        <label>
          {copy.exposure}
          <select
            className="mt-1 w-full rounded border px-3 py-2"
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
            className="mt-1 w-full rounded border px-3 py-2"
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
            className="mt-1 w-full rounded border px-3 py-2"
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
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.buildingAge}
            onChange={(event) => onUpdate("buildingAge", event.target.value as FlowForm["buildingAge"])}
          >
            <option value="">{copy.notSpecified}</option>
            <option value="ancien_1950">{copy.buildingAgeOld}</option>
            <option value="recent_1950_1970">{copy.buildingAgeRecent}</option>
            <option value="moderne_1980_today">{copy.buildingAgeModern}</option>
          </select>
        </label>
        <label>
          {copy.seaView}
          <select
            className="mt-1 w-full rounded border px-3 py-2"
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
        <label className="sm:col-span-2">
          {copy.usefulInfo}
          <textarea
            className="mt-1 w-full rounded border px-3 py-2"
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

      <button
        className="sillage-btn rounded px-4 py-2 text-sm disabled:opacity-60"
        type="button"
        disabled={
          loading ||
          mediaUploading ||
          !form.email ||
          !form.firstName ||
          !form.lastName ||
          !form.propertyAddress ||
          !form.terrace ||
          !form.balcony ||
          !form.elevator ||
          !form.apartmentCondition
        }
        onClick={onSendOtp}
      >
        {loading ? copy.sending : copy.send}
      </button>
    </section>
  );
}
