"use client";

import { useMemo, useState, useTransition } from "react";
import {
  VITRINE_HIGHLIGHT_MAX_LENGTH,
  VITRINE_HIGHLIGHTS_MAX,
  VITRINE_HIGHLIGHTS_MIN,
  VITRINE_QUARTIER_MAX_LENGTH,
  validateVitrineHighlights,
} from "@/lib/properties/vitrine-editorial";

type VitrineMediaOption = { remoteMediaId: string; ordinal: number; url: string | null };

type PropertyVitrinePanelProps = {
  propertyId: string;
  canEdit: boolean;
  initialHighlights: string[];
  initialQuartier: string | null;
  suggestedQuartier: string | null;
  media: VitrineMediaOption[];
  initialMainMediaRef: string | null;
  initialCardMediaRef: string | null;
  initialUpdatedAt: string | null;
  initialUpdatedBy: string | null;
};

type ApiResponse = {
  ok: boolean;
  message?: string;
  errors?: string[];
  highlights?: string[];
  quartier?: string | null;
  mainMediaRef?: string | null;
  cardMediaRef?: string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
};

const charCount = (value: string) => Array.from(value).length;

const padLines = (lines: string[]) => {
  const next = lines.slice(0, VITRINE_HIGHLIGHTS_MAX);
  while (next.length < VITRINE_HIGHLIGHTS_MIN) next.push("");
  return next;
};

const formatStamp = (iso: string | null, by: string | null) => {
  if (!iso) return null;
  const date = new Date(iso);
  const stamp = Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
  return by ? `${stamp} · ${by}` : stamp;
};

export function PropertyVitrinePanel({
  propertyId,
  canEdit,
  initialHighlights,
  initialQuartier,
  suggestedQuartier,
  media,
  initialMainMediaRef,
  initialCardMediaRef,
  initialUpdatedAt,
  initialUpdatedBy,
}: PropertyVitrinePanelProps) {
  const [lines, setLines] = useState<string[]>(() => padLines(initialHighlights));
  const [quartier, setQuartier] = useState<string>(initialQuartier ?? suggestedQuartier ?? "");
  // Photos : la valeur vide = défaut (1re photo en grand, 2e dans la carte).
  const defaultMainRef = media[0]?.remoteMediaId ?? "";
  const defaultCardRef = media[1]?.remoteMediaId ?? media[0]?.remoteMediaId ?? "";
  const [mainMediaRef, setMainMediaRef] = useState<string>(initialMainMediaRef ?? "");
  const [cardMediaRef, setCardMediaRef] = useState<string>(initialCardMediaRef ?? "");
  const [saved, setSaved] = useState({
    highlights: initialHighlights,
    quartier: initialQuartier ?? "",
    mainMediaRef: initialMainMediaRef ?? "",
    cardMediaRef: initialCardMediaRef ?? "",
    updatedAt: initialUpdatedAt,
    updatedBy: initialUpdatedBy,
  });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, startSave] = useTransition();
  const [isSuggesting, startSuggest] = useTransition();
  const [isChecking, startCheck] = useTransition();
  const [diagnostics, setDiagnostics] = useState<{ errors: string[]; warnings: string[] } | null>(null);

  const filledLines = useMemo(() => lines.map((line) => line.trim()).filter(Boolean), [lines]);
  const validation = useMemo(
    () => validateVitrineHighlights(filledLines, { allowEmpty: true }),
    [filledLines]
  );
  const isDirty =
    filledLines.join("\n") !== saved.highlights.join("\n") ||
    quartier.trim() !== saved.quartier ||
    mainMediaRef !== saved.mainMediaRef ||
    cardMediaRef !== saved.cardMediaRef;
  const canSave = canEdit && isDirty && validation.errors.length === 0 && !isSaving;

  const setLine = (index: number, value: string) => {
    setLines((current) => current.map((line, i) => (i === index ? value : line)));
  };
  const move = (index: number, direction: -1 | 1) => {
    setLines((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };
  const removeLine = (index: number) => {
    setLines((current) => padLines(current.filter((_, i) => i !== index)));
  };
  const addLine = () => {
    setLines((current) =>
      current.length < VITRINE_HIGHLIGHTS_MAX ? [...current, ""] : current
    );
  };

  const save = () => {
    setError(null);
    setMessage(null);
    startSave(async () => {
      try {
        const response = await fetch(`/api/admin/properties/${propertyId}/vitrine`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            highlights: filledLines,
            quartier,
            mainMediaRef: mainMediaRef || null,
            cardMediaRef: cardMediaRef || null,
          }),
        });
        const payload = (await response.json()) as ApiResponse;
        if (!response.ok || !payload.ok) {
          setError(payload.errors?.join(" ") ?? payload.message ?? "Enregistrement impossible.");
          return;
        }
        const highlights = payload.highlights ?? filledLines;
        setLines(padLines(highlights));
        setQuartier(payload.quartier ?? "");
        setMainMediaRef(payload.mainMediaRef ?? "");
        setCardMediaRef(payload.cardMediaRef ?? "");
        setSaved({
          highlights,
          quartier: payload.quartier ?? "",
          mainMediaRef: payload.mainMediaRef ?? "",
          cardMediaRef: payload.cardMediaRef ?? "",
          updatedAt: payload.updatedAt ?? null,
          updatedBy: payload.updatedBy ?? null,
        });
        setMessage("Fiche vitrine enregistrée.");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Enregistrement impossible.");
      }
    });
  };

  const suggest = () => {
    setError(null);
    setMessage(null);
    startSuggest(async () => {
      try {
        const response = await fetch(`/api/admin/properties/${propertyId}/vitrine/suggest`, {
          method: "POST",
        });
        const payload = (await response.json()) as ApiResponse;
        if (!response.ok || !payload.ok || !payload.highlights) {
          setError(payload.message ?? "Suggestion impossible.");
          return;
        }
        if (payload.highlights.length === 0) {
          setError("Le modèle n'a rien proposé d'exploitable pour ce bien.");
          return;
        }
        setLines(padLines(payload.highlights));
        setMessage(
          `${payload.highlights.length} point${payload.highlights.length > 1 ? "s" : ""} fort${payload.highlights.length > 1 ? "s" : ""} proposé${payload.highlights.length > 1 ? "s" : ""} — relisez, ajustez, puis enregistrez.`
        );
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Suggestion impossible.");
      }
    });
  };

  const previewUrl = `/api/admin/properties/${propertyId}/vitrine/preview`;
  const check = () => {
    setError(null);
    setMessage(null);
    setDiagnostics(null);
    startCheck(async () => {
      try {
        const response = await fetch(`${previewUrl}?diag=1`, { cache: "no-store" });
        const payload = (await response.json()) as ApiResponse & { errors?: string[]; warnings?: string[] };
        if (!response.ok && !payload.errors) {
          setError(payload.message ?? "Vérification impossible.");
          return;
        }
        setDiagnostics({ errors: payload.errors ?? [], warnings: payload.warnings ?? [] });
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Vérification impossible.");
      }
    });
  };

  const stamp = formatStamp(saved.updatedAt, saved.updatedBy);

  return (
    <section className="space-y-4 rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-navy">Fiche vitrine</h2>
          <p className="text-sm text-navy/70">
            Points forts et quartier imprimés sur l&apos;affiche A3. {VITRINE_HIGHLIGHTS_MIN} à{" "}
            {VITRINE_HIGHLIGHTS_MAX} lignes de {VITRINE_HIGHLIGHT_MAX_LENGTH} caractères maximum.
            Jamais écrasé par SweepBright.
          </p>
        </div>
        {canEdit ? (
          <button
            type="button"
            onClick={suggest}
            disabled={isSuggesting || isSaving}
            className="rounded-full border border-navy/30 px-4 py-2 text-sm font-medium text-navy transition hover:bg-navy/5 disabled:opacity-50"
          >
            {isSuggesting ? "Suggestion en cours…" : "Suggérer des points forts"}
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,280px)]">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-navy/60">Points forts</p>
          <ol className="space-y-2">
            {lines.map((line, index) => {
              const count = charCount(line);
              const tooLong = count > VITRINE_HIGHLIGHT_MAX_LENGTH;
              return (
                <li key={index} className="flex items-center gap-2">
                  <span className="w-5 shrink-0 text-right text-sm text-navy/50">{index + 1}.</span>
                  <input
                    className={`w-full rounded border px-3 py-2 text-sm ${
                      tooLong ? "border-red-500 bg-red-50" : ""
                    }`}
                    value={line}
                    maxLength={VITRINE_HIGHLIGHT_MAX_LENGTH + 12}
                    placeholder="Ex. Vue mer panoramique"
                    onChange={(event) => setLine(index, event.target.value)}
                    disabled={!canEdit || isSaving}
                  />
                  <span
                    className={`w-12 shrink-0 text-right text-xs tabular-nums ${
                      tooLong ? "font-semibold text-red-600" : "text-navy/50"
                    }`}
                  >
                    {count}/{VITRINE_HIGHLIGHT_MAX_LENGTH}
                  </span>
                  {canEdit ? (
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        aria-label="Monter"
                        title="Monter"
                        onClick={() => move(index, -1)}
                        disabled={index === 0 || isSaving}
                        className="rounded border px-2 py-1 text-xs text-navy disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label="Descendre"
                        title="Descendre"
                        onClick={() => move(index, 1)}
                        disabled={index === lines.length - 1 || isSaving}
                        className="rounded border px-2 py-1 text-xs text-navy disabled:opacity-30"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        aria-label="Supprimer la ligne"
                        title="Supprimer la ligne"
                        onClick={() => removeLine(index)}
                        disabled={isSaving}
                        className="rounded border px-2 py-1 text-xs text-navy/70 disabled:opacity-30"
                      >
                        ×
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
          {canEdit && lines.length < VITRINE_HIGHLIGHTS_MAX ? (
            <button
              type="button"
              onClick={addLine}
              disabled={isSaving}
              className="text-sm text-navy underline disabled:opacity-50"
            >
              + Ajouter une ligne ({lines.length}/{VITRINE_HIGHLIGHTS_MAX})
            </button>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="block text-sm">
            <span className="text-xs font-medium uppercase tracking-wide text-navy/60">
              Quartier (bandeau de l&apos;affiche)
            </span>
            <input
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              value={quartier}
              maxLength={VITRINE_QUARTIER_MAX_LENGTH}
              placeholder="Ex. Église Russe"
              onChange={(event) => setQuartier(event.target.value)}
              disabled={!canEdit || isSaving}
            />
            <span className="mt-1 block text-xs text-navy/50">
              {charCount(quartier)}/{VITRINE_QUARTIER_MAX_LENGTH}
              {!initialQuartier && suggestedQuartier && quartier === suggestedQuartier
                ? " · pré-rempli depuis le titre, à confirmer"
                : ""}
            </span>
          </label>
        </div>
      </div>

      {media.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-navy/60">Photos de l&apos;affiche</p>
          <p className="text-sm text-navy/70">
            Par défaut : 1<sup>re</sup> photo en grand, 2<sup>e</sup> dans la carte. Cliquez sur « G » pour la grande photo, sur « C »
            pour la photo de la carte.
          </p>
          <ul className="flex flex-wrap gap-3">
            {media.map((item) => {
              const isMain = (mainMediaRef || defaultMainRef) === item.remoteMediaId;
              const isCard = (cardMediaRef || defaultCardRef) === item.remoteMediaId;
              return (
                <li key={item.remoteMediaId} className="w-[140px] space-y-1">
                  <div
                    className={`relative aspect-[4/3] overflow-hidden rounded-xl border-2 bg-navy/5 ${
                      isMain || isCard ? "border-navy" : "border-transparent"
                    }`}
                  >
                    {item.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.url} alt={`Photo ${item.ordinal}`} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-navy/50">Photo {item.ordinal}</div>
                    )}
                    <span className="absolute left-1 top-1 rounded bg-white/90 px-1.5 text-[11px] font-medium text-navy">
                      {item.ordinal}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setMainMediaRef(item.remoteMediaId === defaultMainRef ? "" : item.remoteMediaId)}
                      disabled={!canEdit || isSaving}
                      title="Grande photo"
                      className={`flex-1 rounded border px-2 py-1 text-xs font-medium ${
                        isMain ? "bg-navy text-sand" : "text-navy"
                      } disabled:opacity-50`}
                    >
                      G{isMain ? " ✓" : ""}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCardMediaRef(item.remoteMediaId === defaultCardRef ? "" : item.remoteMediaId)}
                      disabled={!canEdit || isSaving}
                      title="Photo de la carte"
                      className={`flex-1 rounded border px-2 py-1 text-xs font-medium ${
                        isCard ? "bg-navy text-sand" : "text-navy"
                      } disabled:opacity-50`}
                    >
                      C{isCard ? " ✓" : ""}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {validation.errors.length > 0 ? (
        <ul className="space-y-1 text-sm text-red-600">
          {validation.errors.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

      {canEdit ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            className="rounded-full bg-navy px-5 py-2 text-sm font-medium text-sand transition disabled:opacity-50"
          >
            {isSaving ? "Enregistrement…" : "Enregistrer la fiche vitrine"}
          </button>
          {stamp ? <span className="text-xs text-navy/60">Dernière modification : {stamp}</span> : null}
        </div>
      ) : stamp ? (
        <p className="text-xs text-navy/60">Dernière modification : {stamp}</p>
      ) : null}

      <div className="space-y-3 border-t border-[rgba(20,20,70,0.12)] pt-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={check}
            disabled={isChecking || isDirty}
            title={isDirty ? "Enregistrez d'abord vos modifications." : undefined}
            className="rounded-full border border-navy/30 px-4 py-2 text-sm font-medium text-navy transition hover:bg-navy/5 disabled:opacity-50"
          >
            {isChecking ? "Vérification…" : "Vérifier les données de l'affiche"}
          </button>
          {diagnostics ? (
            <a
              href={diagnostics.errors.length > 0 ? `${previewUrl}?force=1` : previewUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-navy px-4 py-2 text-sm font-medium text-sand"
            >
              {diagnostics.errors.length > 0 ? "Ouvrir l'aperçu PDF (filigrané)" : "Ouvrir l'aperçu PDF"}
            </a>
          ) : null}
          {isDirty ? <span className="text-xs text-navy/60">Enregistrez avant de vérifier.</span> : null}
        </div>
        {diagnostics ? (
          <div className="space-y-2 text-sm">
            {diagnostics.errors.length === 0 && diagnostics.warnings.length === 0 ? (
              <p className="text-emerald-700">Toutes les données nécessaires à l&apos;affiche sont présentes.</p>
            ) : null}
            {diagnostics.errors.length > 0 ? (
              <div>
                <p className="font-medium text-red-700">Bloquant — à corriger dans SweepBright ou ci-dessus :</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-red-700">
                  {diagnostics.errors.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {diagnostics.warnings.length > 0 ? (
              <div>
                <p className="font-medium text-amber-700">À vérifier :</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-amber-700">
                  {diagnostics.warnings.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
