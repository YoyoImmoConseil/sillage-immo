"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SignedDocumentRow } from "@/services/admin/mynotary-list.service";
import type {
  MyNotaryMatchContext,
  MyNotarySellerContact,
} from "@/services/admin/mynotary-match.service";
import type { ReconcileCandidatePreview } from "@/services/reconciliation/reconcile.service";
import type {
  GoldenSource,
  GoldenOverrideField,
  PropertyGoldenRecord,
} from "@/services/properties/golden-record.service";

// ─────────────────────────────────────────────────────────────────────
// Smart rattachement modal (2 steps):
//   1. Choisir le dossier — suggestions classées (moteur réconciliation) +
//      recherche libre + "créer un dossier depuis ce contrat" + repli UUID.
//   2. Résoudre les divergences — champs du golden record qui divergent,
//      arbitrage 1 clic + lien vers la fiche bien unifiée.
// ─────────────────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<GoldenSource, string> = {
  manual: "Manuel",
  sweepbright: "SweepBright",
  mynotary: "MyNotary",
  estimator: "Estimateur",
};

const SOURCE_BADGE: Record<GoldenSource, string> = {
  manual: "bg-violet-100 text-violet-900 border-violet-300",
  sweepbright: "bg-sky-100 text-sky-900 border-sky-300",
  mynotary: "bg-emerald-100 text-emerald-900 border-emerald-300",
  estimator: "bg-amber-100 text-amber-900 border-amber-300",
};

const REASON_LABEL: Record<string, string> = {
  address: "Adresse",
  address_price_surface: "Adresse + prix + surface",
  price_band: "Prix concordant",
  surface_band: "Surface concordante",
  identity_email: "E-mail identique",
  identity_phone: "Téléphone identique",
  name_fuzzy: "Nom proche",
  recherche: "Recherche",
};

type FieldKind = "text" | "price" | "area" | "number";

type FieldDef = {
  field: GoldenOverrideField;
  label: string;
  kind: FieldKind;
  get: (g: PropertyGoldenRecord) => {
    value: unknown;
    source: GoldenSource | null;
    alternatives: Array<{ value: unknown; source: GoldenSource }>;
    hasDivergence: boolean;
  };
};

const FIELDS: FieldDef[] = [
  { field: "address", label: "Adresse", kind: "text", get: (g) => g.address },
  { field: "price", label: "Prix", kind: "price", get: (g) => g.price },
  { field: "livingArea", label: "Surface", kind: "area", get: (g) => g.livingArea },
  { field: "propertyType", label: "Type de bien", kind: "text", get: (g) => g.propertyType },
  { field: "rooms", label: "Pièces", kind: "number", get: (g) => g.rooms },
  { field: "floor", label: "Étage", kind: "number", get: (g) => g.floor },
  { field: "seller.fullName", label: "Vendeur — nom", kind: "text", get: (g) => g.seller.fullName },
  { field: "seller.email", label: "Vendeur — email", kind: "text", get: (g) => g.seller.email },
  { field: "seller.phone", label: "Vendeur — téléphone", kind: "text", get: (g) => g.seller.phone },
];

const formatValue = (value: unknown, kind: FieldKind): string => {
  if (value === null || value === undefined || value === "") return "—";
  if (kind === "price" && typeof value === "number") return `${value.toLocaleString("fr-FR")} €`;
  if (kind === "area" && typeof value === "number") return `${value} m²`;
  return String(value);
};

const sellerLine = (c: MyNotarySellerContact): string => {
  const name =
    c.fullName?.trim() ||
    `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() ||
    "Vendeur";
  const contact = [c.email, c.phone].filter(Boolean).join(" · ");
  return contact ? `${name} (${contact})` : name;
};

export function ManualMatchModal({
  document,
  onClose,
  onMatched,
}: {
  document: SignedDocumentRow;
  onClose: () => void;
  onMatched: () => void;
}) {
  const [step, setStep] = useState<"choose" | "diverge">("choose");
  const [ctx, setCtx] = useState<MyNotaryMatchContext | null>(null);
  const [loadingCtx, setLoadingCtx] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search
  const [term, setTerm] = useState("");
  const [searchResults, setSearchResults] = useState<ReconcileCandidatePreview[]>([]);
  const [searching, setSearching] = useState(false);

  // Advanced UUID fallback
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [manualSeller, setManualSeller] = useState(document.matched_seller_project_id ?? "");
  const [manualProperty, setManualProperty] = useState(document.matched_property_id ?? "");

  // Step 2 (divergences)
  const [golden, setGolden] = useState<PropertyGoldenRecord | null>(null);
  const [linkedSellerProjectId, setLinkedSellerProjectId] = useState<string | null>(null);
  const [link, setLink] = useState<{ clientProfileId: string | null; clientProjectId: string | null }>({
    clientProfileId: null,
    clientProjectId: null,
  });
  const [busyField, setBusyField] = useState<GoldenOverrideField | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/admin/mynotary/${document.id}/match-context`);
        const json = (await res.json()) as { ok: boolean; contract?: MyNotaryMatchContext["contract"]; candidates?: ReconcileCandidatePreview[]; message?: string };
        if (!active) return;
        if (!json.ok || !json.contract) {
          setError(json.message ?? "Impossible de charger le contexte.");
        } else {
          setCtx({ contract: json.contract, candidates: json.candidates ?? [] });
        }
      } catch {
        if (active) setError("Impossible de joindre l'API.");
      } finally {
        if (active) setLoadingCtx(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [document.id]);

  // Debounced dossier search.
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (term.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/admin/mynotary/dossier-search?q=${encodeURIComponent(term.trim())}`);
        const json = (await res.json()) as { ok: boolean; results?: ReconcileCandidatePreview[] };
        setSearchResults(json.ok ? json.results ?? [] : []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [term]);

  const goToDivergences = useCallback(
    (
      g: PropertyGoldenRecord | null,
      sellerProjectId: string | null,
      clientProfileId: string | null,
      clientProjectId: string | null
    ) => {
      setGolden(g);
      setLinkedSellerProjectId(sellerProjectId);
      setLink({ clientProfileId, clientProjectId: clientProjectId ?? g?.clientProjectId ?? null });
      setStep("diverge");
    },
    []
  );

  const attach = useCallback(
    async (sellerProjectId: string | null, propertyId: string | null) => {
      if (!sellerProjectId && !propertyId) return;
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/mynotary/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId: document.id, sellerProjectId, propertyId }),
        });
        const json = (await res.json()) as {
          ok: boolean;
          message?: string;
          golden?: PropertyGoldenRecord | null;
          sellerProjectId?: string | null;
          clientProfileId?: string | null;
          clientProjectId?: string | null;
        };
        if (!json.ok) {
          setError(json.message ?? "Échec du rattachement.");
          return;
        }
        goToDivergences(
          json.golden ?? null,
          json.sellerProjectId ?? sellerProjectId,
          json.clientProfileId ?? null,
          json.clientProjectId ?? null
        );
      } catch {
        setError("Erreur réseau.");
      } finally {
        setBusy(false);
      }
    },
    [document.id, goToDivergences]
  );

  const createFromContract = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/mynotary/${document.id}/create-project`, {
        method: "POST",
      });
      const json = (await res.json()) as {
        ok: boolean;
        message?: string;
        golden?: PropertyGoldenRecord | null;
        sellerProjectId?: string | null;
        clientProfileId?: string | null;
        clientProjectId?: string | null;
      };
      if (!json.ok) {
        setError(json.message ?? "Création impossible.");
        return;
      }
      goToDivergences(
        json.golden ?? null,
        json.sellerProjectId ?? null,
        json.clientProfileId ?? null,
        json.clientProjectId ?? null
      );
    } catch {
      setError("Erreur réseau.");
    } finally {
      setBusy(false);
    }
  }, [document.id, goToDivergences]);

  const persistOverride = useCallback(
    async (field: GoldenOverrideField, value: unknown | null) => {
      if (!linkedSellerProjectId || !link.clientProjectId) return;
      setBusyField(field);
      setError(null);
      try {
        const res = await fetch(
          `/api/admin/seller-projects/${linkedSellerProjectId}/golden-override`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ field, value, clientProjectId: link.clientProjectId }),
          }
        );
        const json = (await res.json()) as { ok: boolean; golden?: PropertyGoldenRecord; message?: string };
        if (!res.ok || !json.ok) {
          setError(json.message ?? "Échec de la mise à jour.");
          return;
        }
        if (json.golden) setGolden(json.golden);
      } catch {
        setError("Impossible de joindre l'API.");
      } finally {
        setBusyField(null);
      }
    },
    [linkedSellerProjectId, link.clientProjectId]
  );

  const renderCandidate = (c: ReconcileCandidatePreview) => (
    <div
      key={`${c.clientProjectId}-${c.sellerProjectId ?? "x"}`}
      className="flex items-start justify-between gap-3 rounded-lg border border-[rgba(20,20,70,0.16)] bg-white px-3 py-2"
    >
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-[#141446]">{c.label}</span>
          {c.score > 0 ? (
            <span className="shrink-0 rounded-full bg-[#141446]/8 px-2 py-0.5 text-[10px] font-semibold text-[#141446]/70">
              {Math.round(c.score * 100)}%
            </span>
          ) : null}
        </div>
        {c.address ? (
          <p className="truncate text-xs text-[#141446]/60">{c.address}</p>
        ) : null}
        <div className="flex flex-wrap gap-1">
          {c.reasons.map((r) => (
            <span
              key={r}
              className="rounded-full border border-[rgba(20,20,70,0.15)] bg-[#f4ece4] px-1.5 py-0.5 text-[10px] text-[#141446]/80"
            >
              {REASON_LABEL[r] ?? r}
            </span>
          ))}
        </div>
      </div>
      <button
        type="button"
        disabled={busy || !c.sellerProjectId}
        onClick={() => attach(c.sellerProjectId, c.primaryPropertyId)}
        className="shrink-0 rounded-md bg-[#141446] px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
        title={c.sellerProjectId ? "Rattacher à ce dossier" : "Dossier sans projet vendeur matérialisé"}
      >
        Rattacher
      </button>
    </div>
  );

  const divergentFields = golden
    ? FIELDS.map((def) => ({ def, f: def.get(golden) })).filter((x) => x.f.hasDivergence)
    : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[rgba(20,20,70,0.16)] bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="border-b border-[rgba(20,20,70,0.1)] px-5 py-4">
          <h2 className="text-lg font-semibold text-[#141446]">
            {step === "choose" ? "Rattacher le contrat" : "Vérifier les divergences"}
          </h2>
          <p className="text-xs text-[#141446]/60">
            Contrat MyNotary <code>{document.mynotary_contract_id}</code> · {document.contract_kind}
          </p>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error ? (
            <div className="mb-3 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-900">
              {error}
            </div>
          ) : null}

          {step === "choose" ? (
            <div className="space-y-5 text-sm text-[#141446]">
              {/* Recap contrat */}
              {ctx ? (
                <section className="rounded-lg border border-[rgba(20,20,70,0.12)] bg-[#f4ece4]/40 px-3 py-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#141446]/60">
                    Données du contrat
                  </p>
                  <div className="grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2">
                    <div>
                      <span className="text-[#141446]/50">Adresse : </span>
                      {ctx.contract.address ?? "—"}
                    </div>
                    <div>
                      <span className="text-[#141446]/50">Prix : </span>
                      {ctx.contract.price != null ? `${ctx.contract.price.toLocaleString("fr-FR")} €` : "—"}
                    </div>
                    <div>
                      <span className="text-[#141446]/50">Surface : </span>
                      {ctx.contract.livingArea != null ? `${ctx.contract.livingArea} m²` : "—"}
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-[#141446]/50">Vendeur(s) : </span>
                      {ctx.contract.sellerContacts.length > 0
                        ? ctx.contract.sellerContacts.map(sellerLine).join(", ")
                        : "—"}
                    </div>
                  </div>
                </section>
              ) : loadingCtx ? (
                <p className="text-xs text-[#141446]/60">Chargement du contexte…</p>
              ) : null}

              {/* Suggestions */}
              <section className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#141446]/60">
                  Suggestions
                </p>
                {ctx && ctx.candidates.length > 0 ? (
                  <div className="space-y-2">{ctx.candidates.map(renderCandidate)}</div>
                ) : (
                  <p className="text-xs text-[#141446]/55">
                    Aucune suggestion automatique. Cherchez un dossier ou créez-en un depuis le contrat.
                  </p>
                )}
              </section>

              {/* Recherche */}
              <section className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#141446]/60">
                  Rechercher un dossier
                </p>
                <input
                  type="text"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="Nom, e-mail, téléphone ou adresse…"
                  className="w-full rounded-md border border-[rgba(20,20,70,0.2)] px-3 py-2 text-sm"
                />
                {searching ? (
                  <p className="text-xs text-[#141446]/50">Recherche…</p>
                ) : null}
                {searchResults.length > 0 ? (
                  <div className="space-y-2">{searchResults.map(renderCandidate)}</div>
                ) : term.trim().length >= 2 && !searching ? (
                  <p className="text-xs text-[#141446]/50">Aucun dossier trouvé.</p>
                ) : null}
              </section>

              {/* Créer un dossier */}
              <section className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#141446]/60">
                  Aucun dossier ne correspond ?
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={createFromContract}
                  className="rounded-md border border-[#141446]/30 px-3 py-1.5 text-sm font-medium text-[#141446] disabled:opacity-60"
                >
                  Créer un dossier depuis ce contrat
                </button>
                <p className="text-[11px] text-[#141446]/50">
                  Crée le dossier vendeur depuis le bien SweepBright correspondant + l&apos;identité MyNotary
                  (nécessite un bien à cette adresse et un e-mail vendeur).
                </p>
              </section>

              {/* Repli UUID avancé */}
              <section>
                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="text-xs underline text-[#141446]/60"
                >
                  {showAdvanced ? "Masquer" : "Avancé : coller les UUID"}
                </button>
                {showAdvanced ? (
                  <div className="mt-2 space-y-2">
                    <input
                      type="text"
                      value={manualSeller}
                      onChange={(e) => setManualSeller(e.target.value.trim())}
                      placeholder="seller_project UUID"
                      className="w-full rounded-md border border-[rgba(20,20,70,0.2)] px-3 py-2 font-mono text-xs"
                    />
                    <input
                      type="text"
                      value={manualProperty}
                      onChange={(e) => setManualProperty(e.target.value.trim())}
                      placeholder="property UUID"
                      className="w-full rounded-md border border-[rgba(20,20,70,0.2)] px-3 py-2 font-mono text-xs"
                    />
                    <button
                      type="button"
                      disabled={busy || (!manualSeller && !manualProperty)}
                      onClick={() => attach(manualSeller || null, manualProperty || null)}
                      className="rounded-md bg-[#141446] px-3 py-1 text-xs font-medium text-white disabled:opacity-60"
                    >
                      Rattacher (manuel)
                    </button>
                  </div>
                ) : null}
              </section>
            </div>
          ) : (
            // ── Step 2 : divergences ──
            <div className="space-y-4 text-sm text-[#141446]">
              <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                Contrat rattaché. {divergentFields.length > 0
                  ? "Quelques données divergent entre les sources — choisissez la bonne valeur."
                  : "Aucune divergence détectée, tout concorde."}
              </div>

              {golden && divergentFields.length > 0 ? (
                <dl className="divide-y divide-[rgba(20,20,70,0.08)]">
                  {divergentFields.map(({ def, f }) => {
                    const isBusy = busyField === def.field;
                    return (
                      <div key={def.field} className="grid grid-cols-[120px_1fr] gap-3 py-3">
                        <dt className="text-xs uppercase tracking-wide text-[#141446]/60">{def.label}</dt>
                        <dd className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{formatValue(f.value, def.kind)}</span>
                            {f.source ? (
                              <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase ${SOURCE_BADGE[f.source]}`}>
                                {SOURCE_LABELS[f.source]}
                              </span>
                            ) : null}
                            <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] uppercase text-emerald-800">
                              retenue
                            </span>
                            {isBusy ? <span className="text-xs text-[#141446]/60">…</span> : null}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {f.alternatives.map((alt, i) => (
                              <button
                                key={`${def.field}-${i}`}
                                type="button"
                                disabled={isBusy}
                                onClick={() => persistOverride(def.field, alt.value)}
                                className="flex items-center gap-1 rounded-md border border-[rgba(20,20,70,0.2)] bg-white px-2 py-1 text-xs hover:bg-[#f4ece4] disabled:opacity-60"
                                title="Garder cette valeur"
                              >
                                <span className={`rounded-full border px-1.5 py-0.5 text-[9px] uppercase ${SOURCE_BADGE[alt.source]}`}>
                                  {SOURCE_LABELS[alt.source]}
                                </span>
                                {formatValue(alt.value, def.kind)}
                              </button>
                            ))}
                          </div>
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              ) : null}

              {link.clientProfileId && link.clientProjectId ? (
                <a
                  href={`/admin/clients/${link.clientProfileId}/projects/${link.clientProjectId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block text-xs underline text-[#141446]/70"
                >
                  Ouvrir la fiche bien unifiée →
                </a>
              ) : null}
            </div>
          )}
        </div>

        <footer className="flex justify-end gap-2 border-t border-[rgba(20,20,70,0.1)] px-5 py-3">
          {step === "choose" ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-[#141446]/30 px-3 py-1 text-sm text-[#141446]"
            >
              Annuler
            </button>
          ) : (
            <button
              type="button"
              onClick={onMatched}
              className="rounded-md bg-[#141446] px-4 py-1 text-sm font-medium text-white"
            >
              Terminer
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
