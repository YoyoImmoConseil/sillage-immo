"use client";

import type {
  MyNotaryMatchContext,
  MyNotarySellerContact,
} from "@/services/admin/mynotary-match.service";
import type { ReconcileCandidatePreview } from "@/services/reconciliation/reconcile.service";

// Étape 1 du rattachement manuel : recap contrat, suggestions classées,
// recherche libre, création de dossier et repli UUID avancé.
// Composant de présentation : toute la logique API vit dans le parent.

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

const sellerLine = (c: MyNotarySellerContact): string => {
  const name =
    c.fullName?.trim() ||
    `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() ||
    "Vendeur";
  const contact = [c.email, c.phone].filter(Boolean).join(" · ");
  return contact ? `${name} (${contact})` : name;
};

type ManualMatchChooseStepProps = {
  ctx: MyNotaryMatchContext | null;
  loadingCtx: boolean;
  busy: boolean;
  term: string;
  onTermChange: (value: string) => void;
  searching: boolean;
  searchResults: ReconcileCandidatePreview[];
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
  manualSeller: string;
  onManualSellerChange: (value: string) => void;
  manualProperty: string;
  onManualPropertyChange: (value: string) => void;
  onAttach: (sellerProjectId: string | null, propertyId: string | null) => void;
  onCreateFromContract: () => void;
};

export function ManualMatchChooseStep({
  ctx,
  loadingCtx,
  busy,
  term,
  onTermChange,
  searching,
  searchResults,
  showAdvanced,
  onToggleAdvanced,
  manualSeller,
  onManualSellerChange,
  manualProperty,
  onManualPropertyChange,
  onAttach,
  onCreateFromContract,
}: ManualMatchChooseStepProps) {
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
        onClick={() => onAttach(c.sellerProjectId, c.primaryPropertyId)}
        className="shrink-0 rounded-md bg-[#141446] px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
        title={c.sellerProjectId ? "Rattacher à ce dossier" : "Dossier sans projet vendeur matérialisé"}
      >
        Rattacher
      </button>
    </div>
  );

  return (
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
          onChange={(e) => onTermChange(e.target.value)}
          placeholder="Nom, e-mail, téléphone ou adresse…"
          aria-label="Rechercher un dossier"
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
          onClick={onCreateFromContract}
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
          onClick={onToggleAdvanced}
          className="text-xs underline text-[#141446]/60"
        >
          {showAdvanced ? "Masquer" : "Avancé : coller les UUID"}
        </button>
        {showAdvanced ? (
          <div className="mt-2 space-y-2">
            <input
              type="text"
              value={manualSeller}
              onChange={(e) => onManualSellerChange(e.target.value.trim())}
              placeholder="seller_project UUID"
              aria-label="UUID du projet vendeur"
              className="w-full rounded-md border border-[rgba(20,20,70,0.2)] px-3 py-2 font-mono text-xs"
            />
            <input
              type="text"
              value={manualProperty}
              onChange={(e) => onManualPropertyChange(e.target.value.trim())}
              placeholder="property UUID"
              aria-label="UUID du bien"
              className="w-full rounded-md border border-[rgba(20,20,70,0.2)] px-3 py-2 font-mono text-xs"
            />
            <button
              type="button"
              disabled={busy || (!manualSeller && !manualProperty)}
              onClick={() => onAttach(manualSeller || null, manualProperty || null)}
              className="rounded-md bg-[#141446] px-3 py-1 text-xs font-medium text-white disabled:opacity-60"
            >
              Rattacher (manuel)
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
