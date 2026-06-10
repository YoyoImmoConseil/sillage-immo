"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AppLocale } from "@/lib/i18n/config";
import type { BuyerSearchProfileSnapshot } from "@/types/domain/buyers";
import type { BuyerSearchMatchListItem } from "@/services/buyers/buyer-portal.service";
import type { ZonePolygon } from "@/app/components/buyer-search-zone-map";
import {
  extractZonePolygon,
  parseNullable,
  toInput,
  type CriteriaRow,
  type DashboardCopy,
  type EditState,
} from "./buyer-search-helpers";
import { BuyerSearchSummarySection } from "./buyer-search-summary-section";
import { BuyerSearchZoneSection } from "./buyer-search-zone-section";
import { BuyerSearchMatchesSection } from "./buyer-search-matches-section";
import { BuyerSearchActionsSection } from "./buyer-search-actions-section";

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
      <BuyerSearchSummarySection
        copy={props.copy}
        archived={props.archived}
        criteriaSummary={props.criteriaSummary}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        isPending={isPending}
        edit={edit}
        setEdit={setEdit}
        submitPatch={submitPatch}
      />

      <BuyerSearchZoneSection
        copy={props.copy}
        locale={props.locale}
        archived={props.archived}
        zone={zone}
        setZone={setZone}
        isEditingZone={isEditingZone}
        setIsEditingZone={setIsEditingZone}
        isPending={isPending}
        saveZone={saveZone}
        cancelZoneEdit={cancelZoneEdit}
      />

      <BuyerSearchMatchesSection
        copy={props.copy}
        locale={props.locale}
        matchListItems={matchListItems}
      />

      {!props.archived ? (
        <BuyerSearchActionsSection
          copy={props.copy}
          status={props.status}
          isPending={isPending}
          actionError={actionError}
          pauseOrResume={pauseOrResume}
          archive={archive}
        />
      ) : null}
    </>
  );
}
