"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AddressAutocompleteInput } from "./address-autocomplete-input";
import { SellerResultChat } from "./seller-result-chat";

type Step = "form" | "verify" | "result";

type FlowForm = {
  fullName: string;
  email: string;
  phone: string;
  propertyType: "appartement" | "maison" | "villa" | "autre";
  propertyAddress: string;
  city: string;
  postalCode: string;
  timeline: string;
  occupancyStatus: string;
  livingArea: string;
  rooms: string;
  floor: string;
  buildingTotalFloors: string;
  elevator: "yes" | "no" | "";
  apartmentCondition:
    | "a_renover"
    | "renove_20_ans"
    | "renove_10_ans"
    | "renove_moins_5_ans"
    | "neuf"
    | "";
  buildingAge: "ancien_1950" | "recent_1950_1970" | "moderne_1980_today" | "";
  seaView: "none" | "panoramic" | "classic" | "lateral" | "";
  diagnosticsReady: "yes" | "no";
  diagnosticsSupportNeeded: "yes" | "no";
  syndicDocsReady: "yes" | "no";
  syndicSupportNeeded: "yes" | "no";
  message: string;
};

type ValuationResult = {
  valuationPriceLow: number | null;
  valuationPriceHigh: number | null;
  valuationPrice: number | null;
  addressLabel: string | null;
  cityName: string | null;
  cityZipCode: string | null;
  rooms: number | null;
  livingSpaceArea: number | null;
};

const initialForm: FlowForm = {
  fullName: "",
  email: "",
  phone: "",
  propertyType: "appartement",
  propertyAddress: "",
  city: "",
  postalCode: "",
  timeline: "immediate",
  occupancyStatus: "owner_occupied",
  livingArea: "",
  rooms: "",
  floor: "",
  buildingTotalFloors: "",
  elevator: "",
  apartmentCondition: "",
  buildingAge: "",
  seaView: "",
  diagnosticsReady: "no",
  diagnosticsSupportNeeded: "yes",
  syndicDocsReady: "no",
  syndicSupportNeeded: "yes",
  message: "",
};

const toOptionalNumber = (value: string) => {
  const normalized = value.replace(/[^\d.]/g, "");
  if (!normalized) return undefined;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const toOptionalInteger = (value: string) => {
  const normalized = value.replace(/[^\d]/g, "");
  if (!normalized) return undefined;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const formatEur = (value: number) => {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
};

export function SellerApiFirstFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState<FlowForm>(initialForm);
  const [otp, setOtp] = useState("");
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const [sellerLeadId, setSellerLeadId] = useState<string | null>(null);
  const [valuation, setValuation] = useState<ValuationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEstimating, setIsEstimating] = useState(false);
  const [estimateProgress, setEstimateProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEstimating) return;

    setEstimateProgress(8);
    const timer = window.setInterval(() => {
      setEstimateProgress((prev) => {
        const next = prev + 4;
        return next >= 92 ? 92 : next;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isEstimating]);

  const update = <K extends keyof FlowForm>(key: K, value: FlowForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const sendOtp = async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/seller/email/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        message?: string;
        previewCode?: string | null;
      };

      if (!response.ok || !data.ok) {
        setError(data.message ?? "Impossible d'envoyer le code email.");
        return;
      }
      setPreviewCode(data.previewCode ?? null);
      setStep("verify");
    } catch {
      setError("Erreur reseau pendant l'envoi du code.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/seller/email/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, code: otp }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        message?: string;
        data?: { verificationToken?: string };
      };
      if (!response.ok || !data.ok || !data.data?.verificationToken) {
        setError(data.message ?? "Code invalide.");
        return;
      }
      setVerificationToken(data.data.verificationToken);
    } catch {
      setError("Erreur reseau pendant la verification du code.");
    } finally {
      setLoading(false);
    }
  };

  const estimateAndCreate = async () => {
    if (!verificationToken) {
      setError("Email non verifie. Merci de valider le code.");
      return;
    }

    setError(null);
    setLoading(true);
    setIsEstimating(true);
    try {
      const payload = {
        ...form,
        livingArea: toOptionalNumber(form.livingArea),
        rooms: toOptionalNumber(form.rooms),
        buildingTotalFloors: toOptionalInteger(form.buildingTotalFloors),
        elevator: form.elevator === "yes",
        apartmentCondition: form.apartmentCondition || undefined,
        buildingAge: form.buildingAge || undefined,
        seaView: form.seaView || undefined,
        diagnosticsReady: form.diagnosticsReady === "yes",
        diagnosticsSupportNeeded:
          form.diagnosticsReady === "no" ? form.diagnosticsSupportNeeded === "yes" : undefined,
        syndicDocsReady: form.syndicDocsReady === "yes",
        syndicSupportNeeded:
          form.syndicDocsReady === "no" ? form.syndicSupportNeeded === "yes" : undefined,
        verificationToken,
      };

      const response = await fetch("/api/seller/estimate-and-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        message?: string;
        sellerLeadId?: string;
        valuation?: ValuationResult;
      };

      if (!response.ok || !data.ok || !data.sellerLeadId || !data.valuation) {
        setError(data.message ?? "Impossible de calculer votre estimation.");
        return;
      }

      setSellerLeadId(data.sellerLeadId);
      setValuation(data.valuation);
      setEstimateProgress(100);
      setStep("result");
    } catch {
      setError("Erreur reseau pendant le calcul d'estimation.");
    } finally {
      setLoading(false);
      setIsEstimating(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="sillage-card rounded-2xl p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Estimation vendeur Sillage Immo</h1>
        <p className="text-sm opacity-75">
          Un parcours clair, guide et securise: vous renseignez votre bien une fois, nous
          verifions votre email, puis nous produisons votre estimation pour cadrer la suite.
        </p>
      </section>

      <section className="sillage-card rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-medium">Etape 1 - Votre projet et votre bien</h2>
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <label>
            Nom complet *
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={form.fullName}
              onChange={(event) => update("fullName", event.target.value)}
            />
          </label>
          <label>
            Email *
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              type="email"
              value={form.email}
              onChange={(event) => update("email", event.target.value)}
            />
          </label>
          <label>
            Telephone *
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={form.phone}
              onChange={(event) => update("phone", event.target.value)}
            />
          </label>
          <label>
            Type de bien
            <select
              className="mt-1 w-full rounded border px-3 py-2"
              value={form.propertyType}
              onChange={(event) =>
                update("propertyType", event.target.value as FlowForm["propertyType"])
              }
            >
              <option value="appartement">Appartement</option>
              <option value="maison">Maison</option>
              <option value="villa">Villa</option>
              <option value="autre">Autre</option>
            </select>
          </label>
          <AddressAutocompleteInput
            value={form.propertyAddress}
            cityValue={form.city}
            postalCodeValue={form.postalCode}
            onAddressChange={(value) => update("propertyAddress", value)}
            onAddressSelected={(data) => {
              update("propertyAddress", data.address);
              if (data.city) update("city", data.city);
              if (data.postalCode) update("postalCode", data.postalCode);
            }}
            disabled={loading}
          />
          <label>
            Ville *
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={form.city}
              onChange={(event) => update("city", event.target.value)}
            />
          </label>
          <label>
            Code postal *
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={form.postalCode}
              onChange={(event) => update("postalCode", event.target.value)}
            />
          </label>
          <label>
            Surface (m2)
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={form.livingArea}
              onChange={(event) => update("livingArea", event.target.value)}
            />
          </label>
          <label>
            Pieces
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={form.rooms}
              onChange={(event) => update("rooms", event.target.value)}
            />
          </label>
          <label>
            Etage
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={form.floor}
              onChange={(event) => update("floor", event.target.value)}
            />
          </label>
          <label>
            Nombre d&apos;etages dans l&apos;immeuble
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={form.buildingTotalFloors}
              onChange={(event) => update("buildingTotalFloors", event.target.value)}
            />
          </label>
          <label>
            Ascenseur *
            <select
              className="mt-1 w-full rounded border px-3 py-2"
              value={form.elevator}
              onChange={(event) => update("elevator", event.target.value as FlowForm["elevator"])}
            >
              <option value="">Selectionner</option>
              <option value="yes">Oui</option>
              <option value="no">Non</option>
            </select>
          </label>
          <label>
            Etat de l&apos;appartement *
            <select
              className="mt-1 w-full rounded border px-3 py-2"
              value={form.apartmentCondition}
              onChange={(event) =>
                update(
                  "apartmentCondition",
                  event.target.value as FlowForm["apartmentCondition"]
                )
              }
            >
              <option value="">Selectionner</option>
              <option value="a_renover">A renover</option>
              <option value="renove_20_ans">Renove il y a 20 ans</option>
              <option value="renove_10_ans">Renove il y a 10 ans</option>
              <option value="renove_moins_5_ans">Renove il y a moins de 5 ans</option>
              <option value="neuf">Neuf</option>
            </select>
          </label>
          <label>
            Age de l&apos;immeuble (optionnel)
            <select
              className="mt-1 w-full rounded border px-3 py-2"
              value={form.buildingAge}
              onChange={(event) =>
                update("buildingAge", event.target.value as FlowForm["buildingAge"])
              }
            >
              <option value="">Non renseigne</option>
              <option value="ancien_1950">Ancien (jusqu&apos;a 1950)</option>
              <option value="recent_1950_1970">Recent (1950-1970)</option>
              <option value="moderne_1980_today">Moderne (1980 - Aujourd&apos;hui)</option>
            </select>
          </label>
          <label>
            Vue mer
            <select
              className="mt-1 w-full rounded border px-3 py-2"
              value={form.seaView}
              onChange={(event) => update("seaView", event.target.value as FlowForm["seaView"])}
            >
              <option value="">Non renseigne</option>
              <option value="none">Non</option>
              <option value="panoramic">Vue mer panoramique</option>
              <option value="classic">Vue mer classique</option>
              <option value="lateral">Vue mer laterale</option>
            </select>
          </label>
          <label>
            Delai de vente
            <select
              className="mt-1 w-full rounded border px-3 py-2"
              value={form.timeline}
              onChange={(event) => update("timeline", event.target.value)}
            >
              <option value="immediate">Immediat</option>
              <option value="3_months">Sous 3 mois</option>
              <option value="6_months">Sous 6 mois</option>
              <option value="future">Projet futur</option>
            </select>
          </label>
          {toOptionalInteger(form.floor) !== undefined &&
          toOptionalInteger(form.buildingTotalFloors) !== undefined ? (
            <p className="sm:col-span-2 text-xs opacity-70">
              Dernier etage:{" "}
              <strong>
                {toOptionalInteger(form.floor) === toOptionalInteger(form.buildingTotalFloors)
                  ? "Oui"
                  : "Non"}
              </strong>
            </p>
          ) : null}
          <label className="sm:col-span-2">
            Message complementaire
            <textarea
              className="mt-1 w-full rounded border px-3 py-2"
              rows={3}
              value={form.message}
              onChange={(event) => update("message", event.target.value)}
            />
          </label>
        </div>

        <button
          className="sillage-btn rounded px-4 py-2 text-sm disabled:opacity-60"
          type="button"
          disabled={
            loading ||
            !form.email ||
            !form.fullName ||
            !form.propertyAddress ||
            !form.elevator ||
            !form.apartmentCondition
          }
          onClick={sendOtp}
        >
          {loading && step === "form"
            ? "Envoi..."
            : "Etape 2 - Securiser mon email"}
        </button>
      </section>

      {step !== "form" ? (
        <section className="sillage-card rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-medium">Etape 2 - Verification de votre email</h2>
          <p className="text-sm opacity-75">
            Entrez le code recu par email pour finaliser la securisation de votre demande.
          </p>
          <div className="flex gap-3 items-end flex-wrap">
            <label className="text-sm">
              Code email
              <input
                className="mt-1 rounded border px-3 py-2"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
              />
            </label>
            <button
              className="sillage-btn rounded px-4 py-2 text-sm disabled:opacity-60"
              type="button"
              disabled={loading || otp.trim().length < 4}
              onClick={verifyOtp}
            >
              {loading && step === "verify" ? "Verification..." : "Valider le code"}
            </button>
          </div>
          {previewCode ? (
            <p className="text-xs text-amber-700">
              Mode dev: code OTP = <code>{previewCode}</code>
            </p>
          ) : null}
          {verificationToken ? (
            <div className="space-y-3">
              <button
                className="sillage-btn rounded px-4 py-2 text-sm disabled:opacity-60"
                type="button"
                disabled={loading}
                onClick={estimateAndCreate}
              >
                {loading ? "Calcul en cours..." : "Etape 3 - Obtenir mon estimation precise"}
              </button>
              {isEstimating ? (
                <div className="space-y-1">
                  <div className="h-2 w-full overflow-hidden rounded bg-zinc-200">
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${estimateProgress}%`,
                        backgroundColor: "var(--sillage-blue)",
                      }}
                    />
                  </div>
                  <p className="text-xs opacity-70">
                    Analyse en cours... {estimateProgress}%
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {step === "result" && valuation && sellerLeadId ? (
        <section className="sillage-card rounded-2xl p-6 space-y-3">
          <h2 className="text-lg font-medium">Votre estimation est prete</h2>
          <p className="text-sm opacity-75">
            {valuation.addressLabel ?? form.propertyAddress}{" "}
            {valuation.cityZipCode ?? form.postalCode} {valuation.cityName ?? form.city}
          </p>
          <p className="text-sm">
            {valuation.valuationPriceLow !== null || valuation.valuationPriceHigh !== null ? (
              <>
                Fourchette estimee:{" "}
                <strong>
                  {valuation.valuationPriceLow !== null
                    ? formatEur(valuation.valuationPriceLow)
                    : "-"}{" "}
                  -{" "}
                  {valuation.valuationPriceHigh !== null
                    ? formatEur(valuation.valuationPriceHigh)
                    : "-"}
                </strong>
              </>
            ) : valuation.valuationPrice !== null ? (
              <>
                Valeur estimee (indicative):{" "}
                <strong>{formatEur(valuation.valuationPrice)}</strong>
              </>
            ) : (
              <>
                Estimation en cours de finalisation. Un conseiller vous partage la
                fourchette precise tres rapidement.
              </>
            )}
          </p>
          <div className="rounded-xl border bg-white p-4 space-y-2">
            <h3 className="text-sm font-semibold">
              Pourquoi confier la vente a Sillage Immo ?
            </h3>
            <ul className="text-sm space-y-2 list-disc pl-5">
              <li>
                Positionnement premium local a Nice et sur la Cote d&apos;Azur pour capter des
                acheteurs qualifies.
              </li>
              <li>
                Strategie de mise en vente sur-mesure (prix, presentation, ciblage, diffusion)
                pour accelerer les visites utiles.
              </li>
              <li>
                Accompagnement complet: diagnostics, documents syndic, cadrage juridique et
                negociation.
              </li>
            </ul>
            <p className="text-xs opacity-70">
              Objectif: vous aider a vendre au bon prix, dans le bon delai, avec un pilotage
              clair a chaque etape.
            </p>
          </div>
          <div className="rounded-xl border p-4 space-y-1">
            <p className="text-sm font-medium">Votre prochain pas (recommande)</p>
            <p className="text-sm opacity-80">
              Finalisez votre demande pour recevoir un appel de cadrage avec un interlocuteur
              unique et un plan de commercialisation sur-mesure.
            </p>
          </div>
          <SellerResultChat sellerLeadId={sellerLeadId} />
          <button
            type="button"
            className="sillage-btn rounded px-4 py-2 text-sm"
            onClick={() => router.push(`/merci-vendeur?leadId=${encodeURIComponent(sellerLeadId)}`)}
          >
            Finaliser et etre rappele par un conseiller
          </button>
        </section>
      ) : null}

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
