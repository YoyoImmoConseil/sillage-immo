"use client";

import { useRouter } from "next/navigation";
import { AddressAutocompleteInput } from "./address-autocomplete-input";
import { SellerResultChat } from "./seller-result-chat";
import {
  formatEur,
  toOptionalInteger,
  type FlowForm,
  type UpdateFlowForm,
  type ValuationResult,
} from "./seller-api-first-flow.shared";

type SellerProjectFormSectionProps = {
  form: FlowForm;
  loading: boolean;
  onUpdate: UpdateFlowForm;
  onSendOtp: () => void;
};

export function SellerProjectFormSection({
  form,
  loading,
  onUpdate,
  onSendOtp,
}: SellerProjectFormSectionProps) {
  const topFloorKnown =
    toOptionalInteger(form.floor) !== undefined &&
    toOptionalInteger(form.buildingTotalFloors) !== undefined;

  return (
    <section className="rounded-2xl border border-[rgba(20,20,70,0.2)] bg-[#f4ece4] p-6 space-y-4">
      <h2 className="sillage-section-title">Étape 1 - Votre projet et votre bien</h2>
      <p className="text-sm opacity-75">
        Quelques informations simples pour cadrer votre estimation et vous proposer un accompagnement
        vraiment adapté à votre situation.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 text-sm">
        <p className="sm:col-span-2 text-xs uppercase tracking-wide opacity-70">
          Vos coordonnées
        </p>
        <label>
          Prénom *
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.firstName}
            onChange={(event) => onUpdate("firstName", event.target.value)}
            placeholder="Ex: Marie"
          />
        </label>
        <label>
          Nom *
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.lastName}
            onChange={(event) => onUpdate("lastName", event.target.value)}
            placeholder="Ex: Dupont"
          />
        </label>
        <label>
          Email *
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            type="email"
            value={form.email}
            onChange={(event) => onUpdate("email", event.target.value)}
            placeholder="Ex: marie.dupont@email.com"
          />
        </label>
        <label>
          Téléphone
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.phone}
            onChange={(event) => onUpdate("phone", event.target.value)}
            placeholder="Ex: 06 12 34 56 78"
          />
        </label>

        <p className="sm:col-span-2 text-xs uppercase tracking-wide opacity-70">Votre projet</p>
        <label className="sm:col-span-2">
          Où en est votre projet de vente ?
          <select
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.timeline}
            onChange={(event) => onUpdate("timeline", event.target.value as FlowForm["timeline"])}
          >
            <option value="already_listed">J&apos;ai déjà mis en vente</option>
            <option value="list_now">Je veux mettre en vente maintenant</option>
            <option value="list_within_6_months">Je veux mettre en vente dans les 6 mois</option>
            <option value="self_sell_first">
              Je veux commencer a vendre par moi-meme sans agence
            </option>
            <option value="early_reflection">Je commence juste à réfléchir au projet</option>
            <option value="personal_information_only">
              J&apos;ai juste besoin de l&apos;information pour des raisons personnelles
            </option>
          </select>
        </label>

        <p className="sm:col-span-2 text-xs uppercase tracking-wide opacity-70">
          Adresse et type de bien
        </p>
        <label>
          Type de bien
          <select
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.propertyType}
            onChange={(event) => onUpdate("propertyType", event.target.value as FlowForm["propertyType"])}
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
          onAddressChange={(value) => onUpdate("propertyAddress", value)}
          onAddressSelected={(data) => {
            onUpdate("propertyAddress", data.address);
            if (data.city) onUpdate("city", data.city);
            if (data.postalCode) onUpdate("postalCode", data.postalCode);
          }}
          disabled={loading}
        />
        <label>
          Ville *
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.city}
            onChange={(event) => onUpdate("city", event.target.value)}
            placeholder="Ex: Nice"
          />
        </label>
        <label>
          Code postal *
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.postalCode}
            onChange={(event) => onUpdate("postalCode", event.target.value)}
            placeholder="Ex: 06000"
          />
        </label>

        <p className="sm:col-span-2 text-xs uppercase tracking-wide opacity-70">
          Caractéristiques du bien
        </p>
        <label>
          Surface (m²)
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.livingArea}
            onChange={(event) => onUpdate("livingArea", event.target.value)}
            placeholder="Ex: 78"
          />
        </label>
        <label>
          Pièces
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.rooms}
            onChange={(event) => onUpdate("rooms", event.target.value)}
            placeholder="Ex: 3"
          />
        </label>
        <label>
          Étage
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.floor}
            onChange={(event) => onUpdate("floor", event.target.value)}
            placeholder="Ex: 4"
          />
        </label>
        <label>
          Nombre d&apos;étages dans l&apos;immeuble
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.buildingTotalFloors}
            onChange={(event) => onUpdate("buildingTotalFloors", event.target.value)}
            placeholder="Ex: 6"
          />
        </label>
        <label>
          Terrasse *
          <select
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.terrace}
            onChange={(event) => onUpdate("terrace", event.target.value as FlowForm["terrace"])}
          >
            <option value="">Sélectionner</option>
            <option value="yes">Oui</option>
            <option value="no">Non</option>
          </select>
        </label>
        {form.terrace === "yes" ? (
          <label>
            Taille de la terrasse (m²)
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={form.terraceArea}
              onChange={(event) => onUpdate("terraceArea", event.target.value)}
              placeholder="Ex: 12"
            />
          </label>
        ) : null}
        <label>
          Balcon *
          <select
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.balcony}
            onChange={(event) => onUpdate("balcony", event.target.value as FlowForm["balcony"])}
          >
            <option value="">Sélectionner</option>
            <option value="yes">Oui</option>
            <option value="no">Non</option>
          </select>
        </label>
        {form.balcony === "yes" ? (
          <label>
            Taille du balcon (m²)
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={form.balconyArea}
              onChange={(event) => onUpdate("balconyArea", event.target.value)}
              placeholder="Ex: 6"
            />
          </label>
        ) : null}
        <label>
          Exposition du séjour
          <select
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.livingExposure}
            onChange={(event) =>
              onUpdate("livingExposure", event.target.value as FlowForm["livingExposure"])
            }
          >
            <option value="">Sélectionner</option>
            <option value="north">Nord</option>
            <option value="north_east">Nord Est</option>
            <option value="east">Est</option>
            <option value="south_east">Sud Est</option>
            <option value="south">Sud</option>
            <option value="south_west">Sud Ouest</option>
            <option value="west">Ouest</option>
            <option value="north_west">Nord Ouest</option>
          </select>
        </label>
        <label>
          Ascenseur *
          <select
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.elevator}
            onChange={(event) => onUpdate("elevator", event.target.value as FlowForm["elevator"])}
          >
            <option value="">Sélectionner</option>
            <option value="yes">Oui</option>
            <option value="no">Non</option>
          </select>
        </label>
        <label>
          État de l&apos;appartement *
          <select
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.apartmentCondition}
            onChange={(event) =>
              onUpdate("apartmentCondition", event.target.value as FlowForm["apartmentCondition"])
            }
          >
            <option value="">Sélectionner</option>
            <option value="a_renover">À rénover</option>
            <option value="renove_20_ans">Rénové il y a 20 ans</option>
            <option value="renove_10_ans">Rénové il y a 10 ans</option>
            <option value="renove_moins_5_ans">Rénové il y a moins de 5 ans</option>
            <option value="neuf">Neuf</option>
          </select>
        </label>
        <label>
          Âge de l&apos;immeuble (optionnel)
          <select
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.buildingAge}
            onChange={(event) => onUpdate("buildingAge", event.target.value as FlowForm["buildingAge"])}
          >
            <option value="">Non renseigné</option>
            <option value="ancien_1950">Ancien (jusqu&apos;à 1950)</option>
            <option value="recent_1950_1970">Récent (1950-1970)</option>
            <option value="moderne_1980_today">Moderne (1980 - Aujourd&apos;hui)</option>
          </select>
        </label>
        <label>
          Vue mer
          <select
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.seaView}
            onChange={(event) => onUpdate("seaView", event.target.value as FlowForm["seaView"])}
          >
            <option value="">Non renseigné</option>
            <option value="none">Non</option>
            <option value="panoramic">Vue mer panoramique</option>
            <option value="classic">Vue mer classique</option>
            <option value="lateral">Vue mer latérale</option>
          </select>
        </label>
        {topFloorKnown ? (
          <p className="sm:col-span-2 text-xs opacity-70">
            Dernier étage :{" "}
            <strong>
              {toOptionalInteger(form.floor) === toOptionalInteger(form.buildingTotalFloors) ? "Oui" : "Non"}
            </strong>
          </p>
        ) : null}
        <label className="sm:col-span-2">
          Informations utiles (optionnel)
          <textarea
            className="mt-1 w-full rounded border px-3 py-2"
            rows={3}
            value={form.message}
            onChange={(event) => onUpdate("message", event.target.value)}
            placeholder="Ex : travaux récents, contraintes de calendrier, contexte particulier..."
          />
        </label>
      </div>

      <button
        className="sillage-btn rounded px-4 py-2 text-sm disabled:opacity-60"
        type="button"
        disabled={
          loading ||
          !form.email ||
          !form.firstName ||
          !form.lastName ||
          !form.propertyAddress ||
          !form.terrace ||
          !form.balcony ||
          !form.elevator ||
          !form.apartmentCondition
        }
        onClick={onSendOtp}
      >
        {loading ? "Envoi..." : "Étape 2 - Sécuriser mon email"}
      </button>
    </section>
  );
}

type SellerEmailVerificationSectionProps = {
  otp: string;
  loading: boolean;
  previewCode: string | null;
  verificationToken: string | null;
  isEstimating: boolean;
  estimateProgress: number;
  onOtpChange: (value: string) => void;
  onVerifyOtp: () => void;
  onEstimateAndCreate: () => void;
};

export function SellerEmailVerificationSection({
  otp,
  loading,
  previewCode,
  verificationToken,
  isEstimating,
  estimateProgress,
  onOtpChange,
  onVerifyOtp,
  onEstimateAndCreate,
}: SellerEmailVerificationSectionProps) {
  return (
    <section className="rounded-2xl bg-[#141446] p-6 text-[#f4ece4] space-y-4">
      <h2 className="sillage-section-title">Étape 2 - Vérification de votre email</h2>
      <p className="text-sm text-[#f4ece4]/80">
        Entrez le code reçu par email pour finaliser la sécurisation de votre demande.
      </p>
      <div className="flex gap-3 items-end flex-wrap">
        <label className="text-sm">
          Code email
          <input
            className="mt-1 rounded border px-3 py-2"
            value={otp}
            onChange={(event) => onOtpChange(event.target.value)}
          />
        </label>
        <button
          className="rounded bg-[#f4ece4] px-4 py-2 text-sm text-[#141446] disabled:opacity-60"
          type="button"
          disabled={loading || otp.trim().length < 4}
          onClick={onVerifyOtp}
        >
          {loading ? "Vérification..." : "Valider le code"}
        </button>
      </div>
      {previewCode ? (
        <p className="text-xs text-amber-700">
          Mode dev : code OTP = <code>{previewCode}</code>
        </p>
      ) : null}
      {verificationToken ? (
        <div className="space-y-3">
          <button
            className="rounded bg-[#f4ece4] px-4 py-2 text-sm text-[#141446] disabled:opacity-60"
            type="button"
            disabled={loading}
            onClick={onEstimateAndCreate}
          >
            {loading ? "Calcul en cours..." : "Étape 3 - Obtenir mon estimation précise"}
          </button>
          {isEstimating ? (
            <div className="space-y-1">
              <div className="h-2 w-full overflow-hidden rounded bg-[rgba(244,236,228,0.4)]">
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${estimateProgress}%`,
                    backgroundColor: "var(--sillage-blue)",
                  }}
                />
              </div>
              <p className="text-xs opacity-70">Analyse en cours... {estimateProgress}%</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

type SellerEstimationResultSectionProps = {
  valuation: ValuationResult;
  form: FlowForm;
  thankYouAccessToken: string;
  portalAccessEmail: string | null;
  portalAccessStatus: "idle" | "sending" | "sent" | "error";
  portalAccessMessage: string | null;
  onResendPortalAccess?: () => void;
};

export function SellerEstimationResultSection({
  valuation,
  form,
  thankYouAccessToken,
  portalAccessEmail,
  portalAccessStatus,
  portalAccessMessage,
  onResendPortalAccess,
}: SellerEstimationResultSectionProps) {
  const router = useRouter();

  return (
    <section className="rounded-2xl border border-[rgba(20,20,70,0.2)] bg-[#f4ece4] p-6 space-y-3">
      <h2 className="sillage-section-title">Votre estimation est prête</h2>
      <p className="text-sm opacity-75">
        {valuation.addressLabel ?? form.propertyAddress} {valuation.cityZipCode ?? form.postalCode}{" "}
        {valuation.cityName ?? form.city}
      </p>
      <p className="text-sm">
        {valuation.valuationPriceLow !== null || valuation.valuationPriceHigh !== null ? (
          <>
            Fourchette estimée :{" "}
            <strong>
              {valuation.valuationPriceLow !== null ? formatEur(valuation.valuationPriceLow) : "-"} -{" "}
              {valuation.valuationPriceHigh !== null ? formatEur(valuation.valuationPriceHigh) : "-"}
            </strong>
          </>
        ) : valuation.valuationPrice !== null ? (
          <>
            Valeur estimée (indicative) : <strong>{formatEur(valuation.valuationPrice)}</strong>
          </>
        ) : (
          <>
            Estimation en cours de finalisation. Un conseiller vous partage la fourchette précise très
            rapidement.
          </>
        )}
      </p>
      <div className="rounded-xl border border-[rgba(20,20,70,0.22)] bg-[rgba(244,236,228,0.9)] p-4 space-y-2">
        <h3 className="text-sm font-semibold">Pourquoi confier la vente à Sillage Immo ?</h3>
        <ul className="text-sm space-y-2 list-disc pl-5">
          <li>
            Positionnement premium local à Nice et sur la Côte d&apos;Azur pour capter des acheteurs
            qualifiés.
          </li>
          <li>
            Stratégie de mise en vente sur mesure (prix, présentation, ciblage, diffusion) pour
            accélérer les visites utiles.
          </li>
          <li>
            Accompagnement complet : diagnostics, documents syndic, cadrage juridique et négociation.
          </li>
        </ul>
        <p className="text-xs opacity-70">
          Objectif : vous aider à vendre au bon prix, dans le bon délai, avec un pilotage clair à
          chaque étape.
        </p>
      </div>
      <div className="rounded-xl border border-[rgba(20,20,70,0.22)] p-4 space-y-1">
        <p className="text-sm font-medium">Votre prochain pas (recommandé)</p>
        <p className="text-sm opacity-80">
          Finalisez votre demande pour recevoir un appel de cadrage avec un interlocuteur unique et un
          plan de commercialisation sur-mesure.
        </p>
      </div>
      {portalAccessStatus !== "idle" || portalAccessMessage ? (
        <div className="rounded-xl border border-[rgba(20,20,70,0.22)] bg-[rgba(244,236,228,0.9)] p-4 space-y-2">
          <p className="text-sm font-medium">Accès à votre espace client</p>
          {portalAccessMessage ? <p className="text-sm opacity-80">{portalAccessMessage}</p> : null}
          {portalAccessStatus === "sent" && portalAccessEmail ? (
            <p className="text-xs opacity-70">
              Ouvrez le lien reçu par email pour activer ou retrouver votre espace client vendeur.
            </p>
          ) : null}
          {portalAccessStatus === "sending" ? (
            <p className="text-xs opacity-70">Envoi du lien en cours...</p>
          ) : null}
          {portalAccessStatus === "error" && onResendPortalAccess ? (
            <button
              type="button"
              className="rounded border border-[#141446]/20 px-4 py-2 text-sm text-[#141446]"
              onClick={onResendPortalAccess}
            >
              Renvoyer mon lien d&apos;accès
            </button>
          ) : null}
        </div>
      ) : null}
      <SellerResultChat accessToken={thankYouAccessToken} />
      <button
        type="button"
        className="sillage-btn rounded px-4 py-2 text-sm"
        onClick={() =>
          router.push(`/merci-vendeur?access=${encodeURIComponent(thankYouAccessToken)}`)
        }
      >
        Finaliser et être rappelé par un conseiller
      </button>
    </section>
  );
}
