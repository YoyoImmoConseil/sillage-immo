"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "@/app/components/modal";
import type { SignedDocumentRow } from "@/services/admin/mynotary-list.service";
import type { MyNotaryMatchContext } from "@/services/admin/mynotary-match.service";
import type { ReconcileCandidatePreview } from "@/services/reconciliation/reconcile.service";
import type {
  GoldenOverrideField,
  PropertyGoldenRecord,
} from "@/services/properties/golden-record.service";
import { ManualMatchChooseStep } from "./manual-match-choose-step";
import { ManualMatchDivergeStep } from "./manual-match-diverge-step";

// ─────────────────────────────────────────────────────────────────────
// Smart rattachement modal (2 steps):
//   1. Choisir le dossier — suggestions classées (moteur réconciliation) +
//      recherche libre + "créer un dossier depuis ce contrat" + repli UUID.
//   2. Résoudre les divergences — champs du golden record qui divergent,
//      arbitrage 1 clic + lien vers la fiche bien unifiée.
// Shell : state + appels API ; le JSX des étapes vit dans
// manual-match-choose-step.tsx et manual-match-diverge-step.tsx.
// ─────────────────────────────────────────────────────────────────────

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

  return (
    <Modal
      onClose={onClose}
      size="md"
      title={step === "choose" ? "Rattacher le contrat" : "Vérifier les divergences"}
      description={
        <>
          Contrat MyNotary <code>{document.mynotary_contract_id}</code> · {document.contract_kind}
        </>
      }
      footer={
        step === "choose" ? (
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
        )
      }
    >
      {error ? (
        <div className="mb-3 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-900">
          {error}
        </div>
      ) : null}

      {step === "choose" ? (
        <ManualMatchChooseStep
          ctx={ctx}
          loadingCtx={loadingCtx}
          busy={busy}
          term={term}
          onTermChange={setTerm}
          searching={searching}
          searchResults={searchResults}
          showAdvanced={showAdvanced}
          onToggleAdvanced={() => setShowAdvanced((v) => !v)}
          manualSeller={manualSeller}
          onManualSellerChange={setManualSeller}
          manualProperty={manualProperty}
          onManualPropertyChange={setManualProperty}
          onAttach={attach}
          onCreateFromContract={createFromContract}
        />
      ) : (
        <ManualMatchDivergeStep
          golden={golden}
          busyField={busyField}
          link={link}
          onPersistOverride={persistOverride}
        />
      )}
    </Modal>
  );
}
