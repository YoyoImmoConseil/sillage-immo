"use client";

import dynamic from "next/dynamic";
import type { AppLocale } from "@/lib/i18n/config";
import type { ZonePolygon } from "@/app/components/buyer-search-zone-map";
import type { DashboardCopy } from "./buyer-search-helpers";

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

type BuyerSearchZoneSectionProps = {
  copy: DashboardCopy;
  locale: AppLocale;
  archived: boolean;
  zone: ZonePolygon | null;
  setZone: React.Dispatch<React.SetStateAction<ZonePolygon | null>>;
  isEditingZone: boolean;
  setIsEditingZone: React.Dispatch<React.SetStateAction<boolean>>;
  isPending: boolean;
  saveZone: () => Promise<void>;
  cancelZoneEdit: () => void;
};

export function BuyerSearchZoneSection({
  copy,
  locale,
  archived,
  zone,
  setZone,
  isEditingZone,
  setIsEditingZone,
  isPending,
  saveZone,
  cancelZoneEdit,
}: BuyerSearchZoneSectionProps) {
  return (
    <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-[#f4ece4] p-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-[#141446]">{copy.sectionZone}</h2>
        {!archived ? (
          <div className="flex gap-2">
            {isEditingZone ? (
              <>
                <button
                  type="button"
                  className="sillage-btn rounded px-3 py-1.5 text-sm"
                  onClick={() => void saveZone()}
                  disabled={isPending}
                >
                  {copy.save}
                </button>
                <button
                  type="button"
                  className="sillage-btn-secondary rounded px-3 py-1.5 text-sm"
                  onClick={cancelZoneEdit}
                  disabled={isPending}
                >
                  {copy.cancel}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="sillage-btn-secondary rounded px-3 py-1.5 text-sm"
                onClick={() => setIsEditingZone(true)}
                disabled={isPending}
              >
                {copy.edit}
              </button>
            )}
          </div>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-[#141446]/70">{copy.sectionZoneHint}</p>
      {isEditingZone ? (
        <div className="mt-4">
          <BuyerSearchZoneMap
            locale={locale}
            value={zone}
            onChange={(polygon) => setZone(polygon)}
          />
        </div>
      ) : zone && zone.length >= 3 ? (
        <div className="mt-4">
          <BuyerSearchZoneMap
            key={`readonly-${zone.length}-${zone[0]?.[0] ?? 0}`}
            locale={locale}
            value={zone}
            onChange={() => {}}
          />
        </div>
      ) : (
        <p className="mt-4 text-sm text-[#141446]/70">{copy.zoneNotSet}</p>
      )}
    </section>
  );
}
