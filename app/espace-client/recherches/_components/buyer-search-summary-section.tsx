"use client";

import type { CriteriaRow, DashboardCopy, EditState } from "./buyer-search-helpers";

type BuyerSearchSummarySectionProps = {
  copy: DashboardCopy;
  archived: boolean;
  criteriaSummary: CriteriaRow[];
  isEditing: boolean;
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
  isPending: boolean;
  edit: EditState;
  setEdit: React.Dispatch<React.SetStateAction<EditState>>;
  submitPatch: () => Promise<void>;
};

export function BuyerSearchSummarySection({
  copy,
  archived,
  criteriaSummary,
  isEditing,
  setIsEditing,
  isPending,
  edit,
  setEdit,
  submitPatch,
}: BuyerSearchSummarySectionProps) {
  return (
    <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-sand p-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-navy">{copy.sectionSummary}</h2>
        {!archived ? (
          <button
            type="button"
            className="sillage-btn-secondary rounded px-3 py-1.5 text-sm"
            onClick={() => setIsEditing((value) => !value)}
            disabled={isPending}
          >
            {isEditing ? copy.cancel : copy.edit}
          </button>
        ) : null}
      </div>

      {!isEditing ? (
        <dl className="mt-4 grid gap-x-6 gap-y-3 md:grid-cols-2">
          {criteriaSummary.map((row) => (
            <div key={row.label} className="flex items-start justify-between gap-3 border-b border-[rgba(20,20,70,0.08)] py-2 text-sm">
              <dt className="font-medium text-navy/70">{row.label}</dt>
              <dd className="text-right text-navy">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <form
          className="mt-4 grid gap-4 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            void submitPatch();
          }}
        >
          <label className="text-sm">
            {copy.labels.businessType}
            <select
              className="mt-1 w-full rounded border bg-white/80 px-3 py-2"
              value={edit.businessType}
              onChange={(event) =>
                setEdit((current) => ({
                  ...current,
                  businessType: event.target.value === "rental" ? "rental" : "sale",
                }))
              }
            >
              <option value="sale">{copy.labels.sale}</option>
              <option value="rental">{copy.labels.rental}</option>
            </select>
          </label>
          <label className="text-sm">
            {copy.labels.cities}
            <input
              className="mt-1 w-full rounded border bg-white/80 px-3 py-2"
              value={edit.locationText}
              onChange={(event) =>
                setEdit((current) => ({ ...current, locationText: event.target.value }))
              }
            />
          </label>
          <label className="text-sm md:col-span-2">
            {copy.labels.propertyTypes}
            <input
              className="mt-1 w-full rounded border bg-white/80 px-3 py-2"
              value={edit.propertyTypes}
              onChange={(event) =>
                setEdit((current) => ({ ...current, propertyTypes: event.target.value }))
              }
            />
          </label>
          <label className="text-sm">
            {copy.labels.budget} min
            <input
              className="mt-1 w-full rounded border bg-white/80 px-3 py-2"
              inputMode="numeric"
              value={edit.budgetMin}
              onChange={(event) =>
                setEdit((current) => ({ ...current, budgetMin: event.target.value }))
              }
            />
          </label>
          <label className="text-sm">
            {copy.labels.budget} max
            <input
              className="mt-1 w-full rounded border bg-white/80 px-3 py-2"
              inputMode="numeric"
              value={edit.budgetMax}
              onChange={(event) =>
                setEdit((current) => ({ ...current, budgetMax: event.target.value }))
              }
            />
          </label>
          <label className="text-sm">
            {copy.labels.rooms} min
            <input
              className="mt-1 w-full rounded border bg-white/80 px-3 py-2"
              inputMode="numeric"
              value={edit.roomsMin}
              onChange={(event) =>
                setEdit((current) => ({ ...current, roomsMin: event.target.value }))
              }
            />
          </label>
          <label className="text-sm">
            {copy.labels.rooms} max
            <input
              className="mt-1 w-full rounded border bg-white/80 px-3 py-2"
              inputMode="numeric"
              value={edit.roomsMax}
              onChange={(event) =>
                setEdit((current) => ({ ...current, roomsMax: event.target.value }))
              }
            />
          </label>
          <label className="text-sm">
            {copy.labels.surface} min
            <input
              className="mt-1 w-full rounded border bg-white/80 px-3 py-2"
              inputMode="numeric"
              value={edit.livingAreaMin}
              onChange={(event) =>
                setEdit((current) => ({ ...current, livingAreaMin: event.target.value }))
              }
            />
          </label>
          <label className="text-sm">
            {copy.labels.surface} max
            <input
              className="mt-1 w-full rounded border bg-white/80 px-3 py-2"
              inputMode="numeric"
              value={edit.livingAreaMax}
              onChange={(event) =>
                setEdit((current) => ({ ...current, livingAreaMax: event.target.value }))
              }
            />
          </label>
          <label className="text-sm">
            {copy.labels.floor} min
            <input
              className="mt-1 w-full rounded border bg-white/80 px-3 py-2"
              inputMode="numeric"
              value={edit.floorMin}
              onChange={(event) =>
                setEdit((current) => ({ ...current, floorMin: event.target.value }))
              }
            />
          </label>
          <label className="text-sm">
            {copy.labels.floor} max
            <input
              className="mt-1 w-full rounded border bg-white/80 px-3 py-2"
              inputMode="numeric"
              value={edit.floorMax}
              onChange={(event) =>
                setEdit((current) => ({ ...current, floorMax: event.target.value }))
              }
            />
          </label>
          <label className="text-sm">
            {copy.labels.terrace}
            <select
              className="mt-1 w-full rounded border bg-white/80 px-3 py-2"
              value={edit.requiresTerrace}
              onChange={(event) =>
                setEdit((current) => ({
                  ...current,
                  requiresTerrace:
                    event.target.value === "yes"
                      ? "yes"
                      : event.target.value === "no"
                        ? "no"
                        : "any",
                }))
              }
            >
              <option value="any">{copy.labels.any}</option>
              <option value="yes">{copy.labels.yes}</option>
              <option value="no">{copy.labels.no}</option>
            </select>
          </label>
          <label className="text-sm">
            {copy.labels.elevator}
            <select
              className="mt-1 w-full rounded border bg-white/80 px-3 py-2"
              value={edit.requiresElevator}
              onChange={(event) =>
                setEdit((current) => ({
                  ...current,
                  requiresElevator:
                    event.target.value === "yes"
                      ? "yes"
                      : event.target.value === "no"
                        ? "no"
                        : "any",
                }))
              }
            >
              <option value="any">{copy.labels.any}</option>
              <option value="yes">{copy.labels.yes}</option>
              <option value="no">{copy.labels.no}</option>
            </select>
          </label>
          <div className="md:col-span-2 flex flex-wrap gap-3">
            <button
              type="submit"
              className="sillage-btn rounded px-5 py-2 text-sm"
              disabled={isPending}
            >
              {copy.save}
            </button>
            <button
              type="button"
              className="sillage-btn-secondary rounded px-5 py-2 text-sm"
              disabled={isPending}
              onClick={() => setIsEditing(false)}
            >
              {copy.cancel}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
