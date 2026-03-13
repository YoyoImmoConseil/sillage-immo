"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PropertyBusinessType } from "@/types/domain/properties";

type BuyerLeadFormProps = {
  buyerLeadId: string;
  initial: {
    fullName: string;
    email: string;
    phone: string;
    status: string;
    timeline: string;
    financingStatus: string;
    preferredContactChannel: string;
    notes: string;
    businessType: PropertyBusinessType;
    locationText: string;
    cities: string;
    propertyTypes: string;
    budgetMin: string;
    budgetMax: string;
    roomsMin: string;
    roomsMax: string;
    bedroomsMin: string;
    livingAreaMin: string;
    livingAreaMax: string;
    floorMin: string;
    floorMax: string;
    requiresTerrace: "" | "true" | "false";
    requiresElevator: "" | "true" | "false";
  };
};

const toOptionalNumber = (value: string) => {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export function BuyerLeadForm({ buyerLeadId, initial }: BuyerLeadFormProps) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isMatchingPending, startMatchingTransition] = useTransition();

  const patch = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const save = () => {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/buyer-leads/${buyerLeadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: form.fullName,
            email: form.email,
            phone: form.phone || undefined,
            status: form.status,
            timeline: form.timeline || undefined,
            financingStatus: form.financingStatus || undefined,
            preferredContactChannel: form.preferredContactChannel || undefined,
            notes: form.notes || undefined,
            businessType: form.businessType,
            locationText: form.locationText || undefined,
            cities: form.cities,
            propertyTypes: form.propertyTypes,
            budgetMin: toOptionalNumber(form.budgetMin),
            budgetMax: toOptionalNumber(form.budgetMax),
            roomsMin: toOptionalNumber(form.roomsMin),
            roomsMax: toOptionalNumber(form.roomsMax),
            bedroomsMin: toOptionalNumber(form.bedroomsMin),
            livingAreaMin: toOptionalNumber(form.livingAreaMin),
            livingAreaMax: toOptionalNumber(form.livingAreaMax),
            floorMin: toOptionalNumber(form.floorMin),
            floorMax: toOptionalNumber(form.floorMax),
            requiresTerrace:
              form.requiresTerrace === "" ? null : form.requiresTerrace === "true",
            requiresElevator:
              form.requiresElevator === "" ? null : form.requiresElevator === "true",
          }),
        });
        const payload = (await response.json()) as { ok?: boolean; message?: string };
        if (!response.ok || !payload.ok) {
          setError(payload.message ?? "Enregistrement impossible.");
          return;
        }
        setMessage("Criteres enregistres.");
        router.refresh();
      } catch {
        setError("Enregistrement impossible.");
      }
    });
  };

  const recomputeMatching = () => {
    setMessage(null);
    setError(null);
    startMatchingTransition(async () => {
      try {
        const response = await fetch(`/api/admin/buyer-leads/${buyerLeadId}/match`, {
          method: "POST",
        });
        const payload = (await response.json()) as { ok?: boolean; message?: string; count?: number };
        if (!response.ok || !payload.ok) {
          setError(payload.message ?? "Matching impossible.");
          return;
        }
        setMessage(`${payload.count ?? 0} rapprochement(s) recalcules.`);
        router.refresh();
      } catch {
        setError("Matching impossible.");
      }
    });
  };

  return (
    <section className="space-y-4 rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6">
      <h2 className="text-xl font-semibold text-[#141446]">Fiche acquereur</h2>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-sm">
          Nom
          <input className="mt-1 w-full rounded border px-3 py-2" value={form.fullName} onChange={(event) => patch("fullName", event.target.value)} />
        </label>
        <label className="text-sm">
          Email
          <input className="mt-1 w-full rounded border px-3 py-2" value={form.email} onChange={(event) => patch("email", event.target.value)} />
        </label>
        <label className="text-sm">
          Telephone
          <input className="mt-1 w-full rounded border px-3 py-2" value={form.phone} onChange={(event) => patch("phone", event.target.value)} />
        </label>
        <label className="text-sm">
          Statut
          <select className="mt-1 w-full rounded border px-3 py-2" value={form.status} onChange={(event) => patch("status", event.target.value)}>
            <option value="new">new</option>
            <option value="qualified">qualified</option>
            <option value="active_search">active_search</option>
            <option value="visit">visit</option>
            <option value="won">won</option>
            <option value="lost">lost</option>
          </select>
        </label>
        <label className="text-sm">
          Delai
          <input className="mt-1 w-full rounded border px-3 py-2" value={form.timeline} onChange={(event) => patch("timeline", event.target.value)} />
        </label>
        <label className="text-sm">
          Financement
          <input className="mt-1 w-full rounded border px-3 py-2" value={form.financingStatus} onChange={(event) => patch("financingStatus", event.target.value)} />
        </label>
        <label className="text-sm">
          Canal prefere
          <input className="mt-1 w-full rounded border px-3 py-2" value={form.preferredContactChannel} onChange={(event) => patch("preferredContactChannel", event.target.value)} />
        </label>
        <label className="text-sm">
          Recherche
          <select className="mt-1 w-full rounded border px-3 py-2" value={form.businessType} onChange={(event) => patch("businessType", event.target.value)}>
            <option value="sale">Achat</option>
            <option value="rental">Location</option>
          </select>
        </label>
        <label className="text-sm">
          Zones libres
          <input className="mt-1 w-full rounded border px-3 py-2" value={form.locationText} onChange={(event) => patch("locationText", event.target.value)} />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-sm">
          Villes ciblees
          <input className="mt-1 w-full rounded border px-3 py-2" value={form.cities} onChange={(event) => patch("cities", event.target.value)} placeholder="Nice, Villefranche-sur-Mer" />
        </label>
        <label className="text-sm">
          Types de biens
          <input className="mt-1 w-full rounded border px-3 py-2" value={form.propertyTypes} onChange={(event) => patch("propertyTypes", event.target.value)} placeholder="Appartement, Maison" />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <label className="text-sm">Budget min<input className="mt-1 w-full rounded border px-3 py-2" value={form.budgetMin} onChange={(event) => patch("budgetMin", event.target.value)} /></label>
        <label className="text-sm">Budget max<input className="mt-1 w-full rounded border px-3 py-2" value={form.budgetMax} onChange={(event) => patch("budgetMax", event.target.value)} /></label>
        <label className="text-sm">Pieces min<input className="mt-1 w-full rounded border px-3 py-2" value={form.roomsMin} onChange={(event) => patch("roomsMin", event.target.value)} /></label>
        <label className="text-sm">Pieces max<input className="mt-1 w-full rounded border px-3 py-2" value={form.roomsMax} onChange={(event) => patch("roomsMax", event.target.value)} /></label>
        <label className="text-sm">Chambres min<input className="mt-1 w-full rounded border px-3 py-2" value={form.bedroomsMin} onChange={(event) => patch("bedroomsMin", event.target.value)} /></label>
        <label className="text-sm">Surface min<input className="mt-1 w-full rounded border px-3 py-2" value={form.livingAreaMin} onChange={(event) => patch("livingAreaMin", event.target.value)} /></label>
        <label className="text-sm">Surface max<input className="mt-1 w-full rounded border px-3 py-2" value={form.livingAreaMax} onChange={(event) => patch("livingAreaMax", event.target.value)} /></label>
        <label className="text-sm">Etage min<input className="mt-1 w-full rounded border px-3 py-2" value={form.floorMin} onChange={(event) => patch("floorMin", event.target.value)} /></label>
        <label className="text-sm">Etage max<input className="mt-1 w-full rounded border px-3 py-2" value={form.floorMax} onChange={(event) => patch("floorMax", event.target.value)} /></label>
        <label className="text-sm">
          Terrasse
          <select className="mt-1 w-full rounded border px-3 py-2" value={form.requiresTerrace} onChange={(event) => patch("requiresTerrace", event.target.value)}>
            <option value="">Indifferent</option>
            <option value="true">Oui</option>
            <option value="false">Non</option>
          </select>
        </label>
        <label className="text-sm">
          Ascenseur
          <select className="mt-1 w-full rounded border px-3 py-2" value={form.requiresElevator} onChange={(event) => patch("requiresElevator", event.target.value)}>
            <option value="">Indifferent</option>
            <option value="true">Oui</option>
            <option value="false">Non</option>
          </select>
        </label>
      </div>

      <label className="block text-sm">
        Notes
        <textarea className="mt-1 w-full rounded border px-3 py-2" rows={4} value={form.notes} onChange={(event) => patch("notes", event.target.value)} />
      </label>

      <div className="flex flex-wrap gap-3">
        <button type="button" className="sillage-btn rounded px-4 py-2 text-sm disabled:opacity-60" onClick={save} disabled={isPending || isMatchingPending}>
          {isPending ? "Enregistrement..." : "Enregistrer la fiche"}
        </button>
        <button type="button" className="rounded border px-4 py-2 text-sm disabled:opacity-60" onClick={recomputeMatching} disabled={isPending || isMatchingPending}>
          {isMatchingPending ? "Recalcul..." : "Recalculer les rapprochements"}
        </button>
      </div>

      {message ? <p className="text-sm text-green-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </section>
  );
}
