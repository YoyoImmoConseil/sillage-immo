"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AppLocale } from "@/lib/i18n/config";
import type { BuyerSearchProfileSnapshot } from "@/types/domain/buyers";
import type { BuyerSearchMatchListItem } from "@/services/buyers/buyer-portal.service";
import type { ZonePolygon } from "@/app/components/buyer-search-zone-map";

const BuyerSearchZoneMap = dynamic(
  () =>
    import("@/app/components/buyer-search-zone-map").then(
      (mod) => mod.BuyerSearchZoneMap
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[360px] w-full animate-pulse rounded-xl border border-[rgba(20,20,70,0.18)] bg-[#e9e1d8]" />
    ),
  }
);

const extractZonePolygon = (
  criteria: Record<string, unknown>
): ZonePolygon | null => {
  const raw = criteria?.zonePolygon;
  if (!Array.isArray(raw)) return null;
  const polygon: ZonePolygon = [];
  for (const point of raw) {
    if (
      Array.isArray(point) &&
      point.length === 2 &&
      typeof point[0] === "number" &&
      typeof point[1] === "number"
    ) {
      polygon.push([point[0], point[1]]);
    } else {
      return null;
    }
  }
  return polygon.length >= 3 ? polygon : null;
};

type CriteriaRow = { label: string; value: string };

type DashboardCopy = {
  sectionSummary: string;
  sectionZone: string;
  sectionZoneHint: string;
  zoneNotSet: string;
  sectionMatches: string;
  sectionActions: string;
  pause: string;
  resume: string;
  archive: string;
  edit: string;
  save: string;
  cancel: string;
  noMatches: string;
  newBadge: string;
  scoreLabel: string;
  openListing: string;
  confirmArchive: string;
  labels: {
    businessType: string;
    sale: string;
    rental: string;
    cities: string;
    propertyTypes: string;
    budget: string;
    rooms: string;
    surface: string;
    floor: string;
    terrace: string;
    elevator: string;
    yes: string;
    no: string;
    any: string;
  };
};

type Props = {
  locale: AppLocale;
  projectId: string;
  status: string;
  archived: boolean;
  criteriaSummary: CriteriaRow[];
  searchProfile: BuyerSearchProfileSnapshot;
  matches: BuyerSearchMatchListItem[];
  copy: DashboardCopy;
};

type EditState = {
  businessType: "sale" | "rental";
  locationText: string;
  propertyTypes: string;
  budgetMin: string;
  budgetMax: string;
  roomsMin: string;
  roomsMax: string;
  livingAreaMin: string;
  livingAreaMax: string;
  floorMin: string;
  floorMax: string;
  requiresTerrace: "any" | "yes" | "no";
  requiresElevator: "any" | "yes" | "no";
};

const toInput = (value: number | null) => (value === null ? "" : String(value));
const parseNullable = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const mapTriState = (value: boolean | null): "any" | "yes" | "no" => {
  if (value === true) return "yes";
  if (value === false) return "no";
  return "any";
};

const unmapTriState = (value: "any" | "yes" | "no"): boolean | null => {
  if (value === "yes") return true;
  if (value === "no") return false;
  return null;
};

export function BuyerSearchDashboard(props: Props) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const hasMarkedRef = useRef(false);

  const initialZone = useMemo(
    () => extractZonePolygon(props.searchProfile.criteria ?? {}),
    [props.searchProfile.criteria]
  );
  const [zone, setZone] = useState<ZonePolygon | null>(initialZone);
  const [isEditingZone, setIsEditingZone] = useState(false);

  const [edit, setEdit] = useState<EditState>({
    businessType: props.searchProfile.businessType,
    locationText:
      props.searchProfile.locationText ??
      (props.searchProfile.cities.length > 0
        ? props.searchProfile.cities.join(", ")
        : ""),
    propertyTypes: props.searchProfile.propertyTypes.join(", "),
    budgetMin: toInput(props.searchProfile.budgetMin),
    budgetMax: toInput(props.searchProfile.budgetMax),
    roomsMin: toInput(props.searchProfile.roomsMin),
    roomsMax: toInput(props.searchProfile.roomsMax),
    livingAreaMin: toInput(props.searchProfile.livingAreaMin),
    livingAreaMax: toInput(props.searchProfile.livingAreaMax),
    floorMin: toInput(props.searchProfile.floorMin),
    floorMax: toInput(props.searchProfile.floorMax),
    requiresTerrace: mapTriState(props.searchProfile.requiresTerrace),
    requiresElevator: mapTriState(props.searchProfile.requiresElevator),
  });

  useEffect(() => {
    if (hasMarkedRef.current) return;
    if (props.matches.every((item) => !item.isNew)) return;
    hasMarkedRef.current = true;
    fetch(
      `/api/espace-client/buyer-searches/${encodeURIComponent(props.projectId)}/matches/mark-read`,
      { method: "POST" }
    )
      .then(() => {
        router.refresh();
      })
      .catch(() => {});
  }, [props.matches, props.projectId, router]);

  const matchListItems = useMemo(() => props.matches, [props.matches]);

  const runAction = async (runner: () => Promise<Response>) => {
    setIsPending(true);
    setActionError(null);
    try {
      const response = await runner();
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? "action_failed");
      }
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "action_failed");
    } finally {
      setIsPending(false);
    }
  };

  const submitPatch = async () => {
    const body = {
      businessType: edit.businessType,
      locationText: edit.locationText.trim() || null,
      cities: edit.locationText
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      propertyTypes: edit.propertyTypes
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      budgetMin: parseNullable(edit.budgetMin),
      budgetMax: parseNullable(edit.budgetMax),
      roomsMin: parseNullable(edit.roomsMin),
      roomsMax: parseNullable(edit.roomsMax),
      livingAreaMin: parseNullable(edit.livingAreaMin),
      livingAreaMax: parseNullable(edit.livingAreaMax),
      floorMin: parseNullable(edit.floorMin),
      floorMax: parseNullable(edit.floorMax),
      requiresTerrace: unmapTriState(edit.requiresTerrace),
      requiresElevator: unmapTriState(edit.requiresElevator),
    };
    await runAction(() =>
      fetch(`/api/espace-client/buyer-searches/${encodeURIComponent(props.projectId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })
    );
    setIsEditing(false);
  };

  const saveZone = async () => {
    await runAction(() =>
      fetch(`/api/espace-client/buyer-searches/${encodeURIComponent(props.projectId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          zonePolygon: zone && zone.length >= 3 ? zone : null,
        }),
      })
    );
    setIsEditingZone(false);
  };

  const cancelZoneEdit = () => {
    setZone(initialZone);
    setIsEditingZone(false);
  };

  const pauseOrResume = () => {
    const nextStatus = props.status === "paused" ? "active" : "paused";
    return runAction(() =>
      fetch(
        `/api/espace-client/buyer-searches/${encodeURIComponent(props.projectId)}/pause`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        }
      )
    );
  };

  const archive = async () => {
    if (!window.confirm(props.copy.confirmArchive)) return;
    await runAction(() =>
      fetch(`/api/espace-client/buyer-searches/${encodeURIComponent(props.projectId)}`, {
        method: "DELETE",
      })
    );
  };

  return (
    <>
      <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-[#141446]">{props.copy.sectionSummary}</h2>
          {!props.archived ? (
            <button
              type="button"
              className="sillage-btn-secondary rounded px-3 py-1.5 text-sm"
              onClick={() => setIsEditing((value) => !value)}
              disabled={isPending}
            >
              {isEditing ? props.copy.cancel : props.copy.edit}
            </button>
          ) : null}
        </div>

        {!isEditing ? (
          <dl className="mt-4 grid gap-x-6 gap-y-3 md:grid-cols-2">
            {props.criteriaSummary.map((row) => (
              <div key={row.label} className="flex items-start justify-between gap-3 border-b border-[rgba(20,20,70,0.08)] py-2 text-sm">
                <dt className="font-medium text-[#141446]/70">{row.label}</dt>
                <dd className="text-right text-[#141446]">{row.value}</dd>
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
              {props.copy.labels.businessType}
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
                <option value="sale">{props.copy.labels.sale}</option>
                <option value="rental">{props.copy.labels.rental}</option>
              </select>
            </label>
            <label className="text-sm">
              {props.copy.labels.cities}
              <input
                className="mt-1 w-full rounded border bg-white/80 px-3 py-2"
                value={edit.locationText}
                onChange={(event) =>
                  setEdit((current) => ({ ...current, locationText: event.target.value }))
                }
              />
            </label>
            <label className="text-sm md:col-span-2">
              {props.copy.labels.propertyTypes}
              <input
                className="mt-1 w-full rounded border bg-white/80 px-3 py-2"
                value={edit.propertyTypes}
                onChange={(event) =>
                  setEdit((current) => ({ ...current, propertyTypes: event.target.value }))
                }
              />
            </label>
            <label className="text-sm">
              {props.copy.labels.budget} min
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
              {props.copy.labels.budget} max
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
              {props.copy.labels.rooms} min
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
              {props.copy.labels.rooms} max
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
              {props.copy.labels.surface} min
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
              {props.copy.labels.surface} max
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
              {props.copy.labels.floor} min
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
              {props.copy.labels.floor} max
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
              {props.copy.labels.terrace}
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
                <option value="any">{props.copy.labels.any}</option>
                <option value="yes">{props.copy.labels.yes}</option>
                <option value="no">{props.copy.labels.no}</option>
              </select>
            </label>
            <label className="text-sm">
              {props.copy.labels.elevator}
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
                <option value="any">{props.copy.labels.any}</option>
                <option value="yes">{props.copy.labels.yes}</option>
                <option value="no">{props.copy.labels.no}</option>
              </select>
            </label>
            <div className="md:col-span-2 flex flex-wrap gap-3">
              <button
                type="submit"
                className="sillage-btn rounded px-5 py-2 text-sm"
                disabled={isPending}
              >
                {props.copy.save}
              </button>
              <button
                type="button"
                className="sillage-btn-secondary rounded px-5 py-2 text-sm"
                disabled={isPending}
                onClick={() => setIsEditing(false)}
              >
                {props.copy.cancel}
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-[#141446]">{props.copy.sectionZone}</h2>
          {!props.archived ? (
            <div className="flex gap-2">
              {isEditingZone ? (
                <>
                  <button
                    type="button"
                    className="sillage-btn rounded px-3 py-1.5 text-sm"
                    onClick={() => void saveZone()}
                    disabled={isPending}
                  >
                    {props.copy.save}
                  </button>
                  <button
                    type="button"
                    className="sillage-btn-secondary rounded px-3 py-1.5 text-sm"
                    onClick={cancelZoneEdit}
                    disabled={isPending}
                  >
                    {props.copy.cancel}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="sillage-btn-secondary rounded px-3 py-1.5 text-sm"
                  onClick={() => setIsEditingZone(true)}
                  disabled={isPending}
                >
                  {props.copy.edit}
                </button>
              )}
            </div>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-[#141446]/70">{props.copy.sectionZoneHint}</p>
        {isEditingZone ? (
          <div className="mt-4">
            <BuyerSearchZoneMap
              locale={props.locale}
              value={zone}
              onChange={(polygon) => setZone(polygon)}
            />
          </div>
        ) : zone && zone.length >= 3 ? (
          <div className="mt-4">
            <BuyerSearchZoneMap
              key={`readonly-${zone.length}-${zone[0]?.[0] ?? 0}`}
              locale={props.locale}
              value={zone}
              onChange={() => {}}
            />
          </div>
        ) : (
          <p className="mt-4 text-sm text-[#141446]/70">{props.copy.zoneNotSet}</p>
        )}
      </section>

      <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
        <h2 className="text-xl font-semibold text-[#141446]">{props.copy.sectionMatches}</h2>
        {matchListItems.length === 0 ? (
          <p className="mt-3 text-sm text-[#141446]/70">{props.copy.noMatches}</p>
        ) : (
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {matchListItems.map((match) => (
              <li
                key={match.id}
                className="relative rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-5"
              >
                {match.isNew ? (
                  <span className="absolute right-4 top-4 rounded-full bg-[#141446] px-3 py-1 text-xs font-semibold text-[#f4ece4]">
                    {props.copy.newBadge}
                  </span>
                ) : null}
                <p className="text-sm font-semibold text-[#141446]">
                  {match.title ?? match.propertyType ?? match.propertyId}
                </p>
                <p className="mt-1 text-sm text-[#141446]/75">
                  {[match.city, match.propertyType].filter(Boolean).join(" · ")}
                </p>
                {match.priceAmount !== null ? (
                  <p className="mt-1 text-sm text-[#141446]/80">
                    {match.priceAmount.toLocaleString(
                      props.locale === "en"
                        ? "en-US"
                        : props.locale === "es"
                          ? "es-ES"
                          : props.locale === "ru"
                            ? "ru-RU"
                            : "fr-FR"
                    )}{" "}
                    €
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-[#141446]/60">
                  {props.copy.scoreLabel} · {match.score}
                </p>
                <Link
                  href={match.canonicalPath}
                  className="mt-3 inline-block sillage-btn-secondary rounded px-3 py-1.5 text-sm"
                >
                  {props.copy.openListing}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!props.archived ? (
        <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
          <h2 className="text-xl font-semibold text-[#141446]">{props.copy.sectionActions}</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              className="sillage-btn-secondary rounded px-4 py-2 text-sm"
              onClick={() => void pauseOrResume()}
              disabled={isPending}
            >
              {props.status === "paused" ? props.copy.resume : props.copy.pause}
            </button>
            <button
              type="button"
              className="sillage-btn-secondary rounded px-4 py-2 text-sm"
              onClick={() => void archive()}
              disabled={isPending}
            >
              {props.copy.archive}
            </button>
          </div>
          {actionError ? (
            <p className="mt-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
              {actionError}
            </p>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
