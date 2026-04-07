"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  propertyType: string;
  propertyAddress: string;
  city: string;
  postalCode: string;
  timeline: string;
  occupancyStatus: string;
  diagnosticsReady: "yes" | "no";
  diagnosticsSupportNeeded: "yes" | "no";
  syndicDocsReady: "yes" | "no";
  syndicSupportNeeded: "yes" | "no";
  message: string;
};

const initialState: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  propertyType: "appartement",
  propertyAddress: "",
  city: "",
  postalCode: "",
  timeline: "list_now",
  occupancyStatus: "owner_occupied",
  diagnosticsReady: "no",
  diagnosticsSupportNeeded: "yes",
  syndicDocsReady: "no",
  syndicSupportNeeded: "yes",
  message: "",
};

export function SellerEstimationForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      fullName: `${form.firstName} ${form.lastName}`.trim(),
      email: form.email,
      phone: form.phone || undefined,
      propertyType: form.propertyType,
      propertyAddress: form.propertyAddress || undefined,
      city: form.city || undefined,
      postalCode: form.postalCode || undefined,
      timeline: form.timeline,
      occupancyStatus: form.occupancyStatus,
      diagnosticsReady: form.diagnosticsReady === "yes",
      diagnosticsSupportNeeded:
        form.diagnosticsReady === "no" ? form.diagnosticsSupportNeeded === "yes" : undefined,
      syndicDocsReady: form.syndicDocsReady === "yes",
      syndicSupportNeeded:
        form.syndicDocsReady === "no" ? form.syndicSupportNeeded === "yes" : undefined,
      message: form.message || undefined,
      source: "website_estimation_mvp",
    };

    try {
      const response = await fetch("/api/seller-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        message?: string;
        data?: {
          thankYouAccessToken?: string;
        };
      };
      if (!response.ok || !data.ok || !data.data?.thankYouAccessToken) {
        setError(data.message ?? "Impossible d'enregistrer votre demande pour le moment.");
        return;
      }

      router.push(`/merci-vendeur?access=${encodeURIComponent(data.data.thankYouAccessToken)}`);
    } catch {
      setError("Une erreur reseau est survenue. Merci de reessayer.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          Prenom *
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            required
            value={form.firstName}
            onChange={(event) => update("firstName", event.target.value)}
          />
        </label>
        <label className="text-sm">
          Nom *
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            required
            value={form.lastName}
            onChange={(event) => update("lastName", event.target.value)}
          />
        </label>
        <label className="text-sm">
          Email *
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            type="email"
            required
            value={form.email}
            onChange={(event) => update("email", event.target.value)}
          />
        </label>
        <label className="text-sm">
          Telephone
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.phone}
            onChange={(event) => update("phone", event.target.value)}
          />
        </label>
        <label className="text-sm">
          Type de bien
          <select
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.propertyType}
            onChange={(event) => update("propertyType", event.target.value)}
          >
            <option value="appartement">Appartement</option>
            <option value="maison">Maison</option>
            <option value="villa">Villa</option>
            <option value="autre">Autre</option>
          </select>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm sm:col-span-2">
          Adresse du bien
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.propertyAddress}
            onChange={(event) => update("propertyAddress", event.target.value)}
          />
        </label>
        <label className="text-sm">
          Code postal
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.postalCode}
            onChange={(event) => update("postalCode", event.target.value)}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm">
          Ville
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.city}
            onChange={(event) => update("city", event.target.value)}
          />
        </label>
        <label className="text-sm">
          Temporalite du projet
          <select
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.timeline}
            onChange={(event) => update("timeline", event.target.value)}
          >
            <option value="already_listed">J&apos;ai deja mis en vente</option>
            <option value="list_now">Je veux mettre en vente maintenant</option>
            <option value="list_within_6_months">Je veux mettre en vente dans les 6 mois</option>
            <option value="self_sell_first">
              Je veux commencer a vendre par moi-meme sans agence
            </option>
            <option value="early_reflection">Je commence juste a reflechir au projet</option>
            <option value="personal_information_only">
              J&apos;ai juste besoin de l&apos;information pour des raisons personnelles
            </option>
          </select>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          Occupation du bien
          <select
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.occupancyStatus}
            onChange={(event) => update("occupancyStatus", event.target.value)}
          >
            <option value="owner_occupied">Proprietaire occupant</option>
            <option value="tenant_occupied">Bien loue</option>
            <option value="vacant">Bien vacant</option>
          </select>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          Diagnostics techniques deja faits ?
          <select
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.diagnosticsReady}
            onChange={(event) => update("diagnosticsReady", event.target.value as "yes" | "no")}
          >
            <option value="yes">Oui</option>
            <option value="no">Non</option>
          </select>
        </label>
        {form.diagnosticsReady === "no" ? (
          <label className="text-sm">
            Souhaitez-vous qu&apos;on s&apos;en occupe ?
            <select
              className="mt-1 w-full rounded border px-3 py-2"
              value={form.diagnosticsSupportNeeded}
              onChange={(event) =>
                update("diagnosticsSupportNeeded", event.target.value as "yes" | "no")
              }
            >
              <option value="yes">Oui</option>
              <option value="no">Non</option>
            </select>
          </label>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          Documents syndic deja compiles ?
          <select
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.syndicDocsReady}
            onChange={(event) => update("syndicDocsReady", event.target.value as "yes" | "no")}
          >
            <option value="yes">Oui</option>
            <option value="no">Non</option>
          </select>
        </label>
        {form.syndicDocsReady === "no" ? (
          <label className="text-sm">
            Souhaitez-vous qu&apos;on vous accompagne ?
            <select
              className="mt-1 w-full rounded border px-3 py-2"
              value={form.syndicSupportNeeded}
              onChange={(event) =>
                update("syndicSupportNeeded", event.target.value as "yes" | "no")
              }
            >
              <option value="yes">Oui</option>
              <option value="no">Non</option>
            </select>
          </label>
        ) : null}
      </div>

      <label className="text-sm block">
        Message complementaire
        <textarea
          className="mt-1 w-full rounded border px-3 py-2"
          rows={4}
          value={form.message}
          onChange={(event) => update("message", event.target.value)}
        />
      </label>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <button
        type="submit"
        disabled={submitting}
        className="sillage-btn rounded px-4 py-2 disabled:opacity-50"
      >
        {submitting ? "Envoi en cours..." : "Demander mon estimation et un rappel"}
      </button>
    </form>
  );
}
