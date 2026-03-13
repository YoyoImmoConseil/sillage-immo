"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PropertyBusinessType } from "@/types/domain/properties";

type PropertyFormProps = {
  mode: "create" | "edit";
  propertyId?: string;
  initial: {
    title: string;
    description: string;
    propertyType: string;
    city: string;
    postalCode: string;
    businessType: PropertyBusinessType;
    priceAmount: string;
    livingArea: string;
    rooms: string;
    bedrooms: string;
    floor: string;
    hasTerrace: "" | "true" | "false";
    hasElevator: "" | "true" | "false";
    coverImageUrl: string;
    isPublished: boolean;
  };
  source: string;
};

const toOptionalNumber = (value: string) => {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export function PropertyForm({ mode, propertyId, initial, source }: PropertyFormProps) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isMatchingPending, startMatchingTransition] = useTransition();

  const patch = (key: keyof typeof form, value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const save = () => {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        const url = mode === "create" ? "/api/admin/properties" : `/api/admin/properties/${propertyId}`;
        const method = mode === "create" ? "POST" : "PATCH";
        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title,
            description: form.description || undefined,
            propertyType: form.propertyType || undefined,
            city: form.city || undefined,
            postalCode: form.postalCode || undefined,
            businessType: form.businessType,
            priceAmount: toOptionalNumber(form.priceAmount),
            livingArea: toOptionalNumber(form.livingArea),
            rooms: toOptionalNumber(form.rooms),
            bedrooms: toOptionalNumber(form.bedrooms),
            floor: toOptionalNumber(form.floor),
            hasTerrace: form.hasTerrace === "" ? null : form.hasTerrace === "true",
            hasElevator: form.hasElevator === "" ? null : form.hasElevator === "true",
            coverImageUrl: form.coverImageUrl || undefined,
            isPublished: form.isPublished,
          }),
        });
        const payload = (await response.json()) as {
          ok?: boolean;
          message?: string;
          propertyId?: string;
        };
        if (!response.ok || !payload.ok) {
          setError(payload.message ?? "Enregistrement impossible.");
          return;
        }

        const nextPropertyId = mode === "create" ? payload.propertyId : propertyId;
        if (mode === "create" && nextPropertyId) {
          router.push(`/admin/properties/${nextPropertyId}`);
          router.refresh();
          return;
        }

        setMessage("Bien enregistre.");
        router.refresh();
      } catch {
        setError("Enregistrement impossible.");
      }
    });
  };

  const recomputeMatching = () => {
    if (!propertyId) return;
    setError(null);
    setMessage(null);
    startMatchingTransition(async () => {
      try {
        const response = await fetch(`/api/admin/properties/${propertyId}/match`, { method: "POST" });
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

  const isReadOnly = mode === "edit" && source !== "manual";

  return (
    <section className="space-y-4 rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[#141446]">
            {mode === "create" ? "Nouveau bien manuel" : "Edition du bien"}
          </h2>
          <p className="text-sm text-[#141446]/70">
            Source: {source}. {isReadOnly ? "Le contenu SweepBright reste en lecture seule." : "Edition locale autorisee."}
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-sm">
          Titre
          <input className="mt-1 w-full rounded border px-3 py-2" value={form.title} onChange={(event) => patch("title", event.target.value)} disabled={isReadOnly} />
        </label>
        <label className="text-sm">
          Type de bien
          <input className="mt-1 w-full rounded border px-3 py-2" value={form.propertyType} onChange={(event) => patch("propertyType", event.target.value)} disabled={isReadOnly} />
        </label>
        <label className="text-sm">
          Vente / Location
          <select className="mt-1 w-full rounded border px-3 py-2" value={form.businessType} onChange={(event) => patch("businessType", event.target.value)} disabled={isReadOnly}>
            <option value="sale">Vente</option>
            <option value="rental">Location</option>
          </select>
        </label>
        <label className="text-sm">
          Ville
          <input className="mt-1 w-full rounded border px-3 py-2" value={form.city} onChange={(event) => patch("city", event.target.value)} disabled={isReadOnly} />
        </label>
        <label className="text-sm">
          Code postal
          <input className="mt-1 w-full rounded border px-3 py-2" value={form.postalCode} onChange={(event) => patch("postalCode", event.target.value)} disabled={isReadOnly} />
        </label>
        <label className="text-sm">
          Prix
          <input className="mt-1 w-full rounded border px-3 py-2" value={form.priceAmount} onChange={(event) => patch("priceAmount", event.target.value)} disabled={isReadOnly} />
        </label>
        <label className="text-sm">
          Surface
          <input className="mt-1 w-full rounded border px-3 py-2" value={form.livingArea} onChange={(event) => patch("livingArea", event.target.value)} disabled={isReadOnly} />
        </label>
        <label className="text-sm">
          Pieces
          <input className="mt-1 w-full rounded border px-3 py-2" value={form.rooms} onChange={(event) => patch("rooms", event.target.value)} disabled={isReadOnly} />
        </label>
        <label className="text-sm">
          Chambres
          <input className="mt-1 w-full rounded border px-3 py-2" value={form.bedrooms} onChange={(event) => patch("bedrooms", event.target.value)} disabled={isReadOnly} />
        </label>
        <label className="text-sm">
          Etage
          <input className="mt-1 w-full rounded border px-3 py-2" value={form.floor} onChange={(event) => patch("floor", event.target.value)} disabled={isReadOnly} />
        </label>
        <label className="text-sm">
          Terrasse
          <select className="mt-1 w-full rounded border px-3 py-2" value={form.hasTerrace} onChange={(event) => patch("hasTerrace", event.target.value)} disabled={isReadOnly}>
            <option value="">Indifferent</option>
            <option value="true">Oui</option>
            <option value="false">Non</option>
          </select>
        </label>
        <label className="text-sm">
          Ascenseur
          <select className="mt-1 w-full rounded border px-3 py-2" value={form.hasElevator} onChange={(event) => patch("hasElevator", event.target.value)} disabled={isReadOnly}>
            <option value="">Indifferent</option>
            <option value="true">Oui</option>
            <option value="false">Non</option>
          </select>
        </label>
        <label className="text-sm">
          Image de couverture
          <input className="mt-1 w-full rounded border px-3 py-2" value={form.coverImageUrl} onChange={(event) => patch("coverImageUrl", event.target.value)} disabled={isReadOnly} />
        </label>
      </div>

      <label className="block text-sm">
        Description
        <textarea className="mt-1 w-full rounded border px-3 py-2" rows={5} value={form.description} onChange={(event) => patch("description", event.target.value)} disabled={isReadOnly} />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.isPublished} onChange={(event) => patch("isPublished", event.target.checked)} disabled={isReadOnly} />
        Publier le bien
      </label>

      <div className="flex flex-wrap gap-3">
        {!isReadOnly ? (
          <button type="button" className="sillage-btn rounded px-4 py-2 text-sm disabled:opacity-60" onClick={save} disabled={isPending || isMatchingPending}>
            {isPending ? "Enregistrement..." : "Enregistrer"}
          </button>
        ) : null}
        {propertyId ? (
          <button type="button" className="rounded border px-4 py-2 text-sm disabled:opacity-60" onClick={recomputeMatching} disabled={isPending || isMatchingPending}>
            {isMatchingPending ? "Recalcul..." : "Recalculer les rapprochements"}
          </button>
        ) : null}
      </div>

      {message ? <p className="text-sm text-green-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </section>
  );
}
