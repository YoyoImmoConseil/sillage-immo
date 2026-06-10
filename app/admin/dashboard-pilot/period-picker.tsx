"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

// Period picker for the admin dashboard.
//
// Writes the selected range to `?since=YYYY-MM-DD&until=YYYY-MM-DD&preset=…`
// and lets the server component re-render via Next.js navigation. The
// component is intentionally URL-driven (no client state for the
// active values) so the chosen range can be shared via a link and
// survives full page reloads.

type Preset = "7d" | "30d" | "90d" | "1y" | "all" | "custom";

const PRESETS: { id: Preset; label: string; days: number | null }[] = [
  { id: "7d", label: "7 derniers jours", days: 7 },
  { id: "30d", label: "30 derniers jours", days: 30 },
  { id: "90d", label: "90 derniers jours", days: 90 },
  { id: "1y", label: "12 derniers mois", days: 365 },
  { id: "all", label: "Tout l’historique", days: null },
];

const DAY_MS = 24 * 60 * 60 * 1000;

const formatIsoDate = (d: Date): string => d.toISOString().slice(0, 10);

const presetToRange = (preset: Preset): { since: string | null; until: string } => {
  const now = new Date();
  const until = formatIsoDate(now);
  if (preset === "all") return { since: null, until };
  const entry = PRESETS.find((p) => p.id === preset);
  if (!entry || entry.days === null) return { since: null, until };
  const sinceMs = now.getTime() - entry.days * DAY_MS;
  return { since: formatIsoDate(new Date(sinceMs)), until };
};

export function DashboardPeriodPicker({
  defaultPreset = "30d",
}: {
  defaultPreset?: Preset;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentPreset = (searchParams.get("preset") as Preset | null) ?? defaultPreset;
  const currentSince = searchParams.get("since");
  const currentUntil = searchParams.get("until");

  // Locally controlled inputs for custom range (synced from URL).
  // Lazy initialisers so React Compiler doesn't flag `Date.now()` as
  // an impure call during render.
  const [customSince, setCustomSince] = useState<string>(
    () => currentSince ?? formatIsoDate(new Date(Date.now() - 30 * DAY_MS))
  );
  const [customUntil, setCustomUntil] = useState<string>(
    () => currentUntil ?? formatIsoDate(new Date())
  );

  useEffect(() => {
    // Defer state updates to escape the React Compiler's synchronous
    // effect heuristic; the user only sees this after a navigation
    // anyway.
    const handle = window.setTimeout(() => {
      if (currentSince) setCustomSince(currentSince);
      if (currentUntil) setCustomUntil(currentUntil);
    }, 0);
    return () => window.clearTimeout(handle);
  }, [currentSince, currentUntil]);

  const activeLabel = useMemo(() => {
    if (currentPreset === "custom") {
      return `${currentSince ?? "?"} → ${currentUntil ?? "aujourd’hui"}`;
    }
    return PRESETS.find((p) => p.id === currentPreset)?.label ?? "30 derniers jours";
  }, [currentPreset, currentSince, currentUntil]);

  const pushPeriod = (
    next: { preset: Preset; since: string | null; until: string | null }
  ) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("preset", next.preset);
    if (next.since) {
      params.set("since", next.since);
    } else {
      params.delete("since");
    }
    if (next.until) {
      params.set("until", next.until);
    } else {
      params.delete("until");
    }
    startTransition(() => {
      router.push(`?${params.toString()}`, { scroll: false });
    });
  };

  const applyPreset = (preset: Preset) => {
    if (preset === "custom") {
      pushPeriod({ preset: "custom", since: customSince, until: customUntil });
      return;
    }
    const range = presetToRange(preset);
    pushPeriod({ preset, since: range.since, until: range.until });
  };

  const applyCustom = () => {
    if (!customSince || !customUntil) return;
    if (customSince > customUntil) return;
    pushPeriod({ preset: "custom", since: customSince, until: customUntil });
  };

  return (
    <div className="rounded-2xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-navy/60">
            Période analysée
          </p>
          <p className="mt-1 text-sm font-semibold text-navy">{activeLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => {
            const isActive = currentPreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                disabled={isPending}
                className={
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition " +
                  (isActive
                    ? "border-navy bg-navy text-white"
                    : "border-[rgba(20,20,70,0.2)] bg-white text-navy hover:border-[rgba(20,20,70,0.5)]")
                }
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-[rgba(20,20,70,0.08)] pt-3">
        <label className="flex flex-col text-xs text-navy/70">
          <span className="mb-1 font-medium">Date de début</span>
          <input
            type="date"
            value={customSince}
            max={customUntil || undefined}
            onChange={(event) => setCustomSince(event.target.value)}
            className="rounded-lg border border-[rgba(20,20,70,0.18)] bg-white px-2 py-1 text-sm text-navy"
          />
        </label>
        <label className="flex flex-col text-xs text-navy/70">
          <span className="mb-1 font-medium">Date de fin</span>
          <input
            type="date"
            value={customUntil}
            min={customSince || undefined}
            onChange={(event) => setCustomUntil(event.target.value)}
            className="rounded-lg border border-[rgba(20,20,70,0.18)] bg-white px-2 py-1 text-sm text-navy"
          />
        </label>
        <button
          type="button"
          onClick={applyCustom}
          disabled={isPending || !customSince || !customUntil || customSince > customUntil}
          className="rounded-full border border-navy bg-white px-4 py-1.5 text-xs font-semibold text-navy transition hover:bg-navy hover:text-white disabled:opacity-50"
        >
          Appliquer la période
        </button>
        {isPending ? (
          <span className="text-xs text-navy/60">Mise à jour…</span>
        ) : null}
      </div>
    </div>
  );
}
