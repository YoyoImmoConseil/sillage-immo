"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  BuyerLeadAutocompleteRow,
  SellerProjectMilestones,
} from "@/services/clients/seller-project.service";

// Inline form to back-fill the 4 manual milestones of a seller_project:
//   - Mandat signé          (date)
//   - Offre reçue           (date + offrant lié à un buyer_lead ou nom libre)
//   - Compromis signé       (date)
//   - Acte signé            (date)
//
// Each line is a checkbox + a native <input type="date"> (which uses
// the browser's native calendar picker — no extra dependency).
// Unchecking a milestone clears its date.

type LineKey = "mandate" | "offer" | "preliminary" | "deed";

const LINES: Array<{
  key: LineKey;
  label: string;
  dateField:
    | "mandateSignedAt"
    | "offerReceivedAt"
    | "preliminarySaleSignedAt"
    | "deedSignedAt";
}> = [
  { key: "mandate", label: "Mandat Signé", dateField: "mandateSignedAt" },
  { key: "offer", label: "Offre Reçue", dateField: "offerReceivedAt" },
  { key: "preliminary", label: "Compromis Signé", dateField: "preliminarySaleSignedAt" },
  { key: "deed", label: "Acte Signé", dateField: "deedSignedAt" },
];

const toDateInput = (iso: string | null) => {
  if (!iso) return "";
  return iso.slice(0, 10);
};

const formatHumanDate = (iso: string | null) => {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

export function MilestonesForm({
  sellerProjectId,
  initialMilestones,
}: {
  sellerProjectId: string;
  initialMilestones: SellerProjectMilestones;
}) {
  const router = useRouter();
  const [milestones, setMilestones] = useState(initialMilestones);
  const [busyKey, setBusyKey] = useState<LineKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const dateValueByKey = useMemo(() => {
    return {
      mandate: toDateInput(milestones.mandateSignedAt),
      offer: toDateInput(milestones.offerReceivedAt),
      preliminary: toDateInput(milestones.preliminarySaleSignedAt),
      deed: toDateInput(milestones.deedSignedAt),
    };
  }, [milestones]);

  const persist = async (
    key: LineKey,
    body: Record<string, unknown>
  ) => {
    setBusyKey(key);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/seller-projects/${sellerProjectId}/milestones`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const json = (await res.json()) as {
        ok: boolean;
        milestones?: SellerProjectMilestones;
        message?: string;
      };
      if (!res.ok || !json.ok || !json.milestones) {
        setError(json.message ?? "Échec de la mise à jour.");
        return;
      }
      setMilestones(json.milestones);
      setSavedAt(new Date().toLocaleTimeString("fr-FR"));
      router.refresh();
    } catch {
      setError("Impossible de joindre l'API.");
    } finally {
      setBusyKey(null);
    }
  };

  const onCheckboxChange = async (key: LineKey, checked: boolean) => {
    const field = LINES.find((l) => l.key === key)!.dateField;
    if (checked) {
      const today = new Date().toISOString().slice(0, 10);
      await persist(key, { [field]: today });
    } else {
      const body: Record<string, unknown> = { [field]: null };
      if (key === "offer") {
        body.offerBuyerLeadId = null;
        body.offerBuyerName = null;
      }
      await persist(key, body);
    }
  };

  const onDateChange = async (key: LineKey, value: string) => {
    const field = LINES.find((l) => l.key === key)!.dateField;
    await persist(key, { [field]: value || null });
  };

  return (
    <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#141446]">
            Étapes du projet
          </h2>
          <p className="text-sm text-[#141446]/60">
            Saisie manuelle pour rattraper l&apos;historique. Les dates renseignées
            ici remontent automatiquement dans le dashboard.
          </p>
        </div>
        {savedAt ? (
          <p className="text-xs text-emerald-700">Enregistré à {savedAt}</p>
        ) : null}
      </div>

      {error ? (
        <div className="mt-3 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          {error}
        </div>
      ) : null}

      <ul className="mt-4 space-y-3">
        {LINES.map((line) => {
          const checked = dateValueByKey[line.key].length > 0;
          const isBusy = busyKey === line.key;
          return (
            <li
              key={line.key}
              className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-3"
            >
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm font-medium text-[#141446]">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={isBusy}
                    onChange={(e) => onCheckboxChange(line.key, e.target.checked)}
                    className="h-4 w-4 accent-[#141446]"
                  />
                  {line.label}
                </label>
                <input
                  type="date"
                  value={dateValueByKey[line.key]}
                  disabled={!checked || isBusy}
                  onChange={(e) => onDateChange(line.key, e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                  className="rounded-md border border-[rgba(20,20,70,0.2)] bg-white px-2 py-1 text-sm disabled:bg-[#f7f5f0]"
                />
                {checked ? (
                  <span className="text-xs text-[#141446]/60">
                    {formatHumanDate(
                      line.key === "mandate"
                        ? milestones.mandateSignedAt
                        : line.key === "offer"
                          ? milestones.offerReceivedAt
                          : line.key === "preliminary"
                            ? milestones.preliminarySaleSignedAt
                            : milestones.deedSignedAt
                    )}
                  </span>
                ) : null}
                {isBusy ? (
                  <span className="text-xs text-[#141446]/60">Enregistrement…</span>
                ) : null}
              </div>
              {line.key === "offer" && checked ? (
                <div className="mt-3 border-t border-[rgba(20,20,70,0.1)] pt-3">
                  <OffererPicker
                    sellerProjectId={sellerProjectId}
                    milestones={milestones}
                    onPersist={(body) => persist("offer", body)}
                    busy={isBusy}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function OffererPicker({
  milestones,
  onPersist,
  busy,
}: {
  sellerProjectId: string;
  milestones: SellerProjectMilestones;
  onPersist: (body: Record<string, unknown>) => Promise<void>;
  busy: boolean;
}) {
  const [query, setQuery] = useState(
    milestones.offerBuyerLead?.fullName ??
      milestones.offerBuyerLead?.email ??
      milestones.offerBuyerName ??
      ""
  );
  const [results, setResults] = useState<BuyerLeadAutocompleteRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!showResults) return;
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setSearching(true);
      try {
        const res = await fetch(
          `/api/admin/buyer-leads/search?q=${encodeURIComponent(query.trim())}`,
          { signal: ctrl.signal }
        );
        const json = (await res.json()) as {
          ok: boolean;
          items?: BuyerLeadAutocompleteRow[];
        };
        if (json.ok && json.items) setResults(json.items);
      } catch {
        // ignore aborts
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, showResults]);

  const selectedLead = milestones.offerBuyerLead;

  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-wide text-[#141446]/70">
        Offrant (lié à un acquéreur)
      </p>
      {selectedLead ? (
        <div className="flex items-center justify-between rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          <span>
            <strong>{selectedLead.fullName ?? selectedLead.email}</strong>
            {selectedLead.fullName ? (
              <span className="ml-1 text-emerald-800/80">({selectedLead.email})</span>
            ) : null}
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              onPersist({ offerBuyerLeadId: null, offerBuyerName: null })
            }
            className="text-xs underline"
          >
            Retirer
          </button>
        </div>
      ) : null}
      {!selectedLead ? (
        <div className="space-y-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher par nom ou email…"
              value={query}
              disabled={busy}
              onFocus={() => setShowResults(true)}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowResults(true);
              }}
              className="w-full rounded-md border border-[rgba(20,20,70,0.2)] bg-white px-3 py-2 text-sm"
            />
            {showResults && results.length > 0 ? (
              <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-[rgba(20,20,70,0.2)] bg-white shadow-lg">
                {results.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        setShowResults(false);
                        setQuery("");
                        await onPersist({
                          offerBuyerLeadId: row.id,
                          offerBuyerName: null,
                        });
                      }}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-[#f4ece4]"
                    >
                      <span className="font-medium text-[#141446]">
                        {row.fullName ?? row.email}
                      </span>
                      {row.fullName ? (
                        <span className="ml-2 text-[#141446]/60">{row.email}</span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {showResults && searching ? (
              <p className="absolute right-2 top-2 text-xs text-[#141446]/60">
                Recherche…
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy || query.trim().length < 2}
              onClick={async () => {
                setShowResults(false);
                await onPersist({
                  offerBuyerLeadId: null,
                  offerBuyerName: query.trim(),
                });
              }}
              className="rounded-md border border-[#141446]/30 px-3 py-1 text-xs text-[#141446] disabled:opacity-60"
            >
              Enregistrer comme nom libre
            </button>
            {milestones.offerBuyerName ? (
              <span className="text-xs text-[#141446]/70">
                Nom actuel : <strong>{milestones.offerBuyerName}</strong>
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
