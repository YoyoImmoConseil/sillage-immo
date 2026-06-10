"use client";

import type { DashboardCopy } from "./buyer-search-helpers";

type BuyerSearchActionsSectionProps = {
  copy: DashboardCopy;
  status: string;
  isPending: boolean;
  actionError: string | null;
  pauseOrResume: () => Promise<void>;
  archive: () => Promise<void>;
};

export function BuyerSearchActionsSection({
  copy,
  status,
  isPending,
  actionError,
  pauseOrResume,
  archive,
}: BuyerSearchActionsSectionProps) {
  return (
    <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-sand p-8">
      <h2 className="text-xl font-semibold text-navy">{copy.sectionActions}</h2>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          className="sillage-btn-secondary rounded px-4 py-2 text-sm"
          onClick={() => void pauseOrResume()}
          disabled={isPending}
        >
          {status === "paused" ? copy.resume : copy.pause}
        </button>
        <button
          type="button"
          className="sillage-btn-secondary rounded px-4 py-2 text-sm"
          onClick={() => void archive()}
          disabled={isPending}
        >
          {copy.archive}
        </button>
      </div>
      {actionError ? (
        <p className="mt-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {actionError}
        </p>
      ) : null}
    </section>
  );
}
