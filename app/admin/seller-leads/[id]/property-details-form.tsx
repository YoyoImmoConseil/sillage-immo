"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type PropertyDetails = {
  livingArea: number | null;
  rooms: number | null;
  bedrooms: number | null;
  floor: string | null;
  buildingTotalFloors: number | null;
  isTopFloor: boolean | null;
  condition: string | null;
  elevator: boolean | null;
  apartmentCondition: string | null;
  buildingAge: string | null;
  seaView: string | null;
  valuationLow: number | null;
  valuationHigh: number | null;
  notes: string | null;
};

type PropertyDetailsFormProps = {
  sellerLeadId: string;
  initial: PropertyDetails;
};

const toNumericString = (value: number | null) => (value === null ? "" : String(value));

export function PropertyDetailsForm({ sellerLeadId, initial }: PropertyDetailsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [livingArea, setLivingArea] = useState(toNumericString(initial.livingArea));
  const [rooms, setRooms] = useState(toNumericString(initial.rooms));
  const [bedrooms, setBedrooms] = useState(toNumericString(initial.bedrooms));
  const [floor, setFloor] = useState(initial.floor ?? "");
  const [buildingTotalFloors, setBuildingTotalFloors] = useState(
    toNumericString(initial.buildingTotalFloors)
  );
  const [condition, setCondition] = useState(initial.condition ?? "");
  const [elevator, setElevator] = useState(initial.elevator === null ? "" : initial.elevator ? "yes" : "no");
  const [apartmentCondition, setApartmentCondition] = useState(initial.apartmentCondition ?? "");
  const [buildingAge, setBuildingAge] = useState(initial.buildingAge ?? "");
  const [seaView, setSeaView] = useState(initial.seaView ?? "");
  const [valuationLow, setValuationLow] = useState(toNumericString(initial.valuationLow));
  const [valuationHigh, setValuationHigh] = useState(toNumericString(initial.valuationHigh));
  const [notes, setNotes] = useState(initial.notes ?? "");

  const toOptionalNumber = (raw: string) => {
    const digits = raw.replace(/[^\d.]/g, "");
    if (!digits) return undefined;
    const value = Number.parseFloat(digits);
    return Number.isFinite(value) ? value : undefined;
  };

  const save = () => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/admin/seller-leads/${sellerLeadId}/property-details`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              livingArea: toOptionalNumber(livingArea),
              rooms: toOptionalNumber(rooms),
              bedrooms: toOptionalNumber(bedrooms),
              floor: floor || undefined,
              buildingTotalFloors: toOptionalNumber(buildingTotalFloors),
              condition: condition || undefined,
              elevator: elevator ? elevator === "yes" : undefined,
              apartmentCondition: apartmentCondition || undefined,
              buildingAge: buildingAge || undefined,
              seaView: seaView || undefined,
              valuationLow: toOptionalNumber(valuationLow),
              valuationHigh: toOptionalNumber(valuationHigh),
              notes: notes || undefined,
            }),
          }
        );
        const data = (await response.json()) as { ok?: boolean; message?: string };
        if (!response.ok || !data.ok) {
          setError(data.message ?? "Impossible d'enregistrer les details du bien.");
          return;
        }
        setSaved(true);
        router.refresh();
      } catch {
        setError("Erreur reseau pendant l'enregistrement des details du bien.");
      }
    });
  };

  return (
    <section className="rounded-2xl border p-6 space-y-4">
      <h2 className="text-lg font-medium">Details du bien estime</h2>
      <p className="text-sm opacity-70">
        A completer par le commercial si le widget ne remonte pas automatiquement
        toutes les donnees.
      </p>

      <div className="grid gap-3 text-sm sm:grid-cols-4">
        <label>
          Surface (m2)
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={livingArea}
            onChange={(event) => setLivingArea(event.target.value)}
          />
        </label>
        <label>
          Pieces
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={rooms}
            onChange={(event) => setRooms(event.target.value)}
          />
        </label>
        <label>
          Chambres
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={bedrooms}
            onChange={(event) => setBedrooms(event.target.value)}
          />
        </label>
        <label>
          Etage
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={floor}
            onChange={(event) => setFloor(event.target.value)}
          />
        </label>
        <label>
          Nombre d&apos;etages immeuble
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={buildingTotalFloors}
            onChange={(event) => setBuildingTotalFloors(event.target.value)}
          />
        </label>
      </div>
      {initial.isTopFloor !== null ? (
        <p className="text-xs opacity-70">
          Indicateur dernier etage: <strong>{initial.isTopFloor ? "Oui" : "Non"}</strong>
        </p>
      ) : null}

      <div className="grid gap-3 text-sm sm:grid-cols-3">
        <label>
          Etat du bien
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={condition}
            onChange={(event) => setCondition(event.target.value)}
            placeholder="A renover / Bon etat / Excellent"
          />
        </label>
        <label>
          Ascenseur
          <select
            className="mt-1 w-full rounded border px-3 py-2"
            value={elevator}
            onChange={(event) => setElevator(event.target.value)}
          >
            <option value="">Non renseigne</option>
            <option value="yes">Oui</option>
            <option value="no">Non</option>
          </select>
        </label>
        <label>
          Etat appartement
          <select
            className="mt-1 w-full rounded border px-3 py-2"
            value={apartmentCondition}
            onChange={(event) => setApartmentCondition(event.target.value)}
          >
            <option value="">Non renseigne</option>
            <option value="a_renover">A renover</option>
            <option value="renove_20_ans">Renove il y a 20 ans</option>
            <option value="renove_10_ans">Renove il y a 10 ans</option>
            <option value="renove_moins_5_ans">Renove il y a moins de 5 ans</option>
            <option value="neuf">Neuf</option>
          </select>
        </label>
        <label>
          Age immeuble
          <select
            className="mt-1 w-full rounded border px-3 py-2"
            value={buildingAge}
            onChange={(event) => setBuildingAge(event.target.value)}
          >
            <option value="">Non renseigne</option>
            <option value="ancien_1950">Ancien (jusqu'a 1950)</option>
            <option value="recent_1950_1970">Recent (1950-1970)</option>
            <option value="moderne_1980_today">Moderne (1980 - Aujourd'hui)</option>
          </select>
        </label>
        <label>
          Vue mer
          <select
            className="mt-1 w-full rounded border px-3 py-2"
            value={seaView}
            onChange={(event) => setSeaView(event.target.value)}
          >
            <option value="">Non renseigne</option>
            <option value="none">Non</option>
            <option value="panoramic">Vue mer panoramique</option>
            <option value="classic">Vue mer classique</option>
            <option value="lateral">Vue mer laterale</option>
          </select>
        </label>
        <label>
          Estimation basse (EUR)
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={valuationLow}
            onChange={(event) => setValuationLow(event.target.value)}
          />
        </label>
        <label>
          Estimation haute (EUR)
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={valuationHigh}
            onChange={(event) => setValuationHigh(event.target.value)}
          />
        </label>
      </div>

      <label className="text-sm block">
        Notes commerciales sur le bien
        <textarea
          className="mt-1 w-full rounded border px-3 py-2"
          rows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-60"
          onClick={save}
          disabled={isPending}
        >
          {isPending ? "Enregistrement..." : "Enregistrer les details"}
        </button>
        {saved ? <span className="text-sm text-green-700">Enregistre.</span> : null}
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </section>
  );
}
